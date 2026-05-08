import asyncio
import json
import time
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from slowapi.extension import _rate_limit_exceeded_handler
from sqlmodel import Session, select
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from astra_api.config import settings
from astra_api.db import get_session, init_db
from astra_api.auth import (
    ADMIN_USERNAME,
    admin_login_password,
    create_access_token,
    get_current_user,
    hash_password,
    is_admin_user,
    verify_password,
)
from astra_api.models import (
    AgentRole,
    DiscussionSession,
    Project,
    ScenarioTemplate,
    SessionEvent,
    SessionResult,
    SessionStatus,
    Task,
    TaskPriority,
    TaskStatus,
    User,
    utc_now,
)
from astra_api.orchestrator import run_session_workflow
from astra_api.metrics import compute_session_metrics
from astra_api.llm_gateway import LLMGateway
from astra_api.model_registry import list_available_profiles
from astra_api.schemas import (
    AgentRoleCreate,
    AgentRoleRead,
    ModelProfile,
    ModelTestRequest,
    ModelTestResult,
    PaginatedResponse,
    ProjectCreate,
    ProjectRead,
    PromoteRequest,
    PromoteResponse,
    ScenarioTemplateCreate,
    ScenarioTemplateRead,
    SessionCreate,
    SessionMetrics,
    SessionRead,
    SessionResultRead,
    TaskCreate,
    TaskRead,
    TaskUpdate,
    TokenResponse,
    UserCreate,
    UserRead,
)
from astra_api.seed import seed_defaults


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],
    headers_enabled=True,
    storage_uri="memory://",
)


def _parse_cors_origins(raw_origins: str) -> list[str]:
    """Parse comma-separated CORS origins; empty config keeps local compatibility."""

    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["*"]


class SecurityHeadersMiddleware:
    """Add baseline browser security headers without changing API payloads."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        is_https = _is_https_scope(scope)

        async def send_with_security_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.setdefault("X-Content-Type-Options", "nosniff")
                headers.setdefault("X-Frame-Options", "DENY")
                if is_https:
                    headers.setdefault(
                        "Strict-Transport-Security",
                        "max-age=31536000; includeSubDomains",
                    )
            await send(message)

        await self.app(scope, receive, send_with_security_headers)


def _is_https_scope(scope: Scope) -> bool:
    """Honor proxy TLS termination via X-Forwarded-Proto before falling back to ASGI scheme."""

    headers = dict(scope.get("headers") or [])
    forwarded_proto = headers.get(b"x-forwarded-proto", b"").decode("latin-1").split(",")[0].strip()
    return forwarded_proto == "https" or scope.get("scheme") == "https"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    with next(get_session()) as session:
        seed_defaults(session)
    yield


app = FastAPI(title="Astra API", version="0.1.0", lifespan=lifespan)

app.add_middleware(SecurityHeadersMiddleware)

cors_origins = _parse_cors_origins(settings.cors_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.rate_limit_enabled:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)


api_router = APIRouter(dependencies=[Depends(get_current_user)])


@app.get("/health")
@limiter.exempt
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register", response_model=UserRead)
def register_user(payload: UserCreate, session: Session = Depends(get_session)) -> User:
    existing = session.exec(select(User).where(User.username == payload.username)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Username already exists")
    user = User(username=payload.username, hashed_password=hash_password(payload.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@app.post("/auth/login", response_model=TokenResponse)
def login_user(payload: UserCreate, session: Session = Depends(get_session)) -> dict:
    user = session.exec(select(User).where(User.username == payload.username)).first()
    if user is not None and user.username == ADMIN_USERNAME and not admin_login_password():
        # 默认 admin 仅作为 API Key fallback 和历史数据归属使用，避免公开登录端点绕过 API Key。
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    user.last_login_at = utc_now()
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"access_token": create_access_token(user), "token_type": "bearer"}


def require_admin_user(current_user: User) -> None:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin privileges required")


def _display_base_url(base_url: str | None) -> str | None:
    """Expose only provider scheme and host; credentials stay server-side."""

    if not base_url:
        return None
    parsed = urlparse(base_url)
    if not parsed.netloc:
        return base_url
    return f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme else parsed.netloc


@api_router.get("/models/profiles", response_model=list[ModelProfile])
def list_model_profiles() -> list[dict[str, str | None]]:
    profiles = list_available_profiles()
    return [
        {
            "name": profile.name,
            "model": profile.model,
            "base_url": _display_base_url(profile.base_url),
        }
        for profile in profiles.values()
    ]


@api_router.post("/models/test", response_model=ModelTestResult)
async def test_model_profile(payload: ModelTestRequest) -> dict[str, object]:
    profiles = list_available_profiles()
    profile = profiles.get(payload.profile_name)
    if profile is None:
        raise HTTPException(status_code=404, detail="Model profile not found")
    if not profile.base_url or not profile.api_key:
        return {
            "profile_name": payload.profile_name,
            "status": "error",
            "error": "Model profile is missing base_url or api_key",
        }

    started = time.perf_counter()
    try:
        url = LLMGateway()._chat_completions_url(profile.base_url)
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            response = await client.post(
                url,
                json={
                    "model": profile.model,
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
                headers={"Authorization": f"Bearer {profile.api_key}"},
            )
            response.raise_for_status()
    except Exception as exc:
        return {
            "profile_name": payload.profile_name,
            "status": "error",
            "latency_ms": int((time.perf_counter() - started) * 1000),
            "error": str(exc),
        }
    return {
        "profile_name": payload.profile_name,
        "status": "ok",
        "latency_ms": int((time.perf_counter() - started) * 1000),
    }


@api_router.get("/projects", response_model=PaginatedResponse[ProjectRead])
def list_projects(
    offset: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    statement = select(Project).where(Project.user_id == current_user.id)
    total = session.exec(statement).all()
    items = session.exec(
        statement.order_by(Project.updated_at.desc()).offset(offset).limit(limit)
    ).all()
    return {"items": items, "total": len(total), "offset": offset, "limit": limit}


@api_router.post("/projects", response_model=ProjectRead)
def create_project(
    payload: ProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Project:
    project = Project(**payload.model_dump(), user_id=current_user.id)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@api_router.put("/projects/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: str,
    payload: ProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Project:
    project = session.get(Project, project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in payload.model_dump().items():
        setattr(project, key, value)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@api_router.delete("/projects/{project_id}")
def delete_project(
    project_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    project = session.get(Project, project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    session.delete(project)
    session.commit()
    return {"status": "deleted", "id": project_id}


@api_router.get("/agent-roles", response_model=PaginatedResponse[AgentRoleRead])
def list_agent_roles(
    offset: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
) -> dict:
    total = session.exec(select(AgentRole)).all()
    items = session.exec(
        select(AgentRole).order_by(AgentRole.created_at).offset(offset).limit(limit)
    ).all()
    return {"items": items, "total": len(total), "offset": offset, "limit": limit}


@api_router.post("/agent-roles", response_model=AgentRoleRead)
def create_agent_role(
    payload: AgentRoleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AgentRole:
    require_admin_user(current_user)
    role = AgentRole(**payload.model_dump())
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@api_router.put("/agent-roles/{role_id}", response_model=AgentRoleRead)
def update_agent_role(
    role_id: str,
    payload: AgentRoleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AgentRole:
    require_admin_user(current_user)
    role = session.get(AgentRole, role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="AgentRole not found")
    for key, value in payload.model_dump().items():
        setattr(role, key, value)
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@api_router.delete("/agent-roles/{role_id}")
def delete_agent_role(
    role_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    require_admin_user(current_user)
    role = session.get(AgentRole, role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="AgentRole not found")
    session.delete(role)
    session.commit()
    return {"status": "deleted", "id": role_id}


@api_router.get("/scenario-templates", response_model=PaginatedResponse[ScenarioTemplateRead])
def list_scenario_templates(
    offset: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
) -> dict:
    total = session.exec(select(ScenarioTemplate)).all()
    items = session.exec(
        select(ScenarioTemplate).order_by(ScenarioTemplate.created_at).offset(offset).limit(limit)
    ).all()
    return {"items": items, "total": len(total), "offset": offset, "limit": limit}


@api_router.post("/scenario-templates", response_model=ScenarioTemplateRead)
def create_scenario_template(
    payload: ScenarioTemplateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ScenarioTemplate:
    require_admin_user(current_user)
    scenario = ScenarioTemplate(**payload.model_dump())
    session.add(scenario)
    session.commit()
    session.refresh(scenario)
    return scenario


@api_router.put("/scenario-templates/{scenario_id}", response_model=ScenarioTemplateRead)
def update_scenario_template(
    scenario_id: str,
    payload: ScenarioTemplateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ScenarioTemplate:
    require_admin_user(current_user)
    tmpl = session.get(ScenarioTemplate, scenario_id)
    if tmpl is None:
        raise HTTPException(status_code=404, detail="ScenarioTemplate not found")
    for key, value in payload.model_dump().items():
        setattr(tmpl, key, value)
    session.add(tmpl)
    session.commit()
    session.refresh(tmpl)
    return tmpl


@api_router.delete("/scenario-templates/{scenario_id}")
def delete_scenario_template(
    scenario_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    require_admin_user(current_user)
    tmpl = session.get(ScenarioTemplate, scenario_id)
    if tmpl is None:
        raise HTTPException(status_code=404, detail="ScenarioTemplate not found")
    session.delete(tmpl)
    session.commit()
    return {"status": "deleted", "id": scenario_id}


@api_router.post("/sessions", response_model=SessionRead)
@limiter.limit("10/minute")
def create_discussion_session(
    request: Request,
    response: Response,
    payload: SessionCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DiscussionSession:
    # slowapi needs Request and Response for decorated handlers; business logic does not use them.
    _ = request
    _ = response
    project = session.get(Project, payload.project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    scenario = session.get(ScenarioTemplate, payload.scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario template not found")
    role_ids = payload.role_ids
    if not role_ids:
        roles = session.exec(select(AgentRole).where(AgentRole.code.in_(scenario.default_role_codes))).all()
        role_ids = [role.id for role in roles]
    discussion = DiscussionSession(**payload.model_dump(exclude={"role_ids"}), role_ids=role_ids, user_id=current_user.id)
    session.add(discussion)
    session.commit()
    session.refresh(discussion)
    background_tasks.add_task(run_session_workflow, discussion.id)
    return discussion


@api_router.get("/sessions", response_model=PaginatedResponse[SessionRead])
def list_discussion_sessions(
    offset: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    statement = select(DiscussionSession).where(DiscussionSession.user_id == current_user.id)
    total = session.exec(statement).all()
    items = session.exec(
        statement.order_by(DiscussionSession.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return {"items": items, "total": len(total), "offset": offset, "limit": limit}


@api_router.get("/sessions/{session_id}", response_model=SessionRead)
def get_discussion_session(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    discussion = session.get(DiscussionSession, session_id)
    if discussion is None or discussion.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    result = {
        "id": discussion.id,
        "user_id": discussion.user_id,
        "project_id": discussion.project_id,
        "scenario_id": discussion.scenario_id,
        "topic": discussion.topic,
        "role_ids": discussion.role_ids,
        "supplemental_notes": discussion.supplemental_notes,
        "model_overrides": discussion.model_overrides,
        "status": discussion.status,
        "current_stage": discussion.current_stage,
        "error_message": discussion.error_message,
        "created_at": discussion.created_at,
        "updated_at": discussion.updated_at,
        "completed_at": discussion.completed_at,
    }
    if discussion.status == "completed":
        try:
            result["metrics"] = compute_session_metrics(session_id, session)
        except Exception:
            result["metrics"] = None
    else:
        result["metrics"] = None
    return result


@api_router.delete("/sessions/{session_id}")
def delete_discussion_session(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    discussion = session.get(DiscussionSession, session_id)
    if discussion is None or discussion.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    # 级联删除关联事件
    for event in session.exec(select(SessionEvent).where(SessionEvent.session_id == session_id)).all():
        session.delete(event)
    # 级联删除关联结果
    result = session.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()
    if result is not None:
        session.delete(result)
    session.delete(discussion)
    session.commit()
    return {"status": "deleted", "id": session_id}


@api_router.get("/sessions/{session_id}/result", response_model=SessionResultRead)
def get_discussion_result(
    session_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> SessionResult:
    discussion = session.get(DiscussionSession, session_id)
    if discussion is None or discussion.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    result = session.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()
    if result is None:
        raise HTTPException(status_code=404, detail="Session result not found")
    return result


@api_router.get("/tasks", response_model=PaginatedResponse[TaskRead])
def list_tasks(
    offset: int = 0,
    limit: int = 50,
    project_id: str | None = None,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    statement = select(Task).where(Task.user_id == current_user.id)
    if project_id:
        statement = statement.where(Task.project_id == project_id)
    if status:
        statement = statement.where(Task.status == status)
    if priority:
        statement = statement.where(Task.priority == priority)

    total = session.exec(statement).all()
    items = session.exec(statement.order_by(Task.updated_at.desc()).offset(offset).limit(limit)).all()
    return {"items": items, "total": len(total), "offset": offset, "limit": limit}


@api_router.get("/tasks/{task_id}", response_model=TaskRead)
def get_task(
    task_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Task:
    task = session.get(Task, task_id)
    if task is None or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@api_router.post("/tasks", response_model=TaskRead)
def create_task(
    payload: TaskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Task:
    project = session.get(Project, payload.project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    task = Task(**payload.model_dump(), user_id=current_user.id)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@api_router.put("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Task:
    task = session.get(Task, task_id)
    if task is None or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    updates = payload.model_dump(exclude_unset=True)
    if "project_id" in updates and updates["project_id"]:
        project = session.get(Project, updates["project_id"])
        if project is None or project.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Project not found")
    for key, value in updates.items():
        setattr(task, key, value)
    now = utc_now()
    task.updated_at = now
    if "status" in updates:
        # completed_at records the first transition into done and is cleared when reopened.
        task.completed_at = now if updates["status"] == TaskStatus.DONE else None
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@api_router.delete("/tasks/{task_id}")
def delete_task(
    task_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    task = session.get(Task, task_id)
    if task is None or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    session.delete(task)
    session.commit()
    return {"status": "deleted", "id": task_id}


def _action_text(action: dict[str, object], key: str, fallback = "") -> str:
    value = action.get(key)
    if isinstance(value, str):
        return value
    if value is None:
        return fallback
    return str(value)


def _priority_from_action(action: dict[str, object]) -> TaskPriority:
    raw_priority = _action_text(action, "priority", TaskPriority.MEDIUM).lower()
    aliases = {
        "p0": TaskPriority.CRITICAL,
        "critical": TaskPriority.CRITICAL,
        "high": TaskPriority.HIGH,
        "medium": TaskPriority.MEDIUM,
        "low": TaskPriority.LOW,
        "高": TaskPriority.HIGH,
        "中": TaskPriority.MEDIUM,
        "低": TaskPriority.LOW,
    }
    return aliases.get(raw_priority, TaskPriority.MEDIUM)


def _task_from_action(project_id: str, session_id: str, user_id: str, action: dict[str, object]) -> Task:
    title = _action_text(action, "title", "未命名行动项").strip() or "未命名行动项"
    description = _action_text(action, "description", _action_text(action, "detail"))
    owner = _action_text(action, "owner", _action_text(action, "assignee_role_code")) or None
    return Task(
        project_id=project_id,
        source_session_id=session_id,
        user_id=user_id,
        title=title,
        description=description,
        priority=_priority_from_action(action),
        assignee_role_code=owner,
        tags=["promoted-action"],
    )


@api_router.post("/sessions/{session_id}/promote-actions", response_model=PromoteResponse)
def promote_actions(
    session_id: str,
    payload: PromoteRequest | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    discussion = session.get(DiscussionSession, session_id)
    if discussion is None or discussion.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if discussion.status != SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Session is not completed")
    result = session.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()
    if result is None:
        raise HTTPException(status_code=404, detail="Session result not found")

    actions = result.actions
    requested_indices = payload.action_indices if payload and payload.action_indices is not None else None
    indices = requested_indices if requested_indices is not None else list(range(len(actions)))
    tasks: list[Task] = []
    skipped_actions: list[dict[str, object]] = []

    for index in indices:
        if index < 0 or index >= len(actions):
            skipped_actions.append({"index": index, "reason": "index_out_of_range"})
            continue
        action = actions[index]
        title = _action_text(action, "title", "未命名行动项").strip() or "未命名行动项"
        existing = session.exec(
            select(Task)
            .where(Task.user_id == current_user.id)
            .where(Task.source_session_id == session_id)
            .where(Task.title == title)
        ).first()
        if existing is not None:
            skipped_actions.append({"index": index, "title": title, "reason": "already_promoted"})
            continue
        task = _task_from_action(discussion.project_id, session_id, current_user.id, action)
        session.add(task)
        tasks.append(task)

    session.commit()
    for task in tasks:
        session.refresh(task)
    return {
        "created": len(tasks),
        "skipped": len(skipped_actions),
        "tasks": tasks,
        "skipped_actions": skipped_actions,
    }


def _format_sse(event: SessionEvent) -> str:
    payload = {
        "id": event.id,
        "session_id": event.session_id,
        "sequence": event.sequence,
        "type": event.type,
        "stage": event.stage,
        "role_code": event.role_code,
        "payload": event.payload,
        "created_at": event.created_at.isoformat(),
    }
    return f"id: {event.sequence}\nevent: {event.type}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def _event_stream(session_id: str, user_id: str) -> AsyncGenerator[str, None]:
    last_sequence = 0
    while True:
        with next(get_session()) as db:
            discussion = db.get(DiscussionSession, session_id)
            if discussion is None or discussion.user_id != user_id:
                yield "event: session_failed\ndata: {\"error\":\"Session not found\"}\n\n"
                return
            events = db.exec(
                select(SessionEvent)
                .where(SessionEvent.session_id == session_id)
                .where(SessionEvent.sequence > last_sequence)
                .order_by(SessionEvent.sequence)
            ).all()
            for event in events:
                last_sequence = event.sequence
                yield _format_sse(event)
            if discussion.status in {"completed", "failed"} and not events:
                return
        await asyncio.sleep(settings.event_poll_interval_seconds)


@api_router.get("/sessions/{session_id}/events")
async def stream_session_events(
    session_id: str,
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    return StreamingResponse(_event_stream(session_id, current_user.id), media_type="text/event-stream")


app.include_router(api_router)

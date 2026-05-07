import asyncio
import json
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from astra_api.config import settings
from astra_api.db import get_session, init_db
from astra_api.models import AgentRole, DiscussionSession, Project, ScenarioTemplate, SessionEvent, SessionResult
from astra_api.orchestrator import run_session_workflow
from astra_api.metrics import compute_session_metrics
from astra_api.schemas import (
    AgentRoleCreate,
    AgentRoleRead,
    PaginatedResponse,
    ProjectCreate,
    ProjectRead,
    ScenarioTemplateCreate,
    ScenarioTemplateRead,
    SessionCreate,
    SessionMetrics,
    SessionRead,
    SessionResultRead,
)
from astra_api.seed import seed_defaults


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    with next(get_session()) as session:
        seed_defaults(session)
    yield


app = FastAPI(title="Astra API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/projects", response_model=PaginatedResponse[ProjectRead])
def list_projects(
    offset: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
) -> dict:
    total = session.exec(select(Project)).all()
    items = session.exec(
        select(Project).order_by(Project.updated_at.desc()).offset(offset).limit(limit)
    ).all()
    return {"items": items, "total": len(total), "offset": offset, "limit": limit}


@app.post("/projects", response_model=ProjectRead)
def create_project(payload: ProjectCreate, session: Session = Depends(get_session)) -> Project:
    project = Project(**payload.model_dump())
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@app.put("/projects/{project_id}", response_model=ProjectRead)
def update_project(project_id: str, payload: ProjectCreate, session: Session = Depends(get_session)) -> Project:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in payload.model_dump().items():
        setattr(project, key, value)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@app.delete("/projects/{project_id}")
def delete_project(project_id: str, session: Session = Depends(get_session)) -> dict:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    session.delete(project)
    session.commit()
    return {"status": "deleted", "id": project_id}


@app.get("/agent-roles", response_model=PaginatedResponse[AgentRoleRead])
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


@app.post("/agent-roles", response_model=AgentRoleRead)
def create_agent_role(payload: AgentRoleCreate, session: Session = Depends(get_session)) -> AgentRole:
    role = AgentRole(**payload.model_dump())
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@app.put("/agent-roles/{role_id}", response_model=AgentRoleRead)
def update_agent_role(role_id: str, payload: AgentRoleCreate, session: Session = Depends(get_session)) -> AgentRole:
    role = session.get(AgentRole, role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="AgentRole not found")
    for key, value in payload.model_dump().items():
        setattr(role, key, value)
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@app.delete("/agent-roles/{role_id}")
def delete_agent_role(role_id: str, session: Session = Depends(get_session)) -> dict:
    role = session.get(AgentRole, role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="AgentRole not found")
    session.delete(role)
    session.commit()
    return {"status": "deleted", "id": role_id}


@app.get("/scenario-templates", response_model=PaginatedResponse[ScenarioTemplateRead])
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


@app.post("/scenario-templates", response_model=ScenarioTemplateRead)
def create_scenario_template(payload: ScenarioTemplateCreate, session: Session = Depends(get_session)) -> ScenarioTemplate:
    scenario = ScenarioTemplate(**payload.model_dump())
    session.add(scenario)
    session.commit()
    session.refresh(scenario)
    return scenario


@app.put("/scenario-templates/{scenario_id}", response_model=ScenarioTemplateRead)
def update_scenario_template(scenario_id: str, payload: ScenarioTemplateCreate, session: Session = Depends(get_session)) -> ScenarioTemplate:
    tmpl = session.get(ScenarioTemplate, scenario_id)
    if tmpl is None:
        raise HTTPException(status_code=404, detail="ScenarioTemplate not found")
    for key, value in payload.model_dump().items():
        setattr(tmpl, key, value)
    session.add(tmpl)
    session.commit()
    session.refresh(tmpl)
    return tmpl


@app.delete("/scenario-templates/{scenario_id}")
def delete_scenario_template(scenario_id: str, session: Session = Depends(get_session)) -> dict:
    tmpl = session.get(ScenarioTemplate, scenario_id)
    if tmpl is None:
        raise HTTPException(status_code=404, detail="ScenarioTemplate not found")
    session.delete(tmpl)
    session.commit()
    return {"status": "deleted", "id": scenario_id}


@app.post("/sessions", response_model=SessionRead)
def create_discussion_session(
    payload: SessionCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> DiscussionSession:
    if session.get(Project, payload.project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    scenario = session.get(ScenarioTemplate, payload.scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario template not found")
    role_ids = payload.role_ids
    if not role_ids:
        roles = session.exec(select(AgentRole).where(AgentRole.code.in_(scenario.default_role_codes))).all()
        role_ids = [role.id for role in roles]
    discussion = DiscussionSession(**payload.model_dump(exclude={"role_ids"}), role_ids=role_ids)
    session.add(discussion)
    session.commit()
    session.refresh(discussion)
    background_tasks.add_task(run_session_workflow, discussion.id)
    return discussion


@app.get("/sessions", response_model=PaginatedResponse[SessionRead])
def list_discussion_sessions(
    offset: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
) -> dict:
    total = session.exec(select(DiscussionSession)).all()
    items = session.exec(
        select(DiscussionSession).order_by(DiscussionSession.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return {"items": items, "total": len(total), "offset": offset, "limit": limit}


@app.get("/sessions/{session_id}", response_model=SessionRead)
def get_discussion_session(session_id: str, session: Session = Depends(get_session)) -> dict:
    discussion = session.get(DiscussionSession, session_id)
    if discussion is None:
        raise HTTPException(status_code=404, detail="Session not found")
    result = {
        "id": discussion.id,
        "project_id": discussion.project_id,
        "scenario_id": discussion.scenario_id,
        "topic": discussion.topic,
        "role_ids": discussion.role_ids,
        "supplemental_notes": discussion.supplemental_notes,
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


@app.delete("/sessions/{session_id}")
def delete_discussion_session(session_id: str, session: Session = Depends(get_session)) -> dict:
    discussion = session.get(DiscussionSession, session_id)
    if discussion is None:
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


@app.get("/sessions/{session_id}/result", response_model=SessionResultRead)
def get_discussion_result(session_id: str, session: Session = Depends(get_session)) -> SessionResult:
    result = session.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()
    if result is None:
        raise HTTPException(status_code=404, detail="Session result not found")
    return result


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


async def _event_stream(session_id: str) -> AsyncGenerator[str, None]:
    last_sequence = 0
    while True:
        with next(get_session()) as db:
            discussion = db.get(DiscussionSession, session_id)
            if discussion is None:
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


@app.get("/sessions/{session_id}/events")
async def stream_session_events(session_id: str) -> StreamingResponse:
    return StreamingResponse(_event_stream(session_id), media_type="text/event-stream")

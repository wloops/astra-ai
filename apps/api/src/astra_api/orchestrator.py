import asyncio
import time
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any

from sqlmodel import Session, select

from astra_api.config import settings
from astra_api.db import engine
from astra_api.knowledge import create_entry, search_entries
from astra_api.llm_gateway import LLMGateway
from astra_api.models import (
    AgentRole,
    DiscussionSession,
    EventType,
    HumanReviewRequest,
    HumanReviewStatus,
    HumanReviewTimeoutBehavior,
    Project,
    ScenarioTemplate,
    SessionEvent,
    SessionResult,
    SessionStatus,
    new_id,
    utc_now,
)


gateway = LLMGateway()
_active_workflows: set[str] = set()


def is_session_workflow_active(session_id: str) -> bool:
    """Expose in-process runner state so REST handlers can distinguish stale paused sessions."""

    return session_id in _active_workflows


@dataclass
class SessionState:
    session_id: str
    project: Project
    scenario: ScenarioTemplate
    roles: list[AgentRole]
    topic: str
    model_overrides: dict[str, str]
    completed_stages: list[str] = field(default_factory=list)
    current_stage: str | None = None
    role_outputs: list[dict[str, Any]] = field(default_factory=list)
    conflicts: list[dict[str, Any]] = field(default_factory=list)
    risks: list[dict[str, Any]] = field(default_factory=list)
    open_questions: list[Any] = field(default_factory=list)
    actions: list[dict[str, Any]] = field(default_factory=list)
    final_conclusion: str = ""
    skipped_stages: list[dict[str, Any]] = field(default_factory=list)
    added_stages: list[dict[str, Any]] = field(default_factory=list)
    failures: list[dict[str, Any]] = field(default_factory=list)
    knowledge_references: list[dict[str, Any]] = field(default_factory=list)
    knowledge_search_attempted: bool = False
    iteration: int = 0
    last_progress_iteration: int = 0
    host_decision_history: list[dict[str, Any]] = field(default_factory=list)
    human_review_responses: list[dict[str, Any]] = field(default_factory=list)
    human_review_requests: list[dict[str, Any]] = field(default_factory=list)
    started_monotonic: float = field(default_factory=time.monotonic)

    @property
    def active_role_codes(self) -> list[str]:
        return [role.code for role in self.roles]


def _next_sequence(db: Session, session_id: str) -> int:
    events = db.exec(select(SessionEvent).where(SessionEvent.session_id == session_id)).all()
    return len(events) + 1


def record_event(
    db: Session,
    *,
    session_id: str,
    event_type: EventType,
    stage: str | None = None,
    role_code: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    event = SessionEvent(
        session_id=session_id,
        sequence=_next_sequence(db, session_id),
        type=event_type,
        stage=stage,
        role_code=role_code,
        payload=payload or {},
    )
    db.add(event)
    db.commit()


def update_session(db: Session, session_id: str, **values: Any) -> DiscussionSession:
    discussion = db.get(DiscussionSession, session_id)
    if discussion is None:
        raise ValueError(f"Session not found: {session_id}")
    for key, value in values.items():
        setattr(discussion, key, value)
    discussion.updated_at = utc_now()
    db.add(discussion)
    db.commit()
    db.refresh(discussion)
    return discussion


async def _stage_pause() -> None:
    await asyncio.sleep(0.1)


def _stream_chunks(content: str, chunk_size: int = 48) -> list[str]:
    """Split completed single-Agent output into readable SSE chunks for UI streaming."""

    if not content:
        return []
    return [content[index:index + chunk_size] for index in range(0, len(content), chunk_size)]


def _record_streamed_agent_message(
    db: Session,
    *,
    session_id: str,
    stage: str,
    role_code: str,
    payload: dict[str, Any],
) -> None:
    """Emit delta/done events before the legacy full message so old clients stay compatible."""

    content = str(payload.get("summary") or payload.get("message") or payload.get("final_conclusion") or "")
    message_id = new_id("msg")
    payload["message_id"] = message_id
    model_used = payload.get("model_used")
    for chunk in _stream_chunks(content):
        record_event(
            db,
            session_id=session_id,
            event_type=EventType.AGENT_MESSAGE_DELTA,
            stage=stage,
            role_code=role_code,
            payload={
                "message_id": message_id,
                "delta": chunk,
                "role_code": role_code,
                "stage": stage,
                "model_used": model_used,
            },
        )
    record_event(
        db,
        session_id=session_id,
        event_type=EventType.AGENT_MESSAGE_DONE,
        stage=stage,
        role_code=role_code,
        payload={
            "message_id": message_id,
            "content": content,
            "role_code": role_code,
            "stage": stage,
            "model_used": model_used,
        },
    )


def _suggested_stages(scenario: ScenarioTemplate) -> list[str]:
    stages = list(scenario.stages or [])
    if not stages:
        stages = [
            "init_session",
            "load_context",
            "clarify_topic",
            "independent_review",
            "detect_conflict",
            "debate",
            "judge_and_summarize",
            "generate_actions",
            "finalize_minutes",
        ]
    return stages


def _mark_progress(state: SessionState) -> None:
    state.last_progress_iteration = state.iteration


def _append_stage_once(state: SessionState, stage: str) -> None:
    if stage not in state.completed_stages:
        state.completed_stages.append(stage)


def _risk_items(role_outputs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    risks: list[dict[str, Any]] = []
    for item in role_outputs:
        for risk in item.get("risks", []):
            risks.append(risk if isinstance(risk, dict) else {"name": str(risk), "level": "medium"})
    return risks


def _unique_questions(*question_groups: list[str]) -> list[str]:
    seen: set[str] = set()
    questions: list[str] = []
    for group in question_groups:
        for question in group:
            if question not in seen:
                seen.add(question)
                questions.append(question)
    return questions


def _question_key(question: Any) -> str:
    if isinstance(question, dict):
        value = question.get("question") or question.get("title") or question.get("summary") or str(question)
        return str(value).strip()
    return str(question).strip()


def _unique_question_items(*question_groups: list[Any]) -> list[Any]:
    seen: set[str] = set()
    questions: list[Any] = []
    for group in question_groups:
        for question in group:
            key = _question_key(question)
            if not key or key in seen:
                continue
            seen.add(key)
            questions.append(question)
    return questions


def _host_context(state: SessionState) -> dict[str, Any]:
    return {
        "topic": state.topic,
        "project": {
            "name": state.project.name,
            "goal": state.project.goal,
            "risks": state.project.risks,
            "constraints": state.project.constraints,
        },
        "suggested_stages": _suggested_stages(state.scenario),
        "host_hints": state.scenario.host_hints,
        "parallel_groups": state.scenario.parallel_groups,
        "default_role_codes": state.scenario.default_role_codes,
        "completed_stages": state.completed_stages,
        "skipped_stages": state.skipped_stages,
        "added_stages": state.added_stages,
        "active_role_codes": state.active_role_codes,
        "role_outputs": state.role_outputs,
        "conflicts": state.conflicts,
        "risks": state.risks,
        "open_questions": state.open_questions,
        "actions": state.actions,
        "failures": state.failures,
        "human_review_responses": state.human_review_responses,
        "human_review_requests": state.human_review_requests,
        "knowledge_references": state.knowledge_references,
        "knowledge_search_enabled": True,
        "knowledge_search_attempted": state.knowledge_search_attempted,
        "model_overrides": state.model_overrides,
        "iteration": state.iteration,
    }


async def load_initial_state(session_id: str) -> SessionState:
    with Session(engine, expire_on_commit=False) as db:
        discussion = db.get(DiscussionSession, session_id)
        if discussion is None:
            raise ValueError("Session not found")
        project = db.get(Project, discussion.project_id)
        scenario = db.get(ScenarioTemplate, discussion.scenario_id)
        if project is None or scenario is None:
            raise ValueError("Project or scenario not found")
        roles = db.exec(select(AgentRole).where(AgentRole.id.in_(discussion.role_ids))).all()
        if not roles:
            roles = db.exec(select(AgentRole).where(AgentRole.code == "host")).all()
        if not any(role.code == "host" for role in roles):
            host = db.exec(select(AgentRole).where(AgentRole.code == "host")).first()
            if host is not None:
                roles = [host, *roles]
        return SessionState(
            session_id=session_id,
            project=project,
            scenario=scenario,
            roles=roles,
            topic=discussion.topic,
            model_overrides=discussion.model_overrides or {},
        )


async def start_session(state: SessionState) -> None:
    with Session(engine, expire_on_commit=False) as db:
        update_session(db, state.session_id, status=SessionStatus.RUNNING, current_stage="init_session")
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.SESSION_STARTED,
            stage="init_session",
            payload={"message": "Host Agent orchestration started", "model_used": None},
        )
        update_session(db, state.session_id, current_stage="load_context")
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.STAGE_COMPLETED,
            stage="load_context",
            payload={
                "project": state.project.name,
                "roles": [role.name for role in state.roles],
                "model_used": None,
            },
        )
    state.completed_stages.extend(["init_session", "load_context"])
    await _stage_pause()


def _role_summary(role: AgentRole) -> dict[str, Any]:
    return {
        "id": role.id,
        "code": role.code,
        "name": role.name,
        "description": role.description,
        "responsibilities": role.responsibilities,
        "focus_areas": role.focus_areas,
    }


def _initial_role_context(state: SessionState, available_roles: list[AgentRole]) -> dict[str, Any]:
    return {
        "topic": state.topic,
        "project": {
            "name": state.project.name,
            "goal": state.project.goal,
            "background": state.project.background,
            "risks": state.project.risks,
            "constraints": state.project.constraints,
        },
        "scenario": {
            "code": state.scenario.code,
            "name": state.scenario.name,
            "description": state.scenario.description,
            "host_hints": state.scenario.host_hints,
            "default_role_codes": state.scenario.default_role_codes,
            "stages": state.scenario.stages,
            "parallel_groups": state.scenario.parallel_groups,
        },
        "user_selected_role_codes": state.active_role_codes,
        "default_role_codes": state.scenario.default_role_codes,
        "available_roles": [_role_summary(role) for role in available_roles],
    }


def _host_role(state: SessionState) -> AgentRole | None:
    """Resolve the persisted Host role so role-based model routing can match host stages."""

    return next((role for role in state.roles if role.code == "host"), None)


async def plan_initial_roles(state: SessionState) -> None:
    with Session(engine, expire_on_commit=False) as db:
        available_roles = db.exec(select(AgentRole).order_by(AgentRole.created_at)).all()
    available_by_code = {role.code: role for role in available_roles}
    existing_codes = set(state.active_role_codes)
    existing_ids = {role.id for role in state.roles if role.id}

    plan = await gateway.plan_initial_roles(
        topic=state.topic,
        project=state.project,
        context=_initial_role_context(state, available_roles),
        model_overrides=state.model_overrides,
    )
    selected_codes = [code for code in plan.get("selected_role_codes", []) if code in available_by_code]
    final_roles = list(state.roles)
    added_roles: list[AgentRole] = []
    for code in selected_codes:
        role = available_by_code[code]
        if role.code in existing_codes or role.id in existing_ids:
            continue
        final_roles.append(role)
        added_roles.append(role)
        existing_codes.add(role.code)
        existing_ids.add(role.id)

    state.roles = final_roles
    with Session(engine, expire_on_commit=False) as db:
        discussion = update_session(db, state.session_id, role_ids=[role.id for role in final_roles if role.id])
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.HOST_DECISION,
            stage="initial_role_planning",
            payload={
                **plan,
                "phase": "initial_planning",
                "selected_role_codes": [role.code for role in final_roles],
                "ignored_role_codes": [code for code in plan.get("selected_role_codes", []) if code not in available_by_code],
                "role_ids": discussion.role_ids,
            },
        )
        role_reasons = plan.get("role_reasons") if isinstance(plan.get("role_reasons"), dict) else {}
        for role in added_roles:
            record_event(
                db,
                session_id=state.session_id,
                event_type=EventType.ROLE_PULLED,
                stage="initial_role_planning",
                role_code=role.code,
                payload={
                    "phase": "initial_planning",
                    "role_code": role.code,
                    "role_name": role.name,
                    "reason": role_reasons.get(role.code) or plan.get("reason") or "",
                    "ad_hoc": False,
                    "model_used": plan.get("model_used"),
                },
            )


async def run_agentic_session(session_id: str) -> None:
    state = await load_initial_state(session_id)
    await start_session(state)
    await plan_initial_roles(state)
    _mark_progress(state)

    while True:
        state.iteration += 1
        termination_reason = _termination_reason(state)
        if termination_reason:
            await finalize_minutes(state, termination_reason=termination_reason)
            return

        decision = await gateway.host_decide(
            topic=state.topic,
            project=state.project,
            context=_host_context(state),
            model_overrides=state.model_overrides,
        )
        state.host_decision_history.append(decision)
        with Session(engine, expire_on_commit=False) as db:
            record_event(
                db,
                session_id=state.session_id,
                event_type=EventType.HOST_DECISION,
                stage=decision.get("stage") or decision.get("stage_name"),
                payload={**decision, "phase": "runtime"},
            )

        progressed = await execute_decision(state, decision)
        if decision.get("action") == "CONCLUDE":
            return
        if progressed:
            _mark_progress(state)
        await _stage_pause()


def _termination_reason(state: SessionState) -> str | None:
    if state.iteration > settings.orchestration_max_iterations:
        return "exceeded_max_iterations"
    if state.iteration - state.last_progress_iteration >= settings.orchestration_no_progress_limit:
        return "no_progress"
    if time.monotonic() - state.started_monotonic > settings.orchestration_timeout_seconds:
        return "timeout"
    return None


async def execute_decision(state: SessionState, decision: dict[str, Any]) -> bool:
    action = decision.get("action")
    if action == "NEXT_STAGE":
        return await execute_stage(state, str(decision.get("stage") or ""))
    if action == "PARALLEL_RUN":
        return await execute_parallel(state, str(decision.get("stage") or ""), decision.get("roles") or [])
    if action == "SKIP_STAGE":
        return skip_stage(state, str(decision.get("stage") or ""), str(decision.get("reason") or ""))
    if action == "ADD_STAGE":
        return await execute_ad_hoc_stage(state, decision)
    if action == "SEARCH_KNOWLEDGE":
        return await execute_knowledge_search(state, str(decision.get("query") or state.topic), str(decision.get("reason") or ""))
    if action == "REQUEST_HUMAN_REVIEW":
        return await request_human_review(state, decision)
    if action == "PULL_ROLE":
        return pull_role(state, decision)
    if action == "REMOVE_ROLE":
        return remove_role(state, str(decision.get("role_code") or ""), str(decision.get("reason") or ""))
    if action == "CONCLUDE":
        await finalize_minutes(state)
        return True
    state.failures.append({"action": action, "reason": "unknown_action"})
    return False


async def execute_knowledge_search(state: SessionState, query: str, reason: str) -> bool:
    state.knowledge_search_attempted = True
    with Session(engine, expire_on_commit=False) as db:
        discussion = db.get(DiscussionSession, state.session_id)
        user_id = discussion.user_id if discussion is not None and discussion.user_id else ""
        results, _ = await search_entries(
            query,
            user_id,
            db,
            project_id=state.project.id,
            limit=3,
        )
        matches: list[dict[str, Any]] = []
        for entry, score in results:
            entry.reference_count += 1
            entry.updated_at = utc_now()
            db.add(entry)
            matches.append(
                {
                    "entry_id": entry.id,
                    "source_session_id": entry.source_session_id,
                    "topic": entry.topic,
                    "conclusion": entry.conclusion[:240],
                    "key_conflicts": entry.key_conflicts[:3],
                    "similarity_score": score,
                }
            )
        state.knowledge_references.append({"query": query, "reason": reason, "matches": matches})
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.KNOWLEDGE_REFERENCED,
            stage="knowledge_search",
            role_code="host",
            payload={"query": query, "reason": reason, "matches": matches, "model_used": None},
        )
    return True


def _human_review_payload(review: HumanReviewRequest) -> dict[str, Any]:
    return {
        "id": review.id,
        "session_id": review.session_id,
        "question": review.question,
        "reason": review.reason,
        "blocking_level": review.blocking_level,
        "options": review.options,
        "status": review.status,
        "response": review.response,
        "default_on_timeout": review.default_on_timeout,
        "default_answer": review.default_answer,
        "impact": review.impact,
        "requested_at": review.requested_at.isoformat(),
        "expires_at": review.expires_at.isoformat() if review.expires_at else None,
        "resolved_at": review.resolved_at.isoformat() if review.resolved_at else None,
    }


def _review_open_question(review: HumanReviewRequest) -> dict[str, Any]:
    return {
        "question": review.question,
        "source": "human_review_timeout",
        "blocking_level": review.blocking_level,
        "impact": review.impact,
        "status": "unresolved",
        "review_id": review.id,
    }


def _review_response_context(review: HumanReviewRequest) -> dict[str, Any]:
    response = review.response if isinstance(review.response, dict) else {}
    return {
        "review_id": review.id,
        "question": review.question,
        "answer": response.get("answer") or review.default_answer,
        "selected_option": response.get("selected_option"),
        "status": review.status,
        "impact": review.impact,
    }


def _expired(expires_at: Any) -> bool:
    if not expires_at:
        return False
    now = utc_now()
    if getattr(expires_at, "tzinfo", None) is None and now.tzinfo is not None:
        now = now.replace(tzinfo=None)
    return now >= expires_at


async def request_human_review(state: SessionState, decision: dict[str, Any]) -> bool:
    question = str(decision.get("question") or "").strip()
    reason = str(decision.get("reason") or "").strip()
    impact = str(decision.get("impact") or "").strip()
    if not question or not reason or not impact:
        state.failures.append({"action": "REQUEST_HUMAN_REVIEW", "reason": "missing_required_fields"})
        return False

    timeout_seconds = int(decision.get("timeout_seconds") or 120)
    timeout_seconds = max(1, min(timeout_seconds, settings.orchestration_timeout_seconds))
    try:
        behavior = HumanReviewTimeoutBehavior(decision.get("default_on_timeout") or HumanReviewTimeoutBehavior.MARK_OPEN_QUESTION)
    except ValueError:
        behavior = HumanReviewTimeoutBehavior.MARK_OPEN_QUESTION
    options = [str(option) for option in decision.get("options") or [] if str(option).strip()]
    review = HumanReviewRequest(
        session_id=state.session_id,
        question=question,
        reason=reason,
        blocking_level=str(decision.get("blocking_level") or "medium"),
        options=options,
        default_on_timeout=behavior,
        default_answer=str(decision.get("default_answer") or ""),
        impact=impact,
        expires_at=utc_now() + timedelta(seconds=timeout_seconds),
    )
    state.human_review_requests.append({"question": question, "reason": reason, "impact": impact})
    with Session(engine, expire_on_commit=False) as db:
        db.add(review)
        db.commit()
        db.refresh(review)
        update_session(db, state.session_id, status=SessionStatus.PAUSED, current_stage="human_review")
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.HUMAN_REVIEW_REQUESTED,
            stage="human_review",
            role_code="host",
            payload=_human_review_payload(review),
        )

    outcome = await _wait_for_human_review(state, review.id)
    if outcome == "critical_timeout":
        raise RuntimeError(f"Critical human review timed out: {question}")
    return True


async def _wait_for_human_review(state: SessionState, review_id: str) -> str:
    while True:
        with Session(engine, expire_on_commit=False) as db:
            review = db.get(HumanReviewRequest, review_id)
            if review is None:
                state.failures.append({"review_id": review_id, "reason": "human_review_missing"})
                return "missing"
            if review.status == HumanReviewStatus.RESOLVED:
                state.human_review_responses.append(_review_response_context(review))
                update_session(db, state.session_id, status=SessionStatus.RUNNING)
                return "resolved"
            if review.status == HumanReviewStatus.TIMED_OUT:
                # Another request path may have reconciled an expired review first.
                update_session(db, state.session_id, status=SessionStatus.RUNNING)
                return "timeout"
            if _expired(review.expires_at):
                return _timeout_human_review(db, state, review)
        await asyncio.sleep(min(settings.event_poll_interval_seconds, 0.2))


def _timeout_human_review(db: Session, state: SessionState, review: HumanReviewRequest) -> str:
    review.status = HumanReviewStatus.TIMED_OUT
    review.resolved_at = utc_now()
    payload_extra: dict[str, Any] = {}
    if review.default_on_timeout == HumanReviewTimeoutBehavior.USE_DEFAULT:
        review.response = {"answer": review.default_answer, "source": "timeout_default"}
        state.human_review_responses.append(_review_response_context(review))
        payload_extra["used_default"] = True
    elif review.default_on_timeout == HumanReviewTimeoutBehavior.ABORT_IF_BLOCKING and review.blocking_level == "critical":
        db.add(review)
        db.commit()
        db.refresh(review)
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.HUMAN_REVIEW_TIMEOUT,
            stage="human_review",
            role_code="host",
            payload={**_human_review_payload(review), "aborted": True},
        )
        return "critical_timeout"
    else:
        open_item = _review_open_question(review)
        state.open_questions = _unique_question_items(state.open_questions, [open_item])
        payload_extra["added_open_question"] = open_item

    db.add(review)
    db.commit()
    db.refresh(review)
    update_session(db, state.session_id, status=SessionStatus.RUNNING)
    record_event(
        db,
        session_id=state.session_id,
        event_type=EventType.HUMAN_REVIEW_TIMEOUT,
        stage="human_review",
        role_code="host",
        payload={**_human_review_payload(review), **payload_extra},
    )
    return "timeout"


def skip_stage(state: SessionState, stage: str, reason: str) -> bool:
    if not stage:
        return False
    item = {"stage": stage, "reason": reason}
    state.skipped_stages.append(item)
    with Session(engine, expire_on_commit=False) as db:
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.STAGE_SKIPPED,
            stage=stage,
            payload={**item, "model_used": None},
        )
    return False


async def execute_stage(state: SessionState, stage: str) -> bool:
    if not stage:
        return False
    if stage == "independent_review":
        return await execute_parallel(state, stage, [role.code for role in state.roles if role.code != "host"])

    state.current_stage = stage
    with Session(engine, expire_on_commit=False) as db:
        update_session(db, state.session_id, current_stage=stage)
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.STAGE_STARTED,
            stage=stage,
            payload={"message": f"Stage {stage} started", "model_used": None},
        )

    context = _stage_context(state, stage)
    output = await gateway.complete_structured(
        role=_host_role(state),
        stage=stage,
        topic=state.topic,
        project=state.project,
        context=context,
        model_overrides=state.model_overrides,
    )
    _apply_stage_output(state, stage, output)
    _append_stage_once(state, stage)

    event_type = EventType.CONFLICT_DETECTED if stage == "detect_conflict" else EventType.AGENT_MESSAGE
    payload = output if event_type == EventType.AGENT_MESSAGE else {
        "conflicts": state.conflicts,
        "summary": output.get("summary", ""),
        "model_used": output.get("model_used"),
    }
    with Session(engine, expire_on_commit=False) as db:
        if event_type == EventType.AGENT_MESSAGE:
            _record_streamed_agent_message(
                db,
                session_id=state.session_id,
                stage=stage,
                role_code="host",
                payload=payload,
            )
        record_event(
            db,
            session_id=state.session_id,
            event_type=event_type,
            stage=stage,
            role_code="host",
            payload={**payload, "message_id": payload.get("message_id")} if payload.get("message_id") else payload,
        )
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.STAGE_COMPLETED,
            stage=stage,
            payload={"message": f"Stage {stage} completed", "model_used": output.get("model_used")},
        )
    return True


async def execute_parallel(state: SessionState, stage: str, role_codes: list[str]) -> bool:
    if not stage:
        return False
    selected_codes = {str(code) for code in role_codes}
    roles = [role for role in state.roles if role.code != "host" and (not selected_codes or role.code in selected_codes)]
    if not roles:
        state.failures.append({"stage": stage, "reason": "no_roles_for_parallel"})
        return False

    state.current_stage = stage
    with Session(engine, expire_on_commit=False) as db:
        update_session(db, state.session_id, current_stage=stage)
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.STAGE_STARTED,
            stage=stage,
            payload={"message": f"Stage {stage} started", "model_used": None},
        )
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.PARALLEL_START,
            stage=stage,
            payload={"roles": [role.code for role in roles], "model_used": None},
        )

    tasks = [
        gateway.complete_structured(
            role=role,
            stage=stage,
            topic=state.topic,
            project=state.project,
            context=_stage_context(state, stage),
            model_overrides=state.model_overrides,
        )
        for role in roles
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    successes = 0
    for role, result in zip(roles, results, strict=False):
        if isinstance(result, Exception):
            failure = {"stage": stage, "role_code": role.code, "error": str(result)}
            state.failures.append(failure)
            with Session(engine, expire_on_commit=False) as db:
                record_event(
                    db,
                    session_id=state.session_id,
                    event_type=EventType.TOOL_EVENT,
                    stage=stage,
                    role_code=role.code,
                    payload={**failure, "model_used": None},
                )
            continue
        successes += 1
        output = {"role_code": role.code, "role_name": role.name, **result}
        state.role_outputs.append(output)
        with Session(engine, expire_on_commit=False) as db:
            record_event(
                db,
                session_id=state.session_id,
                event_type=EventType.AGENT_MESSAGE,
                stage=stage,
                role_code=role.code,
                payload=result,
            )

    _append_stage_once(state, stage)
    with Session(engine, expire_on_commit=False) as db:
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.PARALLEL_COMPLETE,
            stage=stage,
            payload={"roles": [role.code for role in roles], "successes": successes, "failures": len(roles) - successes, "model_used": None},
        )
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.STAGE_COMPLETED,
            stage=stage,
            payload={"message": f"Stage {stage} completed", "model_used": None},
        )
    return successes > 0


async def execute_ad_hoc_stage(state: SessionState, decision: dict[str, Any]) -> bool:
    stage = str(decision.get("stage_name") or "")
    if not stage:
        return False
    item = {
        "stage": stage,
        "reason": str(decision.get("reason") or ""),
        "stage_prompt": str(decision.get("stage_prompt") or ""),
    }
    state.added_stages.append(item)
    with Session(engine, expire_on_commit=False) as db:
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.STAGE_ADDED,
            stage=stage,
            payload={**item, "model_used": decision.get("model_used")},
        )
    return await execute_stage(state, stage)


def pull_role(state: SessionState, decision: dict[str, Any]) -> bool:
    role_code = str(decision.get("role_code") or "")
    if role_code and any(role.code == role_code for role in state.roles):
        return False
    with Session(engine, expire_on_commit=False) as db:
        role = db.exec(select(AgentRole).where(AgentRole.code == role_code)).first() if role_code else None
        if role is None:
            role = pull_ad_hoc_role(decision)
        state.roles.append(role)
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.ROLE_PULLED,
            role_code=role.code,
            payload={
                "role_code": role.code,
                "role_name": role.name,
                "reason": decision.get("reason") or "",
                "phase": "runtime",
                "ad_hoc": role.id == "",
                "model_used": decision.get("model_used"),
            },
        )
    return True


def pull_ad_hoc_role(decision: dict[str, Any]) -> AgentRole:
    name = str(decision.get("role_name") or "Ad-hoc Expert")
    code = str(decision.get("role_code") or f"ad_hoc_{len(name)}")
    responsibility = str(decision.get("role_responsibility") or "Provide focused expertise for this discussion.")
    return AgentRole(
        id="",
        name=name,
        code=code,
        description=responsibility,
        responsibilities=[responsibility],
        focus_areas=[],
        tools=[],
        output_style="concise",
        is_default=False,
        can_debate=True,
        can_use_tools=False,
    )


def remove_role(state: SessionState, role_code: str, reason: str) -> bool:
    if not role_code or role_code == "host":
        return False
    original_len = len(state.roles)
    state.roles = [role for role in state.roles if role.code != role_code]
    changed = len(state.roles) != original_len
    if changed:
        with Session(engine, expire_on_commit=False) as db:
            record_event(
                db,
                session_id=state.session_id,
                event_type=EventType.ROLE_REMOVED,
                role_code=role_code,
                payload={"role_code": role_code, "reason": reason, "model_used": None},
            )
    return changed


def _stage_context(state: SessionState, stage: str) -> dict[str, Any]:
    context = _host_context(state)
    context["stage"] = stage
    if stage == "detect_conflict":
        context["role_outputs"] = state.role_outputs
    if stage == "debate":
        context["conflicts"] = state.conflicts
        context["role_outputs"] = state.role_outputs
    if stage == "judge_and_summarize":
        role_questions = [question for item in state.role_outputs for question in item.get("open_questions", [])]
        context["risks"] = _risk_items(state.role_outputs)
        context["open_questions"] = _unique_question_items(state.open_questions, role_questions)
        context["question_classification_policy"] = {
            "resolved_by_context": "Fold into final_conclusion, risks, or decision details.",
            "requires_human_review": "Ask the user only when facts or authorization are missing.",
            "convert_to_action": "Move executable follow-up work into actions.",
            "unresolved": "Keep only truly unresolved items in open_questions.",
        }
    if stage == "generate_actions":
        context["final_conclusion"] = state.final_conclusion
        context["human_review_responses"] = state.human_review_responses
    return context


def _is_review_answered(state: SessionState, question: Any) -> bool:
    key = _question_key(question)
    if not key:
        return True
    return any(_question_key(item.get("question", "")) == key for item in state.human_review_responses)


def _is_question_resolved_by_conclusion(state: SessionState, question: Any) -> bool:
    key = _question_key(question)
    if not key or isinstance(question, dict):
        return False
    return key in state.final_conclusion


def _classify_open_questions(
    state: SessionState,
    *,
    candidates: list[Any],
    explicit_open_questions: list[Any],
) -> list[Any]:
    explicit_keys = {_question_key(question) for question in explicit_open_questions}
    kept: list[Any] = []
    for question in candidates:
        key = _question_key(question)
        if not key:
            continue
        if _is_review_answered(state, question) or _is_question_resolved_by_conclusion(state, question):
            continue
        # Role-level exploratory questions are useful inputs, but they should not all leak into final output.
        # Keep structured timeout items and questions the judgement stage explicitly returned.
        if isinstance(question, dict) or key in explicit_keys:
            kept.append(question)
    return _unique_question_items(kept)


def _filter_action_items(actions: list[Any], unresolved_questions: list[Any]) -> list[dict[str, Any]]:
    unresolved_text = " ".join(_question_key(question) for question in unresolved_questions)
    filtered: list[dict[str, Any]] = []
    for action in actions:
        item = action if isinstance(action, dict) else {"title": str(action)}
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        if unresolved_text and title in unresolved_text:
            item = {**item, "blocked_by_open_question": True}
        filtered.append(
            {
                "title": title,
                "owner": str(item.get("owner") or item.get("assignee_role_code") or "owner TBD"),
                "priority": str(item.get("priority") or "medium"),
                "status": str(item.get("status") or "todo"),
                **{key: value for key, value in item.items() if key not in {"title", "owner", "priority", "status"}},
            }
        )
    return filtered


def _apply_stage_output(state: SessionState, stage: str, output: dict[str, Any]) -> None:
    if stage == "clarify_topic":
        state.open_questions = output.get("open_questions", [])
    elif stage == "detect_conflict":
        state.conflicts = output.get("conflicts", [])
    elif stage == "judge_and_summarize":
        role_risks = _risk_items(state.role_outputs)
        role_questions = [question for item in state.role_outputs for question in item.get("open_questions", [])]
        state.risks = output.get("risks") or role_risks
        state.final_conclusion = output.get("final_conclusion") or output.get("summary", "")
        state.open_questions = _classify_open_questions(
            state,
            candidates=_unique_question_items(state.open_questions, role_questions, output.get("open_questions", [])),
            explicit_open_questions=output.get("open_questions", []),
        )
    elif stage == "generate_actions":
        state.actions = _filter_action_items(output.get("actions", []), state.open_questions)


async def finalize_minutes(state: SessionState, termination_reason: str | None = None) -> None:
    if _has_result(state.session_id):
        await create_entry(state.session_id)
        return
    if not state.final_conclusion:
        state.final_conclusion = "Session completed with partial outputs."
    if not state.risks:
        state.risks = _risk_items(state.role_outputs)
    markdown = _build_minutes(state, termination_reason)
    result = SessionResult(
        session_id=state.session_id,
        final_conclusion=state.final_conclusion,
        key_conflicts=state.conflicts,
        role_summaries=state.role_outputs,
        risks=state.risks,
        open_questions=state.open_questions,
        actions=state.actions,
        actual_flow=state.completed_stages,
        skipped_stages=state.skipped_stages,
        added_stages=state.added_stages,
        markdown_minutes=markdown,
    )
    with Session(engine, expire_on_commit=False) as db:
        db.add(result)
        db.commit()
        _append_stage_once(state, "finalize_minutes")
        update_session(
            db,
            state.session_id,
            status=SessionStatus.COMPLETED,
            current_stage="finalize_minutes",
            completed_at=utc_now(),
        )
        payload = {"result_id": result.id, "termination_reason": termination_reason, "model_used": None}
        record_event(
            db,
            session_id=state.session_id,
            event_type=EventType.SESSION_COMPLETED,
            stage="finalize_minutes",
            payload=payload,
        )
    await create_entry(state.session_id)


def _has_result(session_id: str) -> bool:
    with Session(engine, expire_on_commit=False) as db:
        return db.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first() is not None


def _build_minutes(state: SessionState, termination_reason: str | None) -> str:
    conflict_lines = "\n".join(
        f"- {item.get('title', 'Conflict')}: {item.get('judgement', item.get('summary', ''))}"
        for item in state.conflicts
    )
    action_lines = "\n".join(
        f"- [{item.get('priority', 'medium')}] {item.get('title', 'Action')} ({item.get('owner', 'owner TBD')})"
        for item in state.actions
    )
    flow_lines = "\n".join(f"- {stage}" for stage in state.completed_stages)
    termination = f"\n\n## Termination\n\n{termination_reason}" if termination_reason else ""
    return (
        f"# {state.topic}\n\n"
        f"## Final Conclusion\n\n{state.final_conclusion}\n\n"
        f"## Actual Flow\n\n{flow_lines or '- No completed stages'}\n\n"
        f"## Key Conflicts\n\n{conflict_lines or '- No major conflict recorded'}\n\n"
        f"## Actions\n\n{action_lines or '- No action generated'}"
        f"{termination}"
    )


async def run_session_workflow(session_id: str) -> None:
    _active_workflows.add(session_id)
    try:
        await run_agentic_session(session_id)
    except Exception as exc:
        with Session(engine, expire_on_commit=False) as db:
            update_session(db, session_id, status=SessionStatus.FAILED, error_message=str(exc), completed_at=utc_now())
            record_event(db, session_id=session_id, event_type=EventType.SESSION_FAILED, payload={"error": str(exc)})
    finally:
        _active_workflows.discard(session_id)

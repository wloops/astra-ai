import asyncio
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph
from sqlmodel import Session, select

from astra_api.db import engine
from astra_api.llm_gateway import LLMGateway
from astra_api.models import (
    AgentRole,
    DiscussionSession,
    EventType,
    Project,
    ScenarioTemplate,
    SessionEvent,
    SessionResult,
    SessionStatus,
    utc_now,
)


class WorkflowState(TypedDict, total=False):
    session_id: str
    project: Project
    scenario: ScenarioTemplate
    roles: list[AgentRole]
    topic: str
    role_outputs: list[dict[str, Any]]
    conflicts: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    open_questions: list[str]
    actions: list[dict[str, Any]]
    final_conclusion: str


gateway = LLMGateway()


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
    # 给 SSE 客户端可观察的阶段间隔，避免整条链路瞬间完成。
    await asyncio.sleep(0.1)


async def init_session(state: WorkflowState) -> WorkflowState:
    with Session(engine, expire_on_commit=False) as db:
        update_session(db, state["session_id"], status=SessionStatus.RUNNING, current_stage="init_session")
        record_event(db, session_id=state["session_id"], event_type=EventType.SESSION_STARTED, stage="init_session", payload={"message": "智能研讨已启动"})
    await _stage_pause()
    return state


async def load_context(state: WorkflowState) -> WorkflowState:
    with Session(engine, expire_on_commit=False) as db:
        discussion = db.get(DiscussionSession, state["session_id"])
        if discussion is None:
            raise ValueError("Session not found")
        project = db.get(Project, discussion.project_id)
        scenario = db.get(ScenarioTemplate, discussion.scenario_id)
        if project is None or scenario is None:
            raise ValueError("Project or scenario not found")
        roles = db.exec(select(AgentRole).where(AgentRole.id.in_(discussion.role_ids))).all()
        if not roles:
            roles = db.exec(select(AgentRole).where(AgentRole.code.in_(scenario.default_role_codes))).all()
        state.update(project=project, scenario=scenario, roles=roles, topic=discussion.topic)
        update_session(db, state["session_id"], current_stage="load_context")
        record_event(
            db,
            session_id=state["session_id"],
            event_type=EventType.STAGE_COMPLETED,
            stage="load_context",
            payload={"project": project.name, "roles": [role.name for role in roles]},
        )
    await _stage_pause()
    return state


async def clarify_topic(state: WorkflowState) -> WorkflowState:
    project = state["project"]
    output = await gateway.complete_structured(role=None, stage="clarify_topic", topic=state["topic"], project=project, context={})
    state["open_questions"] = output.get("open_questions", [])
    with Session(engine, expire_on_commit=False) as db:
        update_session(db, state["session_id"], current_stage="clarify_topic")
        record_event(db, session_id=state["session_id"], event_type=EventType.STAGE_STARTED, stage="clarify_topic", payload={"message": "AI 主持人开始澄清议题"})
        record_event(db, session_id=state["session_id"], event_type=EventType.AGENT_MESSAGE, stage="clarify_topic", role_code="host", payload=output)
        record_event(db, session_id=state["session_id"], event_type=EventType.STAGE_COMPLETED, stage="clarify_topic", payload={"message": "议题澄清完成"})
    await _stage_pause()
    return state


async def independent_review(state: WorkflowState) -> WorkflowState:
    outputs: list[dict[str, Any]] = []
    with Session(engine, expire_on_commit=False) as db:
        update_session(db, state["session_id"], current_stage="independent_review")
        record_event(db, session_id=state["session_id"], event_type=EventType.STAGE_STARTED, stage="independent_review", payload={"message": "专家角色开始独立评审"})
    for role in state["roles"]:
        if role.code == "host":
            continue
        output = await gateway.complete_structured(role=role, stage="independent_review", topic=state["topic"], project=state["project"], context={})
        outputs.append({"role_code": role.code, "role_name": role.name, **output})
        with Session(engine, expire_on_commit=False) as db:
            record_event(db, session_id=state["session_id"], event_type=EventType.AGENT_MESSAGE, stage="independent_review", role_code=role.code, payload=output)
        await _stage_pause()
    state["role_outputs"] = outputs
    with Session(engine, expire_on_commit=False) as db:
        record_event(db, session_id=state["session_id"], event_type=EventType.STAGE_COMPLETED, stage="independent_review", payload={"message": "独立评审完成"})
    return state


async def detect_conflict(state: WorkflowState) -> WorkflowState:
    conflicts = [
        {
            "title": "效率收益与财务风控边界",
            "supporting_view": "产品视角认为小额自动结算能显著缩短报销周期。",
            "cautious_view": "测试和架构视角要求先补齐异常回退、审计和幂等控制。",
            "judgement": "可以推进 MVP，但必须限制范围并满足前置控制条件。",
        }
    ]
    state["conflicts"] = conflicts
    with Session(engine, expire_on_commit=False) as db:
        update_session(db, state["session_id"], current_stage="detect_conflict")
        record_event(db, session_id=state["session_id"], event_type=EventType.CONFLICT_DETECTED, stage="detect_conflict", payload={"conflicts": conflicts})
        record_event(db, session_id=state["session_id"], event_type=EventType.STAGE_COMPLETED, stage="detect_conflict", payload={"message": "争议识别完成"})
    await _stage_pause()
    return state


async def debate(state: WorkflowState) -> WorkflowState:
    with Session(engine, expire_on_commit=False) as db:
        update_session(db, state["session_id"], current_stage="debate")
        record_event(db, session_id=state["session_id"], event_type=EventType.STAGE_STARTED, stage="debate", payload={"message": "围绕关键争议进行交叉辩论"})
        record_event(
            db,
            session_id=state["session_id"],
            event_type=EventType.AGENT_MESSAGE,
            stage="debate",
            role_code="host",
            payload={"summary": "辩论结论：业务价值成立，但上线前必须完成异常回退、审计链路和灰度回滚设计。"},
        )
        record_event(db, session_id=state["session_id"], event_type=EventType.STAGE_COMPLETED, stage="debate", payload={"message": "交叉辩论完成"})
    await _stage_pause()
    return state


async def judge_and_summarize(state: WorkflowState) -> WorkflowState:
    role_outputs = state.get("role_outputs", [])
    risks = [{"name": risk, "level": "medium"} for item in role_outputs for risk in item.get("risks", [])]
    open_questions = list({question for item in role_outputs for question in item.get("open_questions", [])})
    state["risks"] = risks
    state["open_questions"] = state.get("open_questions", []) + open_questions
    state["final_conclusion"] = "建议以受限 MVP 推进小额发票自动结算：仅覆盖 200 元及以下、OCR 与验真通过、无异常命中且审计记录完整的单据。"
    with Session(engine, expire_on_commit=False) as db:
        update_session(db, state["session_id"], current_stage="judge_and_summarize")
        record_event(
            db,
            session_id=state["session_id"],
            event_type=EventType.AGENT_MESSAGE,
            stage="judge_and_summarize",
            role_code="host",
            payload={"summary": state["final_conclusion"], "risks": risks, "open_questions": state["open_questions"]},
        )
        record_event(db, session_id=state["session_id"], event_type=EventType.STAGE_COMPLETED, stage="judge_and_summarize", payload={"message": "结论归纳完成"})
    await _stage_pause()
    return state


async def generate_actions(state: WorkflowState) -> WorkflowState:
    actions = [
        {"title": "定义自动结算适用范围", "owner": "产品经理", "priority": "high", "status": "todo"},
        {"title": "补充自动结算状态机和审计字段", "owner": "后端架构师", "priority": "high", "status": "todo"},
        {"title": "制定异常场景验收用例", "owner": "测试工程师", "priority": "medium", "status": "todo"},
    ]
    state["actions"] = actions
    with Session(engine, expire_on_commit=False) as db:
        update_session(db, state["session_id"], current_stage="generate_actions")
        record_event(db, session_id=state["session_id"], event_type=EventType.STAGE_COMPLETED, stage="generate_actions", payload={"actions": actions})
    await _stage_pause()
    return state


async def finalize_minutes(state: WorkflowState) -> WorkflowState:
    markdown = (
        f"# {state['topic']}\n\n"
        f"## 最终结论\n\n{state['final_conclusion']}\n\n"
        "## 关键争议\n\n"
        + "\n".join(f"- {item['title']}：{item['judgement']}" for item in state["conflicts"])
        + "\n\n## 行动项\n\n"
        + "\n".join(f"- [{item['priority']}] {item['title']}（{item['owner']}）" for item in state["actions"])
    )
    result = SessionResult(
        session_id=state["session_id"],
        final_conclusion=state["final_conclusion"],
        key_conflicts=state["conflicts"],
        role_summaries=state["role_outputs"],
        risks=state["risks"],
        open_questions=state["open_questions"],
        actions=state["actions"],
        markdown_minutes=markdown,
    )
    with Session(engine, expire_on_commit=False) as db:
        db.add(result)
        db.commit()
        update_session(db, state["session_id"], status=SessionStatus.COMPLETED, current_stage="finalize_minutes", completed_at=utc_now())
        record_event(db, session_id=state["session_id"], event_type=EventType.SESSION_COMPLETED, stage="finalize_minutes", payload={"result_id": result.id})
    return state


def build_graph():
    graph = StateGraph(WorkflowState)
    graph.add_node("init_session", init_session)
    graph.add_node("load_context", load_context)
    graph.add_node("clarify_topic", clarify_topic)
    graph.add_node("independent_review", independent_review)
    graph.add_node("detect_conflict", detect_conflict)
    graph.add_node("debate", debate)
    graph.add_node("judge_and_summarize", judge_and_summarize)
    graph.add_node("generate_actions", generate_actions)
    graph.add_node("finalize_minutes", finalize_minutes)

    graph.set_entry_point("init_session")
    graph.add_edge("init_session", "load_context")
    graph.add_edge("load_context", "clarify_topic")
    graph.add_edge("clarify_topic", "independent_review")
    graph.add_edge("independent_review", "detect_conflict")
    graph.add_edge("detect_conflict", "debate")
    graph.add_edge("debate", "judge_and_summarize")
    graph.add_edge("judge_and_summarize", "generate_actions")
    graph.add_edge("generate_actions", "finalize_minutes")
    graph.add_edge("finalize_minutes", END)
    return graph.compile()


compiled_graph = build_graph()


async def run_session_workflow(session_id: str) -> None:
    try:
        await compiled_graph.ainvoke({"session_id": session_id})
    except Exception as exc:
        with Session(engine, expire_on_commit=False) as db:
            update_session(db, session_id, status=SessionStatus.FAILED, error_message=str(exc), completed_at=utc_now())
            record_event(db, session_id=session_id, event_type=EventType.SESSION_FAILED, payload={"error": str(exc)})

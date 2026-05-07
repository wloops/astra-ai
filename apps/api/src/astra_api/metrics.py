from sqlmodel import Session, select

from astra_api.models import DiscussionSession, EventType, SessionEvent, SessionResult


def _label(value: float) -> str:
    if value >= 0.8:
        return "优秀"
    if value >= 0.6:
        return "良好"
    if value >= 0.4:
        return "一般"
    return "偏低"


def compute_session_metrics(session_id: str, db: Session) -> dict:
    events = db.exec(
        select(SessionEvent)
        .where(SessionEvent.session_id == session_id)
        .order_by(SessionEvent.sequence)
    ).all()

    discussion = db.get(DiscussionSession, session_id)
    result = db.exec(
        select(SessionResult).where(SessionResult.session_id == session_id)
    ).first()

    if not events or discussion is None:
        return {
            "conclusion_convergence": 0.0,
            "conclusion_label": "无数据",
            "context_sufficiency": 0.0,
            "context_label": "无数据",
            "risk_coverage": 0.0,
            "risk_label": "无数据",
        }

    # 上下文充分度：agent_message 事件在总阶段事件中的占比
    stage_started_count = sum(1 for e in events if e.type == EventType.STAGE_STARTED)
    agent_message_count = sum(1 for e in events if e.type == EventType.AGENT_MESSAGE)
    expected_min_messages = max(stage_started_count, 1) * len(discussion.role_ids or [1])
    context_sufficiency = min(agent_message_count / expected_min_messages, 1.0) if expected_min_messages else 0.0

    # 结论收敛度：role_summaries 覆盖的角色比例 + 是否有 final_conclusion
    if result is not None:
        role_count = len(discussion.role_ids) if discussion.role_ids else 1
        summary_coverage = min(len(result.role_summaries) / role_count, 1.0) if role_count else 0.0
        has_conclusion = 1.0 if result.final_conclusion else 0.0
        conclusion_convergence = summary_coverage * 0.5 + has_conclusion * 0.5
    else:
        conclusion_convergence = 0.3  # 会话未完成，基础分

    # 风险覆盖度：risks 占 risks+open_questions 的比例
    if result is not None:
        risk_count = len(result.risks)
        total_issues = risk_count + len(result.open_questions)
        risk_coverage = (risk_count / total_issues) if total_issues > 0 else 0.5
    else:
        risk_coverage = 0.0

    return {
        "conclusion_convergence": round(conclusion_convergence, 2),
        "conclusion_label": _label(conclusion_convergence),
        "context_sufficiency": round(context_sufficiency, 2),
        "context_label": _label(context_sufficiency),
        "risk_coverage": round(risk_coverage, 2),
        "risk_label": _label(risk_coverage),
    }

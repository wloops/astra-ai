import asyncio
import threading
import time
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlmodel import select

from astra_api.config import settings
from astra_api.db import get_session, init_db
from astra_api.main import app
from astra_api.knowledge import create_entry
from astra_api.models import AgentRole, DiscussionSession, EventType, HumanReviewRequest, HumanReviewStatus, KnowledgeEntry, Project, ScenarioTemplate, SessionEvent, SessionResult, SessionStatus, utc_now
from astra_api.orchestrator import gateway, run_session_workflow
from astra_api.seed import seed_defaults


client = TestClient(app)


def _items(response) -> list:
    return response.json()["items"]


def _create_session(topic: str = "agentic orchestration test") -> str:
    with client:
        projects = _items(client.get("/projects"))
        scenarios = _items(client.get("/scenario-templates"))
        response = client.post(
            "/sessions",
            json={
                "project_id": projects[0]["id"],
                "scenario_id": scenarios[0]["id"],
                "topic": topic,
            },
        )
    assert response.status_code == 200
    return response.json()["id"]


def _wait_done(session_id: str) -> None:
    timeout = time.time() + 15
    while time.time() < timeout:
        with next(get_session()) as db:
            discussion = db.get(DiscussionSession, session_id)
            status = discussion.status if discussion is not None else None
        if status in (SessionStatus.COMPLETED, SessionStatus.FAILED):
            return
        time.sleep(0.2)


def _create_db_session(topic: str) -> str:
    with next(get_session()) as db:
        project = db.exec(select(Project)).first()
        scenario = db.exec(select(ScenarioTemplate)).first()
        assert project is not None
        assert scenario is not None
        discussion = DiscussionSession(
            project_id=project.id,
            scenario_id=scenario.id,
            topic=topic,
            role_ids=[],
            user_id=project.user_id,
        )
        db.add(discussion)
        db.commit()
        db.refresh(discussion)
        return discussion.id


def _run_workflow_thread(session_id: str) -> threading.Thread:
    thread = threading.Thread(target=lambda: asyncio.run(run_session_workflow(session_id)), daemon=True)
    thread.start()
    return thread


def test_host_agent_loop_produces_flow_result(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    session_id = _create_session()
    _wait_done(session_id)

    with next(get_session()) as db:
        result = db.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()
        host_events = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.HOST_DECISION)
        ).all()

    assert result is not None
    assert result.actual_flow
    assert "independent_review" in result.actual_flow
    assert host_events


def test_parallel_review_and_skip_stage_events(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    session_id = _create_session("parallel and skip test")
    _wait_done(session_id)

    with next(get_session()) as db:
        session_events = db.exec(select(SessionEvent).where(SessionEvent.session_id == session_id)).all()
        event_types = [event.type for event in session_events]
        debate_completed = any(
            event.stage == "debate" and event.type == EventType.STAGE_COMPLETED
            for event in session_events
        )
        result = db.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()

    assert EventType.PARALLEL_START in event_types
    assert EventType.PARALLEL_COMPLETE in event_types
    assert EventType.AGENT_MESSAGE_DELTA in event_types
    assert EventType.AGENT_MESSAGE_DONE in event_types
    assert EventType.STAGE_SKIPPED in event_types or debate_completed
    assert result is not None
    assert debate_completed or any(item["stage"] == "debate" for item in result.skipped_stages)


def test_debate_stage_persists_structured_events_and_legacy_message(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    init_db()
    with next(get_session()) as db:
        seed_defaults(db)
    session_id = _create_db_session("structured debate event test")
    asyncio.run(run_session_workflow(session_id))

    with next(get_session()) as db:
        events = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .order_by(SessionEvent.sequence)
        ).all()

    debate_types = [event.type for event in events if event.stage == "debate"]
    assert EventType.DEBATE_STARTED in debate_types
    assert EventType.DEBATE_ROUND in debate_types
    assert EventType.DEBATE_MODERATED in debate_types
    assert EventType.DEBATE_COMPLETED in debate_types
    assert EventType.AGENT_MESSAGE in debate_types
    assert EventType.STAGE_COMPLETED in debate_types

    round_event = next(event for event in events if event.type == EventType.DEBATE_ROUND)
    assert round_event.payload["round_index"] == 1
    assert round_event.payload["speaker_role_code"]
    assert round_event.payload["claim"]


def test_parallel_review_does_not_emit_streaming_delta(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    session_id = _create_session("parallel should not stream")
    _wait_done(session_id)

    with next(get_session()) as db:
        parallel_deltas = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.AGENT_MESSAGE_DELTA)
            .where(SessionEvent.stage == "independent_review")
        ).all()
        parallel_messages = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.AGENT_MESSAGE)
            .where(SessionEvent.stage == "independent_review")
        ).all()

    assert parallel_messages
    assert parallel_deltas == []


def test_host_only_session_pulls_default_roles_before_review(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    with next(get_session()) as db:
        project = db.exec(select(Project)).first()
        scenario = db.exec(select(ScenarioTemplate)).first()
        host_role = db.exec(select(AgentRole).where(AgentRole.code == "host")).first()
        assert project is not None
        assert scenario is not None
        assert host_role is not None
        discussion = DiscussionSession(
            project_id=project.id,
            scenario_id=scenario.id,
            topic="host only should pull roles",
            role_ids=[host_role.id],
            user_id=project.user_id,
        )
        db.add(discussion)
        db.commit()
        db.refresh(discussion)
        session_id = discussion.id

    asyncio.run(run_session_workflow(session_id))

    with next(get_session()) as db:
        pulled = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.ROLE_PULLED)
        ).all()
        agent_messages = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.AGENT_MESSAGE)
            .where(SessionEvent.stage == "independent_review")
        ).all()
        discussion = db.get(DiscussionSession, session_id)

    assert [event.role_code for event in pulled] == ["product_manager", "backend_architect", "qa_engineer"]
    assert all(event.payload["phase"] == "initial_planning" for event in pulled)
    assert {event.role_code for event in agent_messages} >= {"product_manager", "backend_architect", "qa_engineer"}
    assert discussion is not None
    assert len(discussion.role_ids) >= 4
    with client:
        response = client.get(f"/sessions/{session_id}")
    assert response.status_code == 200
    assert set(response.json()["role_ids"]) == set(discussion.role_ids)


def test_initial_role_planning_preserves_user_selected_roles(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    with next(get_session()) as db:
        project = db.exec(select(Project)).first()
        scenario = db.exec(select(ScenarioTemplate)).first()
        host_role = db.exec(select(AgentRole).where(AgentRole.code == "host")).first()
        product_role = db.exec(select(AgentRole).where(AgentRole.code == "product_manager")).first()
        assert project is not None
        assert scenario is not None
        assert host_role is not None
        assert product_role is not None
        discussion = DiscussionSession(
            project_id=project.id,
            scenario_id=scenario.id,
            topic="preserve manually selected roles",
            role_ids=[host_role.id, product_role.id],
            user_id=project.user_id,
        )
        db.add(discussion)
        db.commit()
        db.refresh(discussion)
        session_id = discussion.id

    asyncio.run(run_session_workflow(session_id))

    with next(get_session()) as db:
        discussion = db.get(DiscussionSession, session_id)
        roles = db.exec(select(AgentRole).where(AgentRole.id.in_(discussion.role_ids))).all() if discussion else []
        pulled = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.ROLE_PULLED)
        ).all()

    assert {role.code for role in roles} >= {"host", "product_manager", "backend_architect", "qa_engineer"}
    assert "product_manager" not in [event.role_code for event in pulled]


def test_initial_role_planning_ignores_unknown_role_codes(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    async def fake_plan_initial_roles(**_: object) -> dict:
        return {
            "phase": "initial_planning",
            "selected_role_codes": ["host", "product_manager", "unknown_expert"],
            "reason": "test plan",
            "role_reasons": {"product_manager": "needed", "unknown_expert": "not registered"},
        }

    monkeypatch.setattr(gateway, "plan_initial_roles", fake_plan_initial_roles)

    with next(get_session()) as db:
        project = db.exec(select(Project)).first()
        scenario = db.exec(select(ScenarioTemplate)).first()
        host_role = db.exec(select(AgentRole).where(AgentRole.code == "host")).first()
        assert project is not None
        assert scenario is not None
        assert host_role is not None
        discussion = DiscussionSession(
            project_id=project.id,
            scenario_id=scenario.id,
            topic="ignore unknown role codes",
            role_ids=[host_role.id],
            user_id=project.user_id,
        )
        db.add(discussion)
        db.commit()
        db.refresh(discussion)
        session_id = discussion.id

    asyncio.run(run_session_workflow(session_id))

    with next(get_session()) as db:
        discussion = db.get(DiscussionSession, session_id)
        roles = db.exec(select(AgentRole).where(AgentRole.id.in_(discussion.role_ids))).all() if discussion else []
        planning_event = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.HOST_DECISION)
            .where(SessionEvent.stage == "initial_role_planning")
        ).first()

    assert {role.code for role in roles} == {"host", "product_manager"}
    assert planning_event is not None
    assert planning_event.payload["ignored_role_codes"] == ["unknown_expert"]


def test_forced_termination_keeps_partial_result(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    monkeypatch.setattr(settings, "orchestration_max_iterations", 1)

    session_id = _create_session("forced termination test")
    _wait_done(session_id)

    with next(get_session()) as db:
        result = db.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()
        session_completed = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.SESSION_COMPLETED)
        ).first()

    assert result is not None
    assert result.final_conclusion
    assert session_completed is not None
    assert session_completed.payload["termination_reason"] == "exceeded_max_iterations"


def test_search_knowledge_event_and_auto_entry(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    async def fake_embedding(_: str) -> list[float]:
        return [1.0, 0.0]

    monkeypatch.setattr("astra_api.knowledge.generate_embedding", fake_embedding)

    with next(get_session()) as db:
        project = db.exec(select(Project)).first()
        scenario = db.exec(select(ScenarioTemplate)).first()
        assert project is not None
        assert scenario is not None
        historical = DiscussionSession(
            project_id=project.id,
            scenario_id=scenario.id,
            topic="historical boundary decision",
            role_ids=[],
            user_id=project.user_id,
            status=SessionStatus.COMPLETED,
            current_stage="finalize_minutes",
        )
        db.add(historical)
        db.commit()
        db.refresh(historical)
        db.add(
            SessionResult(
                session_id=historical.id,
                final_conclusion="Historical conclusion",
                key_conflicts=[{"title": "boundary"}],
                role_summaries=[],
                risks=[],
                actions=[],
                markdown_minutes="# Historical",
            )
        )
        db.commit()
        asyncio.run(create_entry(historical.id, db))
        new_discussion = DiscussionSession(
            project_id=project.id,
            scenario_id=scenario.id,
            topic="new boundary decision",
            role_ids=[],
            user_id=project.user_id,
        )
        db.add(new_discussion)
        db.commit()
        db.refresh(new_discussion)
        session_id = new_discussion.id

    asyncio.run(run_session_workflow(session_id))

    with next(get_session()) as db:
        reference_event = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.KNOWLEDGE_REFERENCED)
        ).first()
        entry = db.exec(select(KnowledgeEntry).where(KnowledgeEntry.source_session_id == session_id)).first()

    assert reference_event is not None
    assert reference_event.payload["matches"]
    assert entry is not None


def test_human_review_response_resumes_workflow(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    async def fake_host_decide(**kwargs: object) -> dict:
        context = kwargs["context"]
        assert isinstance(context, dict)
        if not context.get("human_review_responses"):
            return {
                "action": "REQUEST_HUMAN_REVIEW",
                "reason": "需要业务口径",
                "question": "30元阈值按含税还是未税计算？",
                "blocking_level": "medium",
                "options": ["含税", "未税"],
                "default_on_timeout": "mark_open_question",
                "timeout_seconds": 30,
                "impact": "影响自动结算规则",
            }
        return {"action": "CONCLUDE", "reason": "已收到人工确认"}

    monkeypatch.setattr(gateway, "host_decide", fake_host_decide)
    session_id = _create_db_session("human review response test")
    thread = _run_workflow_thread(session_id)

    timeout = time.time() + 10
    review_id = ""
    while time.time() < timeout:
        with next(get_session()) as db:
            review = db.exec(
                select(HumanReviewRequest)
                .where(HumanReviewRequest.session_id == session_id)
                .where(HumanReviewRequest.status == HumanReviewStatus.PENDING)
            ).first()
            if review is not None:
                review_id = review.id
                break
        time.sleep(0.1)
    assert review_id
    with client:
        response = client.post(
            f"/sessions/{session_id}/human-reviews/{review_id}/respond",
            json={"answer": "按含税金额计算", "selected_option": "含税"},
        )
        assert response.status_code == 200

    _wait_done(session_id)
    thread.join(timeout=5)
    with next(get_session()) as db:
        review = db.get(HumanReviewRequest, review_id)
        result = db.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()
        resolved_event = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.HUMAN_REVIEW_RESOLVED)
        ).first()

    assert review is not None
    assert review.status == HumanReviewStatus.RESOLVED
    assert result is not None
    assert resolved_event is not None


def test_human_review_timeout_adds_structured_open_question(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    calls = {"count": 0}

    async def fake_host_decide(**_: object) -> dict:
        calls["count"] += 1
        if calls["count"] == 1:
            return {
                "action": "REQUEST_HUMAN_REVIEW",
                "reason": "需要财务口径",
                "question": "是否必须关联差旅申请单？",
                "blocking_level": "medium",
                "options": [],
                "default_on_timeout": "mark_open_question",
                "timeout_seconds": 1,
                "impact": "影响报销风控边界",
            }
        return {"action": "CONCLUDE", "reason": "超时后继续"}

    monkeypatch.setattr(gateway, "host_decide", fake_host_decide)
    session_id = _create_db_session("human review timeout test")
    thread = _run_workflow_thread(session_id)
    _wait_done(session_id)
    thread.join(timeout=5)

    with next(get_session()) as db:
        result = db.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()
        timeout_event = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.HUMAN_REVIEW_TIMEOUT)
        ).first()

    assert result is not None
    assert result.open_questions
    assert result.open_questions[0]["source"] == "human_review_timeout"
    assert timeout_event is not None


def test_critical_human_review_timeout_fails_session(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    async def fake_host_decide(**_: object) -> dict:
        return {
            "action": "REQUEST_HUMAN_REVIEW",
            "reason": "需要授权",
            "question": "是否允许绕过法务审核？",
            "blocking_level": "critical",
            "options": [],
            "default_on_timeout": "abort_if_blocking",
            "timeout_seconds": 1,
            "impact": "影响合规风险",
        }

    monkeypatch.setattr(gateway, "host_decide", fake_host_decide)
    session_id = _create_db_session("critical human review timeout test")
    thread = _run_workflow_thread(session_id)
    _wait_done(session_id)
    thread.join(timeout=5)

    with next(get_session()) as db:
        discussion = db.get(DiscussionSession, session_id)
        timeout_event = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.HUMAN_REVIEW_TIMEOUT)
        ).first()

    assert discussion is not None
    assert discussion.status == SessionStatus.FAILED
    assert timeout_event is not None


def test_human_review_rejects_duplicate_response(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")

    with next(get_session()) as db:
        project = db.exec(select(Project)).first()
        scenario = db.exec(select(ScenarioTemplate)).first()
        assert project is not None
        assert scenario is not None
        discussion = DiscussionSession(
            project_id=project.id,
            scenario_id=scenario.id,
            topic="duplicate human review response",
            role_ids=[],
            user_id=project.user_id,
            status=SessionStatus.PAUSED,
            current_stage="human_review",
        )
        db.add(discussion)
        db.commit()
        db.refresh(discussion)
        review = HumanReviewRequest(
            session_id=discussion.id,
            question="是否允许自动结算？",
            reason="需要确认",
            impact="影响功能范围",
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        session_id = discussion.id
        review_id = review.id

    with client:
        first = client.post(f"/sessions/{session_id}/human-reviews/{review_id}/respond", json={"answer": "允许"})
        second = client.post(f"/sessions/{session_id}/human-reviews/{review_id}/respond", json={"answer": "允许"})

    assert first.status_code == 200
    assert second.status_code == 409


def test_expired_human_review_rejects_response_and_reconciles_stale_session(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")

    with next(get_session()) as db:
        project = db.exec(select(Project)).first()
        scenario = db.exec(select(ScenarioTemplate)).first()
        assert project is not None
        assert scenario is not None
        discussion = DiscussionSession(
            project_id=project.id,
            scenario_id=scenario.id,
            topic="expired human review response",
            role_ids=[],
            user_id=project.user_id,
            status=SessionStatus.PAUSED,
            current_stage="human_review",
        )
        db.add(discussion)
        db.commit()
        db.refresh(discussion)
        review = HumanReviewRequest(
            session_id=discussion.id,
            question="是否允许自动结算？",
            reason="需要确认",
            impact="影响功能范围",
            expires_at=utc_now() - timedelta(seconds=1),
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        session_id = discussion.id
        review_id = review.id

    with client:
        response = client.post(f"/sessions/{session_id}/human-reviews/{review_id}/respond", json={"answer": "允许"})

    assert response.status_code == 409
    with next(get_session()) as db:
        review = db.get(HumanReviewRequest, review_id)
        discussion = db.get(DiscussionSession, session_id)
        timeout_event = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.HUMAN_REVIEW_TIMEOUT)
        ).first()
    assert review is not None
    assert review.status == HumanReviewStatus.TIMED_OUT
    assert discussion is not None
    assert discussion.status == SessionStatus.FAILED
    assert timeout_event is not None


def test_question_classification_does_not_leak_role_questions(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    async def fake_complete_structured(**kwargs: object) -> dict:
        stage = kwargs["stage"]
        role = kwargs.get("role")
        role_code = getattr(role, "code", "host")
        if stage == "independent_review":
            return {
                "summary": f"{role_code} summary",
                "stance": "support",
                "risks": [],
                "open_questions": [f"{role_code} exploratory question"],
                "actions": [],
                "model_used": "test",
            }
        if stage == "judge_and_summarize":
            return {
                "summary": "final",
                "final_conclusion": "已明确自动结算边界。",
                "stance": "approve",
                "risks": [],
                "open_questions": ["仍需法务确认免责条款"],
                "actions": [],
                "model_used": "test",
            }
        return {
            "summary": "ok",
            "stance": "ok",
            "risks": [],
            "open_questions": [],
            "actions": [{"title": "补齐法务确认材料", "owner": "product_manager", "priority": "medium", "status": "todo"}] if stage == "generate_actions" else [],
            "conflicts": [],
            "model_used": "test",
        }

    monkeypatch.setattr(gateway, "complete_structured", fake_complete_structured)
    session_id = _create_db_session("question classification test")
    asyncio.run(run_session_workflow(session_id))

    with next(get_session()) as db:
        result = db.exec(select(SessionResult).where(SessionResult.session_id == session_id)).first()

    assert result is not None
    assert result.open_questions == ["仍需法务确认免责条款"]
    assert all("exploratory question" not in str(question) for question in result.open_questions)

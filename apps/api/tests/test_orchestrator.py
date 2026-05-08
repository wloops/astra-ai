import asyncio
import time

from fastapi.testclient import TestClient
from sqlmodel import select

from astra_api.config import settings
from astra_api.db import get_session
from astra_api.main import app
from astra_api.knowledge import create_entry
from astra_api.models import AgentRole, DiscussionSession, EventType, KnowledgeEntry, Project, ScenarioTemplate, SessionEvent, SessionResult, SessionStatus
from astra_api.orchestrator import gateway, run_session_workflow


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
    with client:
        while time.time() < timeout:
            status = client.get(f"/sessions/{session_id}").json()["status"]
            if status in ("completed", "failed"):
                return
            time.sleep(0.2)


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
    assert EventType.STAGE_SKIPPED in event_types or debate_completed
    assert result is not None
    assert debate_completed or any(item["stage"] == "debate" for item in result.skipped_stages)


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

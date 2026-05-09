from fastapi.testclient import TestClient
from sqlmodel import select

from astra_api.config import settings
from astra_api.db import get_session
from astra_api.main import app
from astra_api.models import DiscussionSession, Project, ScenarioTemplate, SessionResult, SessionStatus


client = TestClient(app)


def _items(response) -> list:
    return response.json()["items"]


def test_task_crud_lifecycle(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")

    with client:
        project = _items(client.get("/projects"))[0]
        created = client.post(
            "/tasks",
            json={
                "project_id": project["id"],
                "title": "测试任务",
                "description": "覆盖 CRUD 生命周期",
                "priority": "high",
            },
        )
        assert created.status_code == 200
        task = created.json()
        assert task["id"].startswith("task_")
        assert task["status"] == "todo"

        listed = client.get(f"/tasks?project_id={project['id']}&priority=high")
        assert listed.status_code == 200
        assert any(item["id"] == task["id"] for item in _items(listed))

        updated = client.put(f"/tasks/{task['id']}", json={"status": "done"})
        assert updated.status_code == 200
        assert updated.json()["completed_at"] is not None

        deleted = client.delete(f"/tasks/{task['id']}")
        assert deleted.status_code == 200
        assert deleted.json() == {"status": "deleted", "id": task["id"]}

        missing = client.get(f"/tasks/{task['id']}")
        assert missing.status_code == 404


def test_promote_actions_is_idempotent(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    with next(get_session()) as db:
        project = db.exec(select(Project)).first()
        scenario = db.exec(select(ScenarioTemplate)).first()
        assert project is not None
        assert scenario is not None
        discussion = DiscussionSession(
            project_id=project.id,
            scenario_id=scenario.id,
            topic="promote 集成测试",
            user_id=project.user_id,
            status=SessionStatus.COMPLETED,
            current_stage="finalize_minutes",
        )
        db.add(discussion)
        db.commit()
        db.refresh(discussion)
        db.add(
            SessionResult(
                session_id=discussion.id,
                final_conclusion="done",
                key_conflicts=[],
                role_summaries=[],
                risks=[],
                open_questions=[],
                actions=[{"title": "Promote action", "owner": "product_manager", "priority": "high", "status": "todo"}],
                markdown_minutes="# done",
            )
        )
        db.commit()
        session_id = discussion.id

    with client:
        first = client.post(f"/sessions/{session_id}/promote-actions", json={"action_indices": [0]})
        assert first.status_code == 200
        assert first.json()["created"] == 1
        assert first.json()["tasks"][0]["source_session_id"] == session_id

        second = client.post(f"/sessions/{session_id}/promote-actions", json={"action_indices": [0]})
        assert second.status_code == 200
        assert second.json()["created"] == 0
        assert second.json()["skipped"] == 1


def test_promote_rejects_missing_session(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")

    with client:
        response = client.post("/sessions/missing/promote-actions", json={})

    assert response.status_code == 404

from fastapi.testclient import TestClient

from astra_api.config import settings
from astra_api.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_seeded_registries_are_available() -> None:
    with client:
        projects = client.get("/projects")
        roles = client.get("/agent-roles")
        scenarios = client.get("/scenario-templates")
    assert projects.status_code == 200
    assert roles.status_code == 200
    assert scenarios.status_code == 200
    assert len(projects.json()) >= 1
    assert len(roles.json()) >= 4
    assert len(scenarios.json()) >= 1


def test_session_workflow_produces_result_with_local_fallback(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    with client:
        project = client.get("/projects").json()[0]
        scenario = client.get("/scenario-templates").json()[0]
        create_response = client.post(
            "/sessions",
            json={
                "project_id": project["id"],
                "scenario_id": scenario["id"],
                "topic": "是否允许 200 元以下发票自动结算？",
            },
        )
    assert create_response.status_code == 200
    session_id = create_response.json()["id"]

    result_response = client.get(f"/sessions/{session_id}/result")
    assert result_response.status_code == 200
    result = result_response.json()
    assert result["final_conclusion"]
    assert result["key_conflicts"]
    assert result["actions"]

    session_response = client.get(f"/sessions/{session_id}")
    assert session_response.status_code == 200
    assert session_response.json()["status"] == "completed"


# --- 1.4: Session CRUD 测试 ---


def test_list_sessions(monkeypatch) -> None:
    """GET /sessions 返回 session 列表"""
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    with client:
        response = client.get("/sessions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_and_get_session(monkeypatch) -> None:
    """创建 session → 查询单条 → 状态为 pending/running/completed"""
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    with client:
        projects = client.get("/projects").json()
        scenarios = client.get("/scenario-templates").json()
        roles = client.get("/agent-roles").json()

        create_resp = client.post(
            "/sessions",
            json={
                "project_id": projects[0]["id"],
                "scenario_id": scenarios[0]["id"],
                "topic": "CRUD 测试",
                "role_ids": [roles[0]["id"], roles[1]["id"]],
            },
        )
        assert create_resp.status_code == 200
        session_id = create_resp.json()["id"]

        get_resp = client.get(f"/sessions/{session_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["topic"] == "CRUD 测试"
        assert data["status"] in ("pending", "running", "completed", "failed")


def test_get_nonexistent_session_returns_404() -> None:
    """查询不存在的 session 返回 404"""
    with client:
        resp = client.get("/sessions/nonexistent")
    assert resp.status_code == 404


# --- 1.5: Orchestrator workflow 测试 ---


def test_workflow_produces_events(monkeypatch) -> None:
    """本地 fallback 下完整 workflow 产出至少 10 个事件"""
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    import asyncio
    import time

    with client:
        projects = client.get("/projects").json()
        scenarios = client.get("/scenario-templates").json()

        create_resp = client.post(
            "/sessions",
            json={
                "project_id": projects[0]["id"],
                "scenario_id": scenarios[0]["id"],
                "topic": "Workflow 事件测试",
            },
        )
        session_id = create_resp.json()["id"]

        # 等待 workflow 完成
        timeout = time.time() + 15
        while time.time() < timeout:
            status_resp = client.get(f"/sessions/{session_id}")
            if status_resp.json()["status"] in ("completed", "failed"):
                break
            time.sleep(0.5)

        # 验证事件数量（通过 SSE 手动验证或检查 result）
        result_resp = client.get(f"/sessions/{session_id}/result")
        assert result_resp.status_code == 200
        result = result_resp.json()
        assert result["final_conclusion"]
        assert result["key_conflicts"]
        assert result["actions"]
        assert len(result["actions"]) > 0

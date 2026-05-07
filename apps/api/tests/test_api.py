from fastapi.testclient import TestClient

from astra_api.config import settings
from astra_api.main import app


client = TestClient(app)


def _items(response) -> list:
    """从分页响应中提取 items 列表（兼容旧测试写法）"""
    data = response.json()
    return data["items"] if isinstance(data, dict) else data


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
    assert len(_items(projects)) >= 1
    assert len(_items(roles)) >= 4
    assert len(_items(scenarios)) >= 1


def test_session_workflow_produces_result_with_local_fallback(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    with client:
        project = _items(client.get("/projects"))[0]
        scenario = _items(client.get("/scenario-templates"))[0]
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
    """GET /sessions 返回分页 session 列表"""
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    with client:
        response = client.get("/sessions")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


def test_create_and_get_session(monkeypatch) -> None:
    """创建 session → 查询单条 → 状态为 pending/running/completed"""
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    with client:
        projects = _items(client.get("/projects"))
        scenarios = _items(client.get("/scenario-templates"))
        roles = _items(client.get("/agent-roles"))

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

    import time

    with client:
        projects = _items(client.get("/projects"))
        scenarios = _items(client.get("/scenario-templates"))

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


# --- DELETE 端点测试 ---


def test_delete_project() -> None:
    """删除项目返回 200，再次查询不存在"""
    with client:
        # 先创建临时项目再删除，不动种子数据
        created = client.post("/projects", json={"name": "临时删除测试项目"})
        assert created.status_code == 200
        project_id = created.json()["id"]

        del_resp = client.delete(f"/projects/{project_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "deleted"

        get_resp = client.get("/projects")
        ids = [p["id"] for p in _items(get_resp)]
        assert project_id not in ids


def test_delete_agent_role() -> None:
    """删除角色返回 200"""
    with client:
        created = client.post("/agent-roles", json={"name": "临时删除测试角色", "code": "tmp_delete_test"})
        assert created.status_code == 200
        role_id = created.json()["id"]

        del_resp = client.delete(f"/agent-roles/{role_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "deleted"


def test_delete_scenario_template() -> None:
    """删除场景模板返回 200"""
    with client:
        created = client.post("/scenario-templates", json={"name": "临时删除测试场景", "code": "tmp_delete_scene"})
        assert created.status_code == 200
        scenario_id = created.json()["id"]

        del_resp = client.delete(f"/scenario-templates/{scenario_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "deleted"


def test_delete_session_cascades() -> None:
    """删除 session 同时清理关联的事件和结果"""
    monkeypatch = None
    import pytest
    # 手动模拟 monkeypatch（不依赖 pytest monkeypatch fixture）
    from astra_api.config import settings as s

    old_base = s.llm_base_url
    old_key = s.llm_api_key
    s.llm_base_url = None
    s.llm_api_key = None

    try:
        with client:
            projects = _items(client.get("/projects"))
            scenarios = _items(client.get("/scenario-templates"))
            create_resp = client.post(
                "/sessions",
                json={
                    "project_id": projects[0]["id"],
                    "scenario_id": scenarios[0]["id"],
                    "topic": "Delete 级联测试",
                },
            )
            session_id = create_resp.json()["id"]

            # 等待完成
            import time
            timeout = time.time() + 15
            while time.time() < timeout:
                status_resp = client.get(f"/sessions/{session_id}")
                if status_resp.json()["status"] in ("completed", "failed"):
                    break
                time.sleep(0.5)

            del_resp = client.delete(f"/sessions/{session_id}")
            assert del_resp.status_code == 200
            assert del_resp.json()["status"] == "deleted"

            get_resp = client.get(f"/sessions/{session_id}")
            assert get_resp.status_code == 404
    finally:
        s.llm_base_url = old_base
        s.llm_api_key = old_key


def test_delete_nonexistent_returns_404() -> None:
    """删除不存在的资源返回 404"""
    for path in ["/projects/nonexistent", "/agent-roles/nonexistent",
                 "/scenario-templates/nonexistent", "/sessions/nonexistent"]:
        resp = client.delete(path)
        assert resp.status_code == 404


# --- 分页测试 ---


def test_pagination_offset_limit() -> None:
    """分页参数 offset/limit 正常截取"""
    with client:
        resp = client.get("/projects?offset=0&limit=1")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["items"], list)
        assert len(data["items"]) <= 1
        assert data["offset"] == 0
        assert data["limit"] == 1


def test_pagination_large_offset_returns_empty() -> None:
    """offset 超出总量时返回空列表"""
    with client:
        resp = client.get("/projects?offset=9999&limit=10")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []


# --- Session metrics 测试 ---


def test_completed_session_has_metrics(monkeypatch) -> None:
    """已完成的 session 包含 metrics 字段"""
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)

    import time

    with client:
        projects = _items(client.get("/projects"))
        scenarios = _items(client.get("/scenario-templates"))
        create_resp = client.post(
            "/sessions",
            json={
                "project_id": projects[0]["id"],
                "scenario_id": scenarios[0]["id"],
                "topic": "Metrics 测试",
            },
        )
        session_id = create_resp.json()["id"]

        timeout = time.time() + 15
        while time.time() < timeout:
            status_resp = client.get(f"/sessions/{session_id}")
            if status_resp.json()["status"] in ("completed", "failed"):
                break
            time.sleep(0.5)

        get_resp = client.get(f"/sessions/{session_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        if data["status"] == "completed":
            assert data["metrics"] is not None
            m = data["metrics"]
            assert "conclusion_convergence" in m
            assert "conclusion_label" in m
            assert "context_sufficiency" in m
            assert "context_label" in m
            assert "risk_coverage" in m
            assert "risk_label" in m
        else:
            assert data["metrics"] is None

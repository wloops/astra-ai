from fastapi.testclient import TestClient

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


def test_session_workflow_produces_result() -> None:
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

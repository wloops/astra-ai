import time

import pytest
from fastapi.testclient import TestClient
from sqlmodel import select

from astra_api.config import settings
from astra_api.db import get_session
from astra_api.main import app
from astra_api.models import EventType, SessionEvent


client = TestClient(app)


class FakeModelResponse:
    def raise_for_status(self) -> None:
        return None


class FakeModelClient:
    requests: list[dict[str, object]] = []

    def __init__(self, *args: object, **kwargs: object) -> None:
        return None

    async def __aenter__(self) -> "FakeModelClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def post(self, url: str, *, json: dict[str, object], headers: dict[str, str]) -> FakeModelResponse:
        self.requests.append({"url": url, "json": json, "headers": headers})
        return FakeModelResponse()


class FailingModelClient(FakeModelClient):
    async def post(self, url: str, *, json: dict[str, object], headers: dict[str, str]) -> FakeModelResponse:
        raise RuntimeError("connection failed")


def _items(response) -> list:
    return response.json()["items"]


def test_get_model_profiles_masks_api_key_and_base_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        settings,
        "llm_model_profiles",
        '{"strong":{"model":"gpt-4o","base_url":"https://api.example.test/v1","api_key":"secret"}}',
    )

    with client:
        response = client.get("/models/profiles")

    assert response.status_code == 200
    assert response.json() == [{"name": "strong", "model": "gpt-4o", "base_url": "https://api.example.test"}]
    assert "secret" not in response.text


def test_get_model_profiles_returns_implicit_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_model_profiles", "")
    monkeypatch.setattr(settings, "llm_model", "legacy-model")

    with client:
        response = client.get("/models/profiles")

    assert response.status_code == 200
    assert response.json()[0]["name"] == "default"
    assert response.json()[0]["model"] == "legacy-model"


def test_model_test_success(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeModelClient.requests = []
    monkeypatch.setattr("astra_api.main.httpx.AsyncClient", FakeModelClient)
    monkeypatch.setattr(
        settings,
        "llm_model_profiles",
        '{"strong":{"model":"gpt-4o","base_url":"https://api.example.test/v1","api_key":"secret"}}',
    )

    with client:
        response = client.post("/models/test", json={"profile_name": "strong"})

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert FakeModelClient.requests[0]["json"]["model"] == "gpt-4o"


def test_model_test_failure_and_missing_profile(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("astra_api.main.httpx.AsyncClient", FailingModelClient)
    monkeypatch.setattr(
        settings,
        "llm_model_profiles",
        '{"strong":{"model":"gpt-4o","base_url":"https://api.example.test/v1","api_key":"secret"}}',
    )

    with client:
        failed = client.post("/models/test", json={"profile_name": "strong"})
        missing = client.post("/models/test", json={"profile_name": "missing"})

    assert failed.status_code == 200
    assert failed.json()["status"] == "error"
    assert missing.status_code == 404


def test_session_model_overrides_and_events_include_model_used(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    monkeypatch.setattr(settings, "llm_model_profiles", '{"default":{"model":"mini"},"strong":{"model":"strong-model"}}')
    monkeypatch.setattr(settings, "llm_stage_routing", "{}")
    monkeypatch.setattr(settings, "llm_role_routing", "{}")

    with client:
        projects = _items(client.get("/projects"))
        scenarios = _items(client.get("/scenario-templates"))
        create_response = client.post(
            "/sessions",
            json={
                "project_id": projects[0]["id"],
                "scenario_id": scenarios[0]["id"],
                "topic": "model overrides test",
                "model_overrides": {"debate": "strong"},
            },
        )
        assert create_response.status_code == 200
        session_id = create_response.json()["id"]
        assert create_response.json()["model_overrides"] == {"debate": "strong"}

        timeout = time.time() + 15
        while time.time() < timeout:
            status = client.get(f"/sessions/{session_id}").json()["status"]
            if status in ("completed", "failed"):
                break
            time.sleep(0.5)

    with next(get_session()) as db:
        debate_event = db.exec(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .where(SessionEvent.type == EventType.AGENT_MESSAGE)
            .where(SessionEvent.stage == "debate")
        ).first()

    assert debate_event is not None
    assert debate_event.payload["model_used"] == "strong-model"

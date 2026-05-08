from fastapi.testclient import TestClient

from astra_api.config import settings
from astra_api.main import app


def test_api_key_allows_valid_header(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "secret")
    client = TestClient(app)

    with client:
        response = client.get("/projects", headers={"X-API-Key": "secret"})

    assert response.status_code == 200


def test_api_key_rejects_missing_or_invalid_header(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "secret")
    client = TestClient(app)

    with client:
        missing = client.get("/projects")
        invalid = client.get("/projects", headers={"X-API-Key": "wrong"})

    assert missing.status_code == 401
    assert invalid.status_code == 401
    assert invalid.json() == {"detail": "Invalid API key"}


def test_api_key_disabled_keeps_backward_compatibility(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    client = TestClient(app)

    with client:
        response = client.get("/projects")

    assert response.status_code == 200


def test_health_is_exempt_from_api_key(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "secret")
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_sse_accepts_api_key_query_param(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "secret")
    client = TestClient(app)

    with client:
        response = client.get("/sessions/missing/events?api_key=secret")

    assert response.status_code == 200

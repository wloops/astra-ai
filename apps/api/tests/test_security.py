import importlib

from fastapi.testclient import TestClient


def _reload_app(monkeypatch, *, cors_origins: str = "", rate_limit_enabled: bool = True):
    monkeypatch.setenv("ASTRA_CORS_ORIGINS", cors_origins)
    monkeypatch.setenv("ASTRA_RATE_LIMIT_ENABLED", "true" if rate_limit_enabled else "false")

    import astra_api.config as config
    import astra_api.main as main

    importlib.reload(config)
    main = importlib.reload(main)
    return main.app, main.limiter


def test_cors_uses_configured_origin_allowlist(monkeypatch) -> None:
    app, _ = _reload_app(monkeypatch, cors_origins="https://astra.wlait.com,http://localhost:5173")

    with TestClient(app) as client:
        allowed = client.get("/health", headers={"Origin": "https://astra.wlait.com"})
        denied = client.get("/health", headers={"Origin": "https://evil.example"})

    assert allowed.headers["access-control-allow-origin"] == "https://astra.wlait.com"
    assert "access-control-allow-origin" not in denied.headers


def test_cors_falls_back_to_wildcard_when_unconfigured(monkeypatch) -> None:
    app, _ = _reload_app(monkeypatch, cors_origins="")

    with TestClient(app) as client:
        response = client.get("/health", headers={"Origin": "https://any.example"})

    assert response.headers["access-control-allow-origin"] == "*"


def test_security_headers_skip_hsts_for_http(monkeypatch) -> None:
    app, _ = _reload_app(monkeypatch)

    with TestClient(app, base_url="http://testserver") as client:
        response = client.get("/health")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert "strict-transport-security" not in response.headers


def test_security_headers_include_hsts_for_https(monkeypatch) -> None:
    app, _ = _reload_app(monkeypatch)

    with TestClient(app, base_url="https://testserver") as client:
        response = client.get("/health")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["strict-transport-security"] == "max-age=31536000; includeSubDomains"


def test_rate_limit_returns_429_and_exempts_health(monkeypatch) -> None:
    app, limiter = _reload_app(monkeypatch, rate_limit_enabled=True)
    limiter.reset()

    with TestClient(app) as client:
        responses = [client.get("/projects") for _ in range(61)]
        health_response = client.get("/health")

    assert responses[-1].status_code == 429
    assert health_response.status_code == 200


def test_session_creation_uses_stricter_rate_limit(monkeypatch) -> None:
    app, limiter = _reload_app(monkeypatch, rate_limit_enabled=True)
    limiter.reset()

    payload = {
        "project_id": "missing",
        "scenario_id": "missing",
        "topic": "rate limit check",
    }
    with TestClient(app) as client:
        responses = [client.post("/sessions", json=payload) for _ in range(11)]

    assert responses[9].status_code == 404
    assert responses[10].status_code == 429


def test_rate_limit_can_be_disabled(monkeypatch) -> None:
    app, _ = _reload_app(monkeypatch, rate_limit_enabled=False)

    with TestClient(app) as client:
        responses = [client.get("/projects") for _ in range(65)]

    assert all(response.status_code == 200 for response in responses)

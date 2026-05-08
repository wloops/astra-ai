from datetime import timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlmodel import select

from astra_api.auth import create_access_token
from astra_api.config import settings
from astra_api.db import get_session
from astra_api.main import app
from astra_api.models import Project, User
from astra_api.seed import seed_defaults


def test_api_key_allows_valid_header(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "secret")
    monkeypatch.setattr(settings, "jwt_secret", "")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)

    with client:
        response = client.get("/projects", headers={"X-API-Key": "secret"})

    assert response.status_code == 200


def test_api_key_rejects_missing_or_invalid_header(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "secret")
    monkeypatch.setattr(settings, "jwt_secret", "")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)

    with client:
        missing = client.get("/projects")
        invalid = client.get("/projects", headers={"X-API-Key": "wrong"})

    assert missing.status_code == 401
    assert invalid.status_code == 401
    assert invalid.json() == {"detail": "Invalid API key"}


def test_api_key_disabled_keeps_backward_compatibility(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "jwt_secret", "")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)

    with client:
        response = client.get("/projects")

    assert response.status_code == 200


def test_health_is_exempt_from_api_key(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "secret")
    monkeypatch.setattr(settings, "jwt_secret", "")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_sse_accepts_api_key_query_param(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "secret")
    monkeypatch.setattr(settings, "jwt_secret", "")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)

    with client:
        response = client.get("/sessions/missing/events?api_key=secret")

    assert response.status_code == 200


def test_register_login_and_jwt_access(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "jwt_secret", "test-secret")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)
    username = f"alice_auth_flow_{uuid4().hex[:8]}"

    with client:
        registered = client.post("/auth/register", json={"username": username, "password": "secure123"})
        duplicate = client.post("/auth/register", json={"username": username, "password": "secure123"})
        login = client.post("/auth/login", json={"username": username, "password": "secure123"})
        token = login.json()["access_token"]
        projects = client.get("/projects", headers={"Authorization": f"Bearer {token}"})

    assert registered.status_code == 200
    assert registered.json()["username"] == username
    assert duplicate.status_code == 409
    assert login.status_code == 200
    assert login.json()["token_type"] == "bearer"
    assert projects.status_code == 200


def test_login_rejects_invalid_credentials(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "jwt_secret", "test-secret")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)
    username = f"bob_auth_flow_{uuid4().hex[:8]}"

    with client:
        client.post("/auth/register", json={"username": username, "password": "secure123"})
        wrong_password = client.post("/auth/login", json={"username": username, "password": "bad"})
        missing_user = client.post("/auth/login", json={"username": "missing_user", "password": "bad"})

    assert wrong_password.status_code == 401
    assert wrong_password.json() == {"detail": "Invalid username or password"}
    assert missing_user.status_code == 401


def test_jwt_rejects_expired_and_invalid_tokens(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "jwt_secret", "test-secret")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)

    with next(get_session()) as session:
        user = session.exec(select(User).where(User.username == "admin")).first()
        assert user is not None
        expired_token = create_access_token(user, expires_delta=timedelta(seconds=-1))

    with client:
        expired = client.get("/projects", headers={"Authorization": f"Bearer {expired_token}"})
        invalid = client.get("/projects", headers={"Authorization": "Bearer not-a-token"})

    assert expired.status_code == 401
    assert expired.json() == {"detail": "Token expired"}
    assert invalid.status_code == 401
    assert invalid.json() == {"detail": "Invalid token"}


def test_auth_endpoints_and_health_are_public_when_auth_enabled(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "jwt_secret", "test-secret")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)

    with client:
        health = client.get("/health")
        register = client.post("/auth/register", json={"username": f"public_auth_user_{uuid4().hex[:8]}", "password": "pw"})
        protected = client.get("/projects")

    assert health.status_code == 200
    assert register.status_code == 200
    assert protected.status_code == 401


def test_user_data_isolation(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "jwt_secret", "test-secret")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)

    def token_for(username: str) -> str:
        client.post("/auth/register", json={"username": username, "password": "pw"})
        return client.post("/auth/login", json={"username": username, "password": "pw"}).json()["access_token"]

    with client:
        token_a = token_for(f"tenant_a_auth_{uuid4().hex[:8]}")
        token_b = token_for(f"tenant_b_auth_{uuid4().hex[:8]}")
        created = client.post(
            "/projects",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"name": "A 私有项目"},
        )
        project_id = created.json()["id"]
        list_b = client.get("/projects", headers={"Authorization": f"Bearer {token_b}"})
        get_b = client.put(
            f"/projects/{project_id}",
            headers={"Authorization": f"Bearer {token_b}"},
            json={"name": "跨用户修改"},
        )

    assert created.status_code == 200
    assert list_b.status_code == 200
    assert all(item["id"] != project_id for item in list_b.json()["items"])
    assert get_b.status_code == 404


def test_seed_backfills_null_user_id_records(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "jwt_secret", "")
    monkeypatch.setattr(settings, "admin_password", "")

    with next(get_session()) as session:
        project = Project(name="迁移回填项目", user_id=None)
        session.add(project)
        session.commit()
        project_id = project.id

        seed_defaults(session)
        migrated = session.get(Project, project_id)
        admin = session.exec(select(User).where(User.username == "admin")).first()

    assert migrated is not None
    assert admin is not None
    assert migrated.user_id == admin.id


def test_default_admin_password_login_is_disabled_but_api_key_still_works(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "secret")
    monkeypatch.setattr(settings, "jwt_secret", "")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)

    with client:
        login = client.post("/auth/login", json={"username": "admin", "password": "admin"})
        projects = client.get("/projects", headers={"X-API-Key": "secret"})

    assert login.status_code == 401
    assert projects.status_code == 200


def test_configured_admin_password_can_manage_global_templates(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "jwt_secret", "test-secret")
    monkeypatch.setattr(settings, "admin_password", "configured-admin-password")
    client = TestClient(app)

    with client:
        admin_login = client.post(
            "/auth/login",
            json={"username": "admin", "password": "configured-admin-password"},
        )
        admin_token = admin_login.json()["access_token"]
        created = client.post(
            "/agent-roles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Auth Admin Role", "code": f"auth_admin_{uuid4().hex[:8]}"},
        )

    assert admin_login.status_code == 200
    assert created.status_code == 200


def test_regular_user_cannot_write_global_templates(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "jwt_secret", "test-secret")
    monkeypatch.setattr(settings, "admin_password", "")
    client = TestClient(app)
    username = f"template_writer_{uuid4().hex[:8]}"

    with client:
        client.post("/auth/register", json={"username": username, "password": "pw"})
        token = client.post("/auth/login", json={"username": username, "password": "pw"}).json()["access_token"]
        role = client.post(
            "/agent-roles",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Blocked Role", "code": f"blocked_role_{uuid4().hex[:8]}"},
        )
        scenario = client.post(
            "/scenario-templates",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Blocked Scenario", "code": f"blocked_scenario_{uuid4().hex[:8]}"},
        )

    assert role.status_code == 403
    assert scenario.status_code == 403

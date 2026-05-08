from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Depends, Header, HTTPException, Query
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from astra_api.config import settings
from astra_api.db import get_session
from astra_api.models import User


ACCESS_TOKEN_EXPIRE_HOURS = 24
ADMIN_USERNAME = "admin"
DISABLED_PASSWORD = "__astra_admin_password_disabled__"

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_context.verify(password, hashed_password)


def admin_login_password() -> str:
    """Return the explicitly configured admin password; blank disables public admin login."""

    return settings.admin_password.strip()


def is_admin_user(user: User) -> bool:
    return user.username == ADMIN_USERNAME


def create_access_token(user: User, expires_delta: timedelta | None = None) -> str:
    expires_at = datetime.now(UTC) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    payload: dict[str, Any] = {
        "sub": user.id,
        "username": user.username,
        "exp": expires_at,
    }
    secret = _jwt_secret()
    return jwt.encode(payload, secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, _jwt_secret(), algorithms=[settings.jwt_algorithm])
    except ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


def get_admin_user(session: Session) -> User:
    user = session.exec(select(User).where(User.username == ADMIN_USERNAME)).first()
    if user is None:
        # API Key fallback and migration need a stable owner even before seed runs in tests.
        user = User(username=ADMIN_USERNAME, hashed_password=hash_password(admin_login_password() or DISABLED_PASSWORD))
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    token: str | None = Query(default=None),
    api_key: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> User:
    if token:
        payload = decode_token(token)
        return _user_from_payload(payload, session)

    if authorization and authorization.startswith("Bearer "):
        payload = decode_token(authorization.removeprefix("Bearer ").strip())
        return _user_from_payload(payload, session)

    expected_api_key = settings.api_key.strip()
    supplied_api_key = x_api_key or api_key
    if expected_api_key and supplied_api_key == expected_api_key:
        return get_admin_user(session)

    if not expected_api_key and not settings.jwt_secret.strip():
        return get_admin_user(session)

    raise HTTPException(status_code=401, detail="Invalid API key")


def _user_from_payload(payload: dict[str, Any], session: Session) -> User:
    user_id = payload.get("sub")
    if not isinstance(user_id, str):
        raise HTTPException(status_code=401, detail="Invalid token")
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def _jwt_secret() -> str:
    # Empty secret is allowed for local/dev compatibility; production should set ASTRA_JWT_SECRET.
    return settings.jwt_secret.strip() or "astra-local-development-secret"

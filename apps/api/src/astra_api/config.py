from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


API_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime settings for the API service."""

    database_url: str = "sqlite:///./data/astra.db"
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str = "gpt-4o-mini"
    llm_model_profiles: str = ""
    llm_stage_routing: str = ""
    llm_role_routing: str = ""
    cors_origins: str = ""
    api_key: str = ""
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    admin_password: str = ""
    rate_limit_enabled: bool = True
    event_poll_interval_seconds: float = 0.5
    llm_timeout_seconds: float = 60.0
    orchestration_max_iterations: int = 20
    orchestration_no_progress_limit: int = 3
    orchestration_timeout_seconds: float = 600.0

    model_config = SettingsConfigDict(
        # 支持从仓库根目录启动，也支持把后端专用配置放在 apps/api/.env。
        env_file=(".env", API_DIR / ".env"),
        env_prefix="ASTRA_",
        extra="ignore",
    )


settings = Settings()


def ensure_sqlite_parent() -> None:
    """Create the SQLite parent directory before SQLAlchemy opens the file."""

    if not settings.database_url.startswith("sqlite:///"):
        return
    raw_path = settings.database_url.removeprefix("sqlite:///")
    if raw_path in {":memory:", ""}:
        return
    Path(raw_path).parent.mkdir(parents=True, exist_ok=True)

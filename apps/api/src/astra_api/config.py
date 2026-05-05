from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the API service."""

    database_url: str = "sqlite:///./data/astra.db"
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str = "gpt-4o-mini"
    event_poll_interval_seconds: float = 0.5

    model_config = SettingsConfigDict(
        env_file=".env",
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

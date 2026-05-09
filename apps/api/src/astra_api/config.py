from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


API_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime settings for the API service."""

    database_url: str = "sqlite:///./data/astra.db"

    # ── LLM（对话/审议模型） ──
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 60.0

    # ── 多模型路由 ──
    llm_model_profiles: str = ""
    llm_stage_routing: str = ""
    llm_role_routing: str = ""

    # ── Embedding（语义搜索，独立于对话模型） ──
    embedding_base_url: str | None = None
    embedding_api_key: str | None = None
    embedding_model: str = "text-embedding-3-small"

    # ── 鉴权 ──
    api_key: str = ""
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    admin_password: str = ""

    # ── CORS ──
    cors_origins: str = ""

    # ── 速率限制 ──
    rate_limit_enabled: bool = True

    # ── SSE ──
    event_poll_interval_seconds: float = 0.5

    # ── Host Agent 安全边界 ──
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

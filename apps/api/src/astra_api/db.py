from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from astra_api.config import ensure_sqlite_parent, settings

ensure_sqlite_parent()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    migrate_sqlite_user_columns()
    migrate_sqlite_session_model_overrides()
    migrate_sqlite_agentic_orchestration_columns()


def migrate_sqlite_user_columns() -> None:
    """SQLite create_all will not add columns to existing tables, so patch user_id in place."""

    if not settings.database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    for table_name in ("project", "discussionsession", "task"):
        if table_name not in table_names:
            continue
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if "user_id" in columns:
            continue
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN user_id VARCHAR"))
            connection.execute(text(f"CREATE INDEX IF NOT EXISTS ix_{table_name}_user_id ON {table_name} (user_id)"))


def migrate_sqlite_session_model_overrides() -> None:
    """Keep existing local SQLite databases compatible with the new session JSON column."""

    if not settings.database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "discussionsession" not in table_names:
        return
    columns = {column["name"] for column in inspector.get_columns("discussionsession")}
    if "model_overrides" in columns:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE discussionsession ADD COLUMN model_overrides JSON DEFAULT '{}'"))


def migrate_sqlite_agentic_orchestration_columns() -> None:
    """Add nullable JSON/text columns introduced by Host Agent orchestration."""

    if not settings.database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    migrations = {
        "scenariotemplate": {
            "host_hints": "ALTER TABLE scenariotemplate ADD COLUMN host_hints VARCHAR DEFAULT ''",
            "parallel_groups": "ALTER TABLE scenariotemplate ADD COLUMN parallel_groups JSON DEFAULT '[]'",
        },
        "sessionresult": {
            "actual_flow": "ALTER TABLE sessionresult ADD COLUMN actual_flow JSON DEFAULT '[]'",
            "skipped_stages": "ALTER TABLE sessionresult ADD COLUMN skipped_stages JSON DEFAULT '[]'",
            "added_stages": "ALTER TABLE sessionresult ADD COLUMN added_stages JSON DEFAULT '[]'",
        },
    }
    for table_name, statements in migrations.items():
        if table_name not in table_names:
            continue
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        with engine.begin() as connection:
            for column_name, statement in statements.items():
                if column_name not in columns:
                    connection.execute(text(statement))


def get_session() -> Generator[Session, None, None]:
    with Session(engine, expire_on_commit=False) as session:
        yield session

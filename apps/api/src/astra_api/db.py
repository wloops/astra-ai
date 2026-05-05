from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from astra_api.config import ensure_sqlite_parent, settings

ensure_sqlite_parent()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine, expire_on_commit=False) as session:
        yield session

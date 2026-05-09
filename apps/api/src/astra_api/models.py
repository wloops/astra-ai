from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, Column, LargeBinary, UniqueConstraint
from sqlmodel import Field, SQLModel


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def utc_now() -> datetime:
    return datetime.now(UTC)


class SessionStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class EventType(StrEnum):
    SESSION_STARTED = "session_started"
    STAGE_STARTED = "stage_started"
    AGENT_MESSAGE = "agent_message"
    AGENT_MESSAGE_DELTA = "agent_message_delta"
    AGENT_MESSAGE_DONE = "agent_message_done"
    CONFLICT_DETECTED = "conflict_detected"
    TOOL_EVENT = "tool_event"
    STAGE_COMPLETED = "stage_completed"
    HOST_DECISION = "host_decision"
    STAGE_SKIPPED = "stage_skipped"
    STAGE_ADDED = "stage_added"
    ROLE_PULLED = "role_pulled"
    ROLE_REMOVED = "role_removed"
    PARALLEL_START = "parallel_start"
    PARALLEL_COMPLETE = "parallel_complete"
    KNOWLEDGE_REFERENCED = "knowledge_referenced"
    SESSION_COMPLETED = "session_completed"
    SESSION_FAILED = "session_failed"


class TaskStatus(StrEnum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    DONE = "done"
    CANCELLED = "cancelled"


class TaskPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class User(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("user"), primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=utc_now)
    last_login_at: datetime | None = None


class ProjectBase(SQLModel):
    name: str
    description: str = ""
    goal: str = ""
    background: str = ""
    architecture: str = ""
    progress: str = ""
    risks: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    constraints: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    references: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    completeness: int = 0
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))


class Project(ProjectBase, table=True):
    id: str = Field(default_factory=lambda: new_id("proj"), primary_key=True)
    user_id: str | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class AgentRoleBase(SQLModel):
    name: str
    code: str = Field(index=True, unique=True)
    description: str = ""
    responsibilities: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    focus_areas: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    tools: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    output_style: str = ""
    is_default: bool = False
    can_debate: bool = True
    can_use_tools: bool = False


class AgentRole(AgentRoleBase, table=True):
    id: str = Field(default_factory=lambda: new_id("role"), primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ScenarioTemplateBase(SQLModel):
    name: str
    code: str = Field(index=True, unique=True)
    description: str = ""
    stages: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    host_hints: str = ""
    parallel_groups: list[list[str]] = Field(default_factory=list, sa_column=Column(JSON))
    default_role_codes: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    output_schema: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    recommended_tools: list[str] = Field(default_factory=list, sa_column=Column(JSON))


class ScenarioTemplate(ScenarioTemplateBase, table=True):
    id: str = Field(default_factory=lambda: new_id("scenario"), primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class DiscussionSessionBase(SQLModel):
    project_id: str = Field(index=True)
    scenario_id: str = Field(index=True)
    topic: str
    role_ids: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    supplemental_notes: str = ""
    model_overrides: dict[str, str] = Field(default_factory=dict, sa_column=Column(JSON))


class DiscussionSession(DiscussionSessionBase, table=True):
    id: str = Field(default_factory=lambda: new_id("session"), primary_key=True)
    user_id: str | None = Field(default=None, index=True)
    status: SessionStatus = Field(default=SessionStatus.PENDING, index=True)
    current_stage: str = ""
    error_message: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None


class SessionEvent(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("event"), primary_key=True)
    session_id: str = Field(index=True)
    sequence: int = Field(index=True)
    type: EventType = Field(index=True)
    stage: str | None = None
    role_code: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)


class SessionResult(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("result"), primary_key=True)
    session_id: str = Field(index=True, unique=True)
    final_conclusion: str
    key_conflicts: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    role_summaries: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    risks: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    open_questions: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    actions: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    actual_flow: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    skipped_stages: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    added_stages: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    markdown_minutes: str
    created_at: datetime = Field(default_factory=utc_now)


class KnowledgeEntry(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("source_session_id", name="uq_knowledgeentry_source_session_id"),)

    id: str = Field(default_factory=lambda: new_id("kb"), primary_key=True)
    source_session_id: str = Field(index=True)
    project_id: str = Field(index=True)
    user_id: str = Field(index=True)
    scenario_code: str = Field(index=True)
    topic: str = Field(index=True)
    conclusion: str
    key_conflicts: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    role_summaries: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    risks: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    actions: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    search_text: str
    embedding: bytes | None = Field(default=None, sa_column=Column(LargeBinary, nullable=True))
    reference_count: int = 0
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class TaskBase(SQLModel):
    project_id: str = Field(index=True)
    source_session_id: str | None = Field(default=None, index=True)
    title: str
    description: str = ""
    status: TaskStatus = Field(default=TaskStatus.TODO, index=True)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, index=True)
    assignee_role_code: str | None = Field(default=None, index=True)
    due_date: datetime | None = None
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))


class Task(TaskBase, table=True):
    id: str = Field(default_factory=lambda: new_id("task"), primary_key=True)
    user_id: str | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None

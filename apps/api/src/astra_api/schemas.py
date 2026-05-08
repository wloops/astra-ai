from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from astra_api.models import EventType, SessionStatus, TaskPriority, TaskStatus

T = TypeVar("T")


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    goal: str = ""
    background: str = ""
    architecture: str = ""
    progress: str = ""
    risks: list[str] = []
    constraints: list[str] = []
    references: list[dict[str, Any]] = []
    completeness: int = 0
    tags: list[str] = []


class ProjectRead(ProjectCreate):
    id: str
    user_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentRoleCreate(BaseModel):
    name: str
    code: str
    description: str = ""
    responsibilities: list[str] = []
    focus_areas: list[str] = []
    tools: list[str] = []
    output_style: str = ""
    is_default: bool = False
    can_debate: bool = True
    can_use_tools: bool = False


class AgentRoleRead(AgentRoleCreate):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScenarioTemplateCreate(BaseModel):
    name: str
    code: str
    description: str = ""
    stages: list[str] = []
    host_hints: str = ""
    parallel_groups: list[list[str]] = []
    default_role_codes: list[str] = []
    output_schema: list[str] = []
    recommended_tools: list[str] = []


class ScenarioTemplateRead(ScenarioTemplateCreate):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionCreate(BaseModel):
    project_id: str
    scenario_id: str
    topic: str
    role_ids: list[str] = []
    supplemental_notes: str = ""
    model_overrides: dict[str, str] = Field(default_factory=dict)


class ModelProfile(BaseModel):
    name: str
    model: str
    base_url: str | None = None


class ModelTestRequest(BaseModel):
    profile_name: str


class ModelTestResult(BaseModel):
    profile_name: str
    status: str
    latency_ms: int | None = None
    error: str | None = None


class SessionEventRead(BaseModel):
    id: str
    session_id: str
    sequence: int
    type: EventType
    stage: str | None
    role_code: str | None
    payload: dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    offset: int
    limit: int


class SessionMetrics(BaseModel):
    conclusion_convergence: float
    conclusion_label: str
    context_sufficiency: float
    context_label: str
    risk_coverage: float
    risk_label: str


class HostDecision(BaseModel):
    action: str
    reason: str = ""
    stage: str | None = None
    stage_name: str | None = None
    stage_prompt: str | None = None
    role_code: str | None = None
    role_name: str | None = None
    role_responsibility: str | None = None
    roles: list[str] = Field(default_factory=list)
    model_used: str | None = None


class SkippedStage(BaseModel):
    stage: str
    reason: str = ""


class AddedStage(BaseModel):
    stage: str
    reason: str = ""
    stage_prompt: str = ""


class SessionRead(BaseModel):
    id: str
    user_id: str | None = None
    project_id: str
    scenario_id: str
    topic: str
    role_ids: list[str]
    supplemental_notes: str
    model_overrides: dict[str, str]
    status: SessionStatus
    current_stage: str
    error_message: str | None
    metrics: SessionMetrics | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SessionResultRead(BaseModel):
    id: str
    session_id: str
    final_conclusion: str
    key_conflicts: list[dict[str, Any]]
    role_summaries: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    open_questions: list[str]
    actions: list[dict[str, Any]]
    actual_flow: list[str] = []
    skipped_stages: list[dict[str, Any]] = []
    added_stages: list[dict[str, Any]] = []
    markdown_minutes: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KnowledgeEntryCreate(BaseModel):
    source_session_id: str
    project_id: str
    user_id: str
    scenario_code: str
    topic: str
    conclusion: str
    key_conflicts: list[dict[str, Any]] = Field(default_factory=list)
    role_summaries: list[dict[str, Any]] = Field(default_factory=list)
    risks: list[dict[str, Any]] = Field(default_factory=list)
    actions: list[dict[str, Any]] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    search_text: str


class KnowledgeEntryRead(BaseModel):
    id: str
    source_session_id: str
    project_id: str
    user_id: str
    scenario_code: str
    topic: str
    conclusion: str
    key_conflicts: list[dict[str, Any]]
    role_summaries: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    actions: list[dict[str, Any]]
    tags: list[str]
    reference_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KnowledgeSearchResult(BaseModel):
    entry: KnowledgeEntryRead
    similarity_score: float | None = None


class KnowledgeReference(BaseModel):
    entry_id: str
    topic: str
    conclusion: str
    similarity_score: float | None = None


class KnowledgeGraphNode(BaseModel):
    id: str
    topic: str
    project_id: str
    project: str
    scenario: str
    reference_count: int
    created_at: datetime


class KnowledgeGraphEdge(BaseModel):
    source: str
    target: str
    type: str
    weight: float


class KnowledgeGraphData(BaseModel):
    nodes: list[KnowledgeGraphNode]
    edges: list[KnowledgeGraphEdge]


class TaskCreate(BaseModel):
    project_id: str
    source_session_id: str | None = None
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    assignee_role_code: str | None = None
    due_date: datetime | None = None
    tags: list[str] = []


class TaskUpdate(BaseModel):
    project_id: str | None = None
    source_session_id: str | None = None
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_role_code: str | None = None
    due_date: datetime | None = None
    tags: list[str] | None = None


class TaskRead(BaseModel):
    id: str
    user_id: str | None
    project_id: str
    source_session_id: str | None
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    assignee_role_code: str | None
    due_date: datetime | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class PromoteRequest(BaseModel):
    action_indices: list[int] | None = None


class PromoteResponse(BaseModel):
    created: int
    skipped: int
    tasks: list[TaskRead]
    skipped_actions: list[dict[str, Any]] = []


class UserCreate(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class UserRead(BaseModel):
    id: str
    username: str
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

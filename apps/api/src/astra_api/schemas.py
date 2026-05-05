from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from astra_api.models import EventType, SessionStatus


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


class SessionRead(BaseModel):
    id: str
    project_id: str
    scenario_id: str
    topic: str
    role_ids: list[str]
    supplemental_notes: str
    status: SessionStatus
    current_stage: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


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


class SessionResultRead(BaseModel):
    id: str
    session_id: str
    final_conclusion: str
    key_conflicts: list[dict[str, Any]]
    role_summaries: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    open_questions: list[str]
    actions: list[dict[str, Any]]
    markdown_minutes: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

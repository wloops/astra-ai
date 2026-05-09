export type SessionStatus = "pending" | "running" | "completed" | "failed" | "paused";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "blocked" | "done" | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type SessionEventType =
  | "session_started"
  | "stage_started"
  | "agent_message"
  | "agent_message_delta"
  | "agent_message_done"
  | "conflict_detected"
  | "debate_started"
  | "debate_round"
  | "debate_moderated"
  | "debate_completed"
  | "tool_event"
  | "stage_completed"
  | "host_decision"
  | "stage_skipped"
  | "stage_added"
  | "role_pulled"
  | "role_removed"
  | "parallel_start"
  | "parallel_complete"
  | "knowledge_referenced"
  | "human_review_requested"
  | "human_review_resolved"
  | "human_review_timeout"
  | "session_completed"
  | "session_failed";

export interface Project {
  id: string;
  name: string;
  description: string;
  goal: string;
  background: string;
  architecture: string;
  progress: string;
  risks: string[];
  constraints: string[];
  references: Record<string, unknown>[];
  completeness: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentRole {
  id: string;
  name: string;
  code: string;
  description: string;
  responsibilities: string[];
  focus_areas: string[];
  tools: string[];
  output_style: string;
  is_default: boolean;
  can_debate: boolean;
  can_use_tools: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  code: string;
  description: string;
  stages: string[];
  host_hints: string;
  parallel_groups: string[][];
  default_role_codes: string[];
  output_schema: string[];
  recommended_tools: string[];
  created_at: string;
  updated_at: string;
}

export interface SessionCreatePayload {
  project_id: string;
  scenario_id: string;
  topic: string;
  role_ids?: string[];
  supplemental_notes?: string;
  model_overrides?: Record<string, string>;
}

export interface ModelProfile {
  name: string;
  model: string;
  base_url: string | null;
}

export interface ModelTestResult {
  profile_name: string;
  status: "ok" | "error";
  latency_ms?: number | null;
  error?: string | null;
}

export interface SessionEvent {
  id: string;
  session_id: string;
  sequence: number;
  type: SessionEventType;
  stage: string | null;
  role_code: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export type HumanReviewStatus = "pending" | "resolved" | "timed_out";
export type HumanReviewTimeoutBehavior = "mark_open_question" | "use_default" | "abort_if_blocking";

export interface HumanReviewRequest {
  id: string;
  session_id: string;
  question: string;
  reason: string;
  blocking_level: "low" | "medium" | "high" | "critical" | string;
  options: string[];
  status: HumanReviewStatus;
  response?: Record<string, unknown> | null;
  default_on_timeout: HumanReviewTimeoutBehavior;
  default_answer?: string;
  impact: string;
  requested_at: string;
  expires_at?: string | null;
  resolved_at?: string | null;
}

export interface HumanReviewResponsePayload {
  answer: string;
  selected_option?: string | null;
  notes?: string;
}

export interface HostDecision {
  action: "NEXT_STAGE" | "SKIP_STAGE" | "ADD_STAGE" | "SEARCH_KNOWLEDGE" | "REQUEST_HUMAN_REVIEW" | "PULL_ROLE" | "REMOVE_ROLE" | "PARALLEL_RUN" | "CONCLUDE";
  reason: string;
  question?: string | null;
  blocking_level?: string | null;
  options?: string[];
  default_on_timeout?: HumanReviewTimeoutBehavior | null;
  default_answer?: string | null;
  timeout_seconds?: number | null;
  impact?: string | null;
  query?: string | null;
  stage?: string | null;
  stage_name?: string | null;
  stage_prompt?: string | null;
  role_code?: string | null;
  role_name?: string | null;
  role_responsibility?: string | null;
  roles?: string[];
  phase?: "initial_planning" | "runtime";
  selected_role_codes?: string[];
  role_reasons?: Record<string, string>;
  model_used?: string | null;
}

export interface SkippedStage {
  stage: string;
  reason: string;
}

export interface AddedStage {
  stage: string;
  reason: string;
  stage_prompt?: string;
}

export interface SessionResult {
  id: string;
  session_id: string;
  final_conclusion: string;
  key_conflicts: Record<string, unknown>[];
  role_summaries: Record<string, unknown>[];
  risks: Record<string, unknown>[];
  open_questions: (string | Record<string, unknown>)[];
  actions: Record<string, unknown>[];
  actual_flow?: string[];
  skipped_stages?: SkippedStage[];
  added_stages?: AddedStage[];
  debate_trace?: Record<string, unknown>[];
  markdown_minutes: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  source_session_id: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_role_code: string | null;
  due_date: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskCreatePayload {
  project_id: string;
  source_session_id?: string | null;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_role_code?: string | null;
  due_date?: string | null;
  tags?: string[];
}

export type TaskUpdatePayload = Partial<Omit<TaskCreatePayload, "project_id">> & {
  project_id?: string;
};

export interface PromoteResponse {
  created: number;
  skipped: number;
  tasks: Task[];
  skipped_actions: Record<string, unknown>[];
}

export interface KnowledgeEntry {
  id: string;
  source_session_id: string;
  project_id: string;
  user_id: string;
  scenario_code: string;
  topic: string;
  conclusion: string;
  key_conflicts: Record<string, unknown>[];
  role_summaries: Record<string, unknown>[];
  risks: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  tags: string[];
  reference_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  similarity_score: number | null;
}

export interface KnowledgeReference {
  entry_id: string;
  source_session_id?: string;
  topic: string;
  conclusion: string;
  key_conflicts?: Record<string, unknown>[];
  similarity_score: number | null;
}

export interface KnowledgeGraphNode {
  id: string;
  topic: string;
  project_id: string;
  project: string;
  scenario: string;
  reference_count: number;
  created_at: string;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  type: "SAME_PROJECT" | "SEMANTIC_SIMILAR" | "EXPLICIT_REFERENCE" | string;
  weight: number;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface User {
  id: string;
  username: string;
  created_at: string;
  last_login_at: string | null;
}

export interface AuthPayload {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface SessionMetrics {
  conclusion_convergence: number;
  conclusion_label: string;
  context_sufficiency: number;
  context_label: string;
  risk_coverage: number;
  risk_label: string;
}

export interface DiscussionSession {
  id: string;
  project_id: string;
  scenario_id: string;
  topic: string;
  role_ids: string[];
  supplemental_notes: string;
  model_overrides: Record<string, string>;
  status: SessionStatus;
  current_stage: string;
  error_message: string | null;
  metrics?: SessionMetrics | null;
  pending_human_review?: HumanReviewRequest | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

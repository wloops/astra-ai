import type {
  AgentRole,
  AuthPayload,
  DiscussionSession,
  PaginatedResponse,
  Project,
  ScenarioTemplate,
  SessionCreatePayload,
  SessionResult,
  PromoteResponse,
  Task,
  TaskCreatePayload,
  TaskPriority,
  TaskStatus,
  TaskUpdatePayload,
  TokenResponse,
  User,
} from "./types";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8010").replace(/\/$/, "");
export const API_KEY = (import.meta.env.VITE_API_KEY ?? "").trim();
export const AUTH_TOKEN_KEY = "astra_auth_token";

export function getAuthToken(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (API_KEY) {
    headers.set("X-API-Key", API_KEY);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    // 后端错误体可能是 FastAPI JSON，也可能是代理返回的文本；保留原文便于前端展示。
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  // Auth
  register: (payload: AuthPayload) =>
    request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: AuthPayload) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Projects
  listProjects: (offset = 0, limit = 50) =>
    request<PaginatedResponse<Project>>(`/projects?offset=${offset}&limit=${limit}`),
  createProject: (payload: Partial<Project>) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateProject: (id: string, payload: Partial<Project>) =>
    request<Project>(`/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteProject: (id: string) =>
    request<{ status: string; id: string }>(`/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // Agent Roles
  listAgentRoles: (offset = 0, limit = 50) =>
    request<PaginatedResponse<AgentRole>>(`/agent-roles?offset=${offset}&limit=${limit}`),
  createAgentRole: (payload: Partial<AgentRole>) =>
    request<AgentRole>("/agent-roles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAgentRole: (id: string, payload: Partial<AgentRole>) =>
    request<AgentRole>(`/agent-roles/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteAgentRole: (id: string) =>
    request<{ status: string; id: string }>(`/agent-roles/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // Scenario Templates
  listScenarioTemplates: (offset = 0, limit = 50) =>
    request<PaginatedResponse<ScenarioTemplate>>(`/scenario-templates?offset=${offset}&limit=${limit}`),
  createScenarioTemplate: (payload: Partial<ScenarioTemplate>) =>
    request<ScenarioTemplate>("/scenario-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateScenarioTemplate: (id: string, payload: Partial<ScenarioTemplate>) =>
    request<ScenarioTemplate>(`/scenario-templates/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteScenarioTemplate: (id: string) =>
    request<{ status: string; id: string }>(`/scenario-templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // Sessions
  listSessions: (offset = 0, limit = 50) =>
    request<PaginatedResponse<DiscussionSession>>(`/sessions?offset=${offset}&limit=${limit}`),
  createSession: (payload: SessionCreatePayload) =>
    request<DiscussionSession>("/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSession: (sessionId: string) => request<DiscussionSession>(`/sessions/${encodeURIComponent(sessionId)}`),
  getSessionResult: (sessionId: string) =>
    request<SessionResult>(`/sessions/${encodeURIComponent(sessionId)}/result`),
  deleteSession: (id: string) =>
    request<{ status: string; id: string }>(`/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // Tasks
  listTasks: (params: { offset?: number; limit?: number; project_id?: string; status?: TaskStatus; priority?: TaskPriority } = {}) => {
    const search = new URLSearchParams();
    search.set("offset", String(params.offset ?? 0));
    search.set("limit", String(params.limit ?? 50));
    if (params.project_id) search.set("project_id", params.project_id);
    if (params.status) search.set("status", params.status);
    if (params.priority) search.set("priority", params.priority);
    return request<PaginatedResponse<Task>>(`/tasks?${search.toString()}`);
  },
  getTask: (id: string) => request<Task>(`/tasks/${encodeURIComponent(id)}`),
  createTask: (payload: TaskCreatePayload) =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTask: (id: string, payload: TaskUpdatePayload) =>
    request<Task>(`/tasks/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteTask: (id: string) =>
    request<{ status: string; id: string }>(`/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  promoteActions: (sessionId: string, actionIndices?: number[]) =>
    request<PromoteResponse>(`/sessions/${encodeURIComponent(sessionId)}/promote-actions`, {
      method: "POST",
      body: JSON.stringify(actionIndices ? { action_indices: actionIndices } : {}),
    }),
};

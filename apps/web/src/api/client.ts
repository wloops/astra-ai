import type {
  AgentRole,
  DiscussionSession,
  PaginatedResponse,
  Project,
  ScenarioTemplate,
  SessionCreatePayload,
  SessionResult,
} from "./types";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8010").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    // 后端错误体可能是 FastAPI JSON，也可能是代理返回的文本；保留原文便于前端展示。
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
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
};

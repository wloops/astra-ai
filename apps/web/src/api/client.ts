import type {
  AgentRole,
  DiscussionSession,
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
  listProjects: () => request<Project[]>("/projects"),
  listAgentRoles: () => request<AgentRole[]>("/agent-roles"),
  listScenarioTemplates: () => request<ScenarioTemplate[]>("/scenario-templates"),
  createSession: (payload: SessionCreatePayload) =>
    request<DiscussionSession>("/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSession: (sessionId: string) => request<DiscussionSession>(`/sessions/${encodeURIComponent(sessionId)}`),
  getSessionResult: (sessionId: string) =>
    request<SessionResult>(`/sessions/${encodeURIComponent(sessionId)}/result`),
};

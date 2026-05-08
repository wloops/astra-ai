import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient, API_BASE_URL } from "./client";

describe("apiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listProjects returns paginated data", async () => {
    const mockData = { items: [{ id: "1", name: "测试项目" }], total: 1, offset: 0, limit: 50 };
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await apiClient.listProjects();
    expect(result).toEqual(mockData);
    expect(result.items).toHaveLength(1);
  });

  it("listProjects passes offset and limit", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0, offset: 10, limit: 20 }),
    } as Response);

    await apiClient.listProjects(10, 20);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/projects?offset=10&limit=20`,
      expect.any(Object),
    );
  });

  it("deleteProject sends DELETE request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "deleted", id: "proj_1" }),
    } as Response);

    const result = await apiClient.deleteProject("proj_1");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/projects/proj_1`,
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result.status).toBe("deleted");
  });

  it("deleteAgentRole sends DELETE request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "deleted", id: "role_1" }),
    } as Response);

    await apiClient.deleteAgentRole("role_1");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/agent-roles/role_1`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("deleteSession sends DELETE request", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "deleted", id: "session_1" }),
    } as Response);

    const result = await apiClient.deleteSession("session_1");
    expect(result.status).toBe("deleted");
  });

  it("createSession sends correct payload", async () => {
    const mockSession = { id: "session_1", topic: "测试", status: "pending" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSession),
    } as Response);

    const payload = { project_id: "p1", scenario_id: "s1", topic: "测试" };
    const result = await apiClient.createSession(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/sessions`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    expect(result).toEqual(mockSession);
  });

  it("listTasks passes filters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0, offset: 0, limit: 25 }),
    } as Response);

    await apiClient.listTasks({ limit: 25, project_id: "proj_1", status: "in_progress", priority: "high" });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/tasks?offset=0&limit=25&project_id=proj_1&status=in_progress&priority=high`,
      expect.any(Object),
    );
  });

  it("createTask sends task payload", async () => {
    const payload = { project_id: "proj_1", title: "测试任务", priority: "medium" as const };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "task_1", ...payload }),
    } as Response);

    await apiClient.createTask(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/tasks`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("updateTask, deleteTask and promoteActions call expected endpoints", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "deleted", id: "task_1", created: 1, skipped: 0, tasks: [] }),
    } as Response);

    await apiClient.updateTask("task_1", { status: "done" });
    await apiClient.deleteTask("task_1");
    await apiClient.promoteActions("session_1", [0, 2]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/tasks/task_1`,
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ status: "done" }) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/tasks/task_1`,
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${API_BASE_URL}/sessions/session_1/promote-actions`,
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action_indices: [0, 2] }) }),
    );
  });

  it("throws on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Server Error"),
    } as Response);

    await expect(apiClient.listProjects()).rejects.toThrow("Server Error");
  });
});

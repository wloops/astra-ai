import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient, API_BASE_URL } from "./client";

describe("apiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listProjects returns parsed data", async () => {
    const mockData = [{ id: "1", name: "测试项目" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await apiClient.listProjects();
    expect(result).toEqual(mockData);
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

  it("throws on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Server Error"),
    } as Response);

    await expect(apiClient.listProjects()).rejects.toThrow("Server Error");
  });
});

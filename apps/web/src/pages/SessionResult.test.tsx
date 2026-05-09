import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SessionResult } from "./SessionResult";
import { apiClient } from "../api/client";

vi.mock("../components/dashboard/Navbar", () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

vi.mock("../components/tasks/PromoteDialog", () => ({
  PromoteDialog: () => null,
}));

vi.mock("../api/client", () => ({
  apiClient: {
    getSessionResult: vi.fn().mockResolvedValue({
      id: "result_1",
      session_id: "session_1",
      final_conclusion: "允许在严格风控下试点自动结算。",
      key_conflicts: [],
      role_summaries: [],
      risks: [],
      open_questions: [
        "旧版字符串问题",
        {
          question: "30元阈值按含税还是未税计算？",
          source: "human_review_timeout",
          blocking_level: "medium",
          impact: "影响自动结算规则",
          status: "unresolved",
        },
      ],
      actions: [
        {
          title: "补齐阈值配置",
          owner: "product_manager",
          priority: "high",
          status: "todo",
          blocked_by_open_question: true,
        },
      ],
      actual_flow: [],
      skipped_stages: [],
      added_stages: [],
      markdown_minutes: "# Minutes",
      created_at: "2026-05-09T00:00:00Z",
    }),
    getSession: vi.fn().mockResolvedValue({
      id: "session_1",
      scenario_id: "scenario_1",
    }),
    listScenarioTemplates: vi.fn().mockResolvedValue({
      items: [{ id: "scenario_1", stages: [] }],
    }),
    promoteActions: vi.fn(),
  },
}));

describe("SessionResult human review output", () => {
  it("renders legacy and structured open questions with action dependency hints", async () => {
    render(
      <MemoryRouter initialEntries={["/session-result?sessionId=session_1"]}>
        <Routes>
          <Route path="/session-result" element={<SessionResult />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("旧版字符串问题")).toBeInTheDocument());
    expect(screen.getByText("30元阈值按含税还是未税计算？")).toBeInTheDocument();
    expect(screen.getByText(/human_review_timeout/)).toBeInTheDocument();
    expect(screen.getByText("依赖待确认问题")).toBeInTheDocument();
    expect(screen.queryByText("关键辩论追溯")).not.toBeInTheDocument();
  });

  it("renders debate trace when the result includes debate data", async () => {
    vi.mocked(apiClient.getSessionResult).mockResolvedValueOnce({
      id: "result_2",
      session_id: "session_1",
      final_conclusion: "Guarded MVP",
      key_conflicts: [],
      role_summaries: [],
      risks: [],
      open_questions: [],
      actions: [],
      actual_flow: [],
      skipped_stages: [],
      added_stages: [],
      debate_trace: [
        {
          speaker_role_code: "product_manager",
          stance: "support",
          claim: "Start with limited rollout",
          judgement: "Converge on a guarded MVP",
          key_divergences: ["rollback"],
          converged_conclusions: ["bounded scope"],
        },
      ],
      markdown_minutes: "# Minutes",
      created_at: "2026-05-09T00:00:00Z",
    });

    render(
      <MemoryRouter initialEntries={["/session-result?sessionId=session_1"]}>
        <Routes>
          <Route path="/session-result" element={<SessionResult />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("关键辩论追溯")).toBeInTheDocument());
    expect(screen.getByText(/Start with limited rollout/)).toBeInTheDocument();
    expect(screen.getByText(/Converge on a guarded MVP/)).toBeInTheDocument();
  });
});

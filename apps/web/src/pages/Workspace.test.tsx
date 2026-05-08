import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Workspace } from "./Workspace";

vi.mock("../components/dashboard/Navbar", () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

vi.mock("../api/client", () => ({
  apiClient: {
    getSession: vi.fn().mockResolvedValue({
      id: "session_1",
      project_id: "project_1",
      scenario_id: "scenario_1",
      topic: "Agentic orchestration",
      role_ids: ["role_host", "role_pm"],
      supplemental_notes: "",
      model_overrides: {},
      status: "running",
      current_stage: "",
      error_message: null,
      created_at: "2026-05-08T00:00:00Z",
      updated_at: "2026-05-08T00:00:00Z",
      completed_at: null,
    }),
    listProjects: vi.fn().mockResolvedValue({
      items: [{ id: "project_1", name: "Project", tags: [], description: "Demo" }],
      total: 1,
      offset: 0,
      limit: 50,
    }),
    listScenarioTemplates: vi.fn().mockResolvedValue({
      items: [{
        id: "scenario_1",
        name: "Scenario",
        stages: ["clarify_topic"],
        default_role_codes: ["host", "product_manager"],
      }],
      total: 1,
      offset: 0,
      limit: 50,
    }),
    listAgentRoles: vi.fn().mockResolvedValue({
      items: [
        { id: "role_host", code: "host", name: "Host", description: "Host" },
        { id: "role_pm", code: "product_manager", name: "PM", description: "Product" },
        { id: "role_qa", code: "qa_engineer", name: "QA Engineer", description: "Quality" },
      ],
      total: 3,
      offset: 0,
      limit: 50,
    }),
  },
}));

vi.mock("../api/events", () => ({
  subscribeToSessionEvents: vi.fn((_sessionId, callbacks) => {
    queueMicrotask(() => {
      callbacks.onEvent({
        id: "event_1",
        session_id: "session_1",
        sequence: 1,
        type: "host_decision",
        stage: "risk_review",
        role_code: null,
        payload: { action: "ADD_STAGE", reason: "需要补充风险评审", stage_name: "risk_review" },
        created_at: "2026-05-08T00:00:01Z",
      });
      callbacks.onEvent({
        id: "event_2",
        session_id: "session_1",
        sequence: 2,
        type: "stage_added",
        stage: "risk_review",
        role_code: null,
        payload: { reason: "需要补充风险评审" },
        created_at: "2026-05-08T00:00:02Z",
      });
      callbacks.onEvent({
        id: "event_3",
        session_id: "session_1",
        sequence: 3,
        type: "role_pulled",
        stage: null,
        role_code: "qa_engineer",
        payload: { phase: "initial_planning", role_code: "qa_engineer" },
        created_at: "2026-05-08T00:00:03Z",
      });
    });
    return { close: vi.fn() };
  }),
}));

describe("Workspace agentic orchestration events", () => {
  it("keeps host decisions in stage progress and renders pulled roles", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace?sessionId=session_1"]}>
        <Routes>
          <Route path="/workspace" element={<Workspace />} />
        </Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText("需要补充风险评审")).length).toBeGreaterThan(0);
    expect(screen.queryByText("主持决策")).not.toBeInTheDocument();
    expect(screen.getAllByText("risk_review").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByText("QA Engineer")).toBeInTheDocument());
  });
});

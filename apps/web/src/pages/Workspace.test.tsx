import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Workspace } from "./Workspace";
import { apiClient } from "../api/client";

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
    respondHumanReview: vi.fn().mockResolvedValue({
      id: "review_1",
      status: "resolved",
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
        id: "event_2a",
        session_id: "session_1",
        sequence: 2.1,
        type: "stage_skipped",
        stage: "risk_review",
        role_code: null,
        payload: { reason: "No additional risk review needed" },
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
      callbacks.onEvent({
        id: "event_4",
        session_id: "session_1",
        sequence: 4,
        type: "agent_message_delta",
        stage: "clarify_topic",
        role_code: "host",
        payload: { message_id: "msg_1", delta: "Hello ", role_code: "host", stage: "clarify_topic", model_used: "test-model" },
        created_at: "2026-05-08T00:00:04Z",
      });
      callbacks.onEvent({
        id: "event_5",
        session_id: "session_1",
        sequence: 5,
        type: "agent_message_delta",
        stage: "clarify_topic",
        role_code: "host",
        payload: { message_id: "msg_1", delta: "streaming", role_code: "host", stage: "clarify_topic", model_used: "test-model" },
        created_at: "2026-05-08T00:00:05Z",
      });
      callbacks.onEvent({
        id: "event_6",
        session_id: "session_1",
        sequence: 6,
        type: "agent_message_done",
        stage: "clarify_topic",
        role_code: "host",
        payload: { message_id: "msg_1", content: "Hello streaming", role_code: "host", stage: "clarify_topic", model_used: "test-model" },
        created_at: "2026-05-08T00:00:06Z",
      });
      callbacks.onEvent({
        id: "event_7",
        session_id: "session_1",
        sequence: 7,
        type: "agent_message",
        stage: "clarify_topic",
        role_code: "host",
        payload: { message_id: "msg_1", summary: "Hello streaming", model_used: "test-model" },
        created_at: "2026-05-08T00:00:07Z",
      });
      callbacks.onEvent({
        id: "event_8",
        session_id: "session_1",
        sequence: 8,
        type: "parallel_start",
        stage: "independent_review",
        role_code: null,
        payload: { roles: ["product_manager", "qa_engineer"] },
        created_at: "2026-05-08T00:00:08Z",
      });
      callbacks.onEvent({
        id: "event_9",
        session_id: "session_1",
        sequence: 9,
        type: "agent_message",
        stage: "independent_review",
        role_code: "product_manager",
        payload: { summary: "Parallel complete", model_used: "test-model" },
        created_at: "2026-05-08T00:00:09Z",
      });
      callbacks.onEvent({
        id: "event_10",
        session_id: "session_1",
        sequence: 10,
        type: "stage_started",
        stage: "judge_and_summarize",
        role_code: "host",
        payload: {},
        created_at: "2026-05-08T00:00:10Z",
      });
      callbacks.onEvent({
        id: "event_10a",
        session_id: "session_1",
        sequence: 10.1,
        type: "debate_started",
        stage: "debate",
        role_code: "host",
        payload: { participants: ["product_manager", "qa_engineer"], conflict_focus: ["scope vs risk"], planned_rounds: 1 },
        created_at: "2026-05-08T00:00:10Z",
      });
      callbacks.onEvent({
        id: "event_10b",
        session_id: "session_1",
        sequence: 10.2,
        type: "debate_round",
        stage: "debate",
        role_code: "product_manager",
        payload: {
          round_index: 1,
          speaker_role_code: "product_manager",
          responds_to_role_code: "qa_engineer",
          stance: "support",
          claim: "Start with limited rollout",
          evidence: "manual process is slow",
          risk: "scope creep",
          model_used: "test-model",
        },
        created_at: "2026-05-08T00:00:10Z",
      });
      callbacks.onEvent({
        id: "event_10c",
        session_id: "session_1",
        sequence: 10.3,
        type: "debate_moderated",
        stage: "debate",
        role_code: "host",
        payload: { judgement: "Converge on a guarded MVP", consensus: ["bounded scope"], unresolved_conflicts: ["rollback"], next_action: "conclude" },
        created_at: "2026-05-08T00:00:10Z",
      });
      callbacks.onEvent({
        id: "event_10d",
        session_id: "session_1",
        sequence: 10.4,
        type: "debate_completed",
        stage: "debate",
        role_code: "host",
        payload: { summary: "Debate supports a guarded MVP", key_divergences: ["rollback"], converged_conclusions: ["bounded scope"] },
        created_at: "2026-05-08T00:00:10Z",
      });
      callbacks.onEvent({
        id: "event_11",
        session_id: "session_1",
        sequence: 11,
        type: "human_review_requested",
        stage: "human_review",
        role_code: "host",
        payload: {
          id: "review_1",
          session_id: "session_1",
          question: "1. 30元阈值按含税还是未税计算？ 2. 是否排除纸质发票？",
          reason: "需要财务口径",
          blocking_level: "medium",
          options: ["1. 按含税金额计算；2. 排除纸质发票", "1. 按未税金额计算；2. 暂不排除纸质发票"],
          status: "pending",
          default_on_timeout: "mark_open_question",
          impact: "影响自动结算规则",
          requested_at: "2099-05-08T00:00:11Z",
          expires_at: "2099-05-08T00:02:11Z",
        },
        created_at: "2026-05-08T00:00:11Z",
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
    expect(screen.getAllByText("已跳过：No additional risk review needed").length).toBeGreaterThan(0);
    expect(screen.queryByText("主持决策")).not.toBeInTheDocument();
    expect(screen.getAllByText("risk_review").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByText("QA Engineer")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Hello streaming")).toBeInTheDocument());
    expect(screen.getAllByText("已发言").length).toBeGreaterThan(0);
    expect(screen.getAllByText("并行处理中").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hello streaming")).toHaveLength(1);
    expect(screen.getByText("Parallel complete")).toBeInTheDocument();
    expect(screen.getByText("交叉辩论过程")).toBeInTheDocument();
    expect(screen.getByText("Start with limited rollout")).toBeInTheDocument();
    expect(screen.getByText("Converge on a guarded MVP")).toBeInTheDocument();
    expect(screen.getByText("Debate supports a guarded MVP")).toBeInTheDocument();
    expect(screen.getByText("等待人工确认后继续研讨...")).toBeInTheDocument();
  });

  it("pauses auto-scroll when the user scrolls away from the bottom", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace?sessionId=session_1"]}>
        <Routes>
          <Route path="/workspace" element={<Workspace />} />
        </Routes>
      </MemoryRouter>,
    );

    const messageList = await screen.findByLabelText("Agent 发言列表");
    Object.defineProperty(messageList, "scrollHeight", { configurable: true, value: 1000 });
    Object.defineProperty(messageList, "clientHeight", { configurable: true, value: 300 });
    Object.defineProperty(messageList, "scrollTop", { configurable: true, writable: true, value: 200 });

    fireEvent.scroll(messageList);
    expect(screen.getByLabelText("滚动到底部")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("滚动到底部"));
    await waitFor(() => expect(screen.queryByLabelText("滚动到底部")).not.toBeInTheDocument());
  });

  it("renders and submits a human review prompt", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace?sessionId=session_1"]}>
        <Routes>
          <Route path="/workspace" element={<Workspace />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("30元阈值按含税还是未税计算？");
    expect(screen.getByText("是否排除纸质发票？")).toBeInTheDocument();
    expect(screen.getByText("剩余确认时间")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("填写第 1 项确认口径"), {
      target: { value: "按单张发票含税金额计算" },
    });
    fireEvent.change(screen.getByPlaceholderText("填写第 2 项确认口径"), {
      target: { value: "纸质发票先排除" },
    });
    fireEvent.click(screen.getByText("按含税金额计算；"));
    fireEvent.click(screen.getByText("提交确认"));

    await waitFor(() =>
      expect(apiClient.respondHumanReview).toHaveBeenCalledWith(
        "session_1",
        "review_1",
        expect.objectContaining({
          answer: expect.stringContaining("1. 30元阈值按含税还是未税计算？\n确认：按单张发票含税金额计算"),
          selected_option: "1. 按含税金额计算；2. 排除纸质发票",
        }),
      ),
    );
  });
});

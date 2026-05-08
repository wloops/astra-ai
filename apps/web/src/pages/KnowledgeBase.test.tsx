import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { KnowledgeBase } from "./KnowledgeBase";

vi.mock("../components/dashboard/Navbar", () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

vi.mock("../api/client", () => ({
  apiClient: {
    listProjects: vi.fn().mockResolvedValue({
      items: [{ id: "project_1", name: "Project" }],
      total: 1,
      offset: 0,
      limit: 50,
    }),
    listScenarioTemplates: vi.fn().mockResolvedValue({
      items: [{ id: "scenario_1", name: "Review", code: "review" }],
      total: 1,
      offset: 0,
      limit: 50,
    }),
    getKnowledgeEntries: vi.fn().mockResolvedValue({
      items: [
        {
          id: "kb_1",
          source_session_id: "session_1",
          project_id: "project_1",
          user_id: "user_1",
          scenario_code: "review",
          topic: "Knowledge topic",
          conclusion: "Decision conclusion",
          key_conflicts: [],
          role_summaries: [],
          risks: [],
          actions: [],
          tags: ["review"],
          reference_count: 2,
          created_at: "2026-05-08T00:00:00Z",
          updated_at: "2026-05-08T00:00:00Z",
        },
      ],
      total: 1,
      offset: 0,
      limit: 20,
    }),
    searchKnowledge: vi.fn(),
    getKnowledgeGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    getKnowledgeEntry: vi.fn(),
  },
}));

describe("KnowledgeBase", () => {
  it("renders knowledge entries in list view", async () => {
    render(
      <MemoryRouter>
        <KnowledgeBase />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Knowledge topic")).toBeInTheDocument());
    expect(screen.getByText("Decision conclusion")).toBeInTheDocument();
    expect(screen.getByText("知识库")).toBeInTheDocument();
  });
});

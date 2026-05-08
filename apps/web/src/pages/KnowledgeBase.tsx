import React, { useEffect, useMemo, useState } from "react";
import { GitBranch, LoaderCircle, Search } from "lucide-react";
import { apiClient } from "../api/client";
import type { KnowledgeGraphData, KnowledgeSearchResult, Project, ScenarioTemplate } from "../api/types";
import { Navbar } from "../components/dashboard/Navbar";
import { KnowledgeCard } from "../components/knowledge/KnowledgeCard";
import { KnowledgeGraph } from "../components/knowledge/KnowledgeGraph";
import { KnowledgeSearch } from "../components/knowledge/KnowledgeSearch";
import { cn } from "../lib/utils";

type ViewMode = "list" | "graph";

export function KnowledgeBase() {
  const [view, setView] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [scenario, setScenario] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioTemplate[]>([]);
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [graph, setGraph] = useState<KnowledgeGraphData>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFilters() {
      try {
        const [projectList, scenarioList] = await Promise.all([
          apiClient.listProjects(),
          apiClient.listScenarioTemplates(),
        ]);
        if (cancelled) return;
        setProjects(projectList.items);
        setScenarios(scenarioList.items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载筛选器失败");
      }
    }
    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadList() {
      try {
        setIsLoading(true);
        setError(null);
        if (submittedQuery.trim()) {
          const response = await apiClient.searchKnowledge(
            { q: submittedQuery.trim(), project_id: projectId, scenario, limit: 30 },
            controller.signal,
          );
          setResults(response.items);
        } else {
          const response = await apiClient.getKnowledgeEntries(
            { project_id: projectId, scenario, limit: 30 },
            controller.signal,
          );
          setResults(response.items.map((entry) => ({ entry, similarity_score: null })));
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "加载知识条目失败");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadList();
    return () => controller.abort();
  }, [projectId, scenario, submittedQuery]);

  useEffect(() => {
    if (view !== "graph") return;
    const controller = new AbortController();
    apiClient.getKnowledgeGraph({ project_id: projectId, limit: 50 }, controller.signal)
      .then(setGraph)
      .catch((err) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "加载知识图谱失败");
      });
    return () => controller.abort();
  }, [projectId, view]);

  const totalRefs = useMemo(
    () => results.reduce((sum, item) => sum + item.entry.reference_count, 0),
    [results],
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar activePage="知识库" />
      <main className="mx-auto max-w-[1440px] px-6 py-6">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">知识库</h1>
            <p className="mt-1 text-sm text-slate-500">沉淀已完成研讨的结论、争议、风险和行动项。</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-lg font-bold text-slate-900">{results.length}</div>
              <div className="text-slate-400">当前条目</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-lg font-bold text-slate-900">{totalRefs}</div>
              <div className="text-slate-400">引用次数</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-lg font-bold text-slate-900">{graph.edges.length}</div>
              <div className="text-slate-400">图谱关系</div>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {([
                { key: "list", label: "列表", icon: Search },
                { key: "graph", label: "图谱", icon: GitBranch },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium",
                    view === item.key ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <KnowledgeSearch
            query={query}
            projectId={projectId}
            scenario={scenario}
            projects={projects}
            scenarios={scenarios}
            onQueryChange={setQuery}
            onProjectChange={setProjectId}
            onScenarioChange={setScenario}
            onSubmit={() => setSubmittedQuery(query)}
          />

          {error && <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">{error}</div>}

          {view === "list" ? (
            <div className="min-h-[520px] bg-slate-50/70 p-5">
              {isLoading ? (
                <div className="flex h-[420px] items-center justify-center gap-2 text-sm text-slate-400">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  加载知识条目
                </div>
              ) : results.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {results.map((result) => (
                    <React.Fragment key={result.entry.id}>
                      <KnowledgeCard result={result} />
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="flex h-[420px] items-center justify-center text-sm text-slate-400">
                  暂无匹配知识条目
                </div>
              )}
            </div>
          ) : (
            <KnowledgeGraph data={graph} />
          )}
        </section>
      </main>
    </div>
  );
}

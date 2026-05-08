import React from "react";
import { Filter, Search } from "lucide-react";
import type { Project, ScenarioTemplate } from "../../api/types";

interface KnowledgeSearchProps {
  query: string;
  projectId: string;
  scenario: string;
  projects: Project[];
  scenarios: ScenarioTemplate[];
  onQueryChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onScenarioChange: (value: string) => void;
  onSubmit: () => void;
}

export function KnowledgeSearch({
  query,
  projectId,
  scenario,
  projects,
  scenarios,
  onQueryChange,
  onProjectChange,
  onScenarioChange,
  onSubmit,
}: KnowledgeSearchProps) {
  return (
    <form
      className="grid gap-3 border-b border-slate-200 bg-white px-6 py-4 lg:grid-cols-[1fr_220px_220px_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索议题、结论、争议或行动项"
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <label className="relative block">
        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select
          value={projectId}
          onChange={(event) => onProjectChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        >
          <option value="">全部项目</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <select
        value={scenario}
        onChange={(event) => onScenarioChange(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
      >
        <option value="">全部场景</option>
        {scenarios.map((item) => (
          <option key={item.id} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>

      <button className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
        搜索
      </button>
    </form>
  );
}

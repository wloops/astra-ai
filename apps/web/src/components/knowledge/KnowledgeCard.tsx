import React from "react";
import { Link } from "react-router-dom";
import { Calendar, ExternalLink, GitBranch, Quote } from "lucide-react";
import type { KnowledgeSearchResult } from "../../api/types";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString();
}

function scoreText(score: number | null): string {
  return score === null ? "关键词匹配" : `${Math.round(score * 100)}%`;
}

export function KnowledgeCard({ result }: { result: KnowledgeSearchResult }) {
  const { entry, similarity_score } = result;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 line-clamp-2">{entry.topic}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-3">{entry.conclusion}</p>
        </div>
        <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
          {scoreText(similarity_score)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <GitBranch className="h-3.5 w-3.5" />
          {entry.scenario_code || "default"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Quote className="h-3.5 w-3.5" />
          {entry.reference_count} 次引用
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(entry.created_at)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          {entry.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {tag}
            </span>
          ))}
        </div>
        <Link
          to={`/session-result?sessionId=${encodeURIComponent(entry.source_session_id)}`}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          原始 Session
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

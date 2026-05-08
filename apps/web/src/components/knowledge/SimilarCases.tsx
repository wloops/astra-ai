import React from "react";
import { History } from "lucide-react";
import type { KnowledgeSearchResult } from "../../api/types";

function score(score: number | null): string {
  return score === null ? "关键词匹配" : `${Math.round(score * 100)}% 相似`;
}

export function SimilarCases({ items }: { items: KnowledgeSearchResult[] }) {
  if (!items.length) return null;

  return (
    <section className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <History className="h-4 w-4 text-blue-600" />
        相似历史研讨
      </div>
      <div className="space-y-2">
        {items.map(({ entry, similarity_score }) => (
          <a
            key={entry.id}
            href={`/session-result?sessionId=${encodeURIComponent(entry.source_session_id)}`}
            className="block rounded-lg border border-blue-100 bg-white px-3 py-2 text-left hover:border-blue-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">{entry.topic}</div>
                <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{entry.conclusion}</div>
              </div>
              <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600">
                {score(similarity_score)}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { GitBranch, X } from "lucide-react";
import type { KnowledgeEntry, KnowledgeGraphData, KnowledgeGraphNode } from "../../api/types";
import { apiClient } from "../../api/client";

function edgeColor(type: string): string {
  if (type === "EXPLICIT_REFERENCE") return "#2563eb";
  if (type === "SEMANTIC_SIMILAR") return "#0f766e";
  return "#94a3b8";
}

export function KnowledgeGraph({ data }: { data: KnowledgeGraphData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<{ destroy: () => void } | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function renderGraph() {
      if (!containerRef.current) return;
      const { Network } = await import("vis-network/standalone");
      if (cancelled || !containerRef.current) return;
      networkRef.current?.destroy();
      const nodes = data.nodes.map((node) => ({
        id: node.id,
        label: node.topic.length > 24 ? `${node.topic.slice(0, 24)}...` : node.topic,
        title: node.topic,
        value: Math.max(1, node.reference_count + 1),
        color: { background: "#eff6ff", border: "#2563eb", highlight: { background: "#dbeafe", border: "#1d4ed8" } },
        font: { color: "#0f172a", size: 14, face: "Inter, sans-serif" },
      }));
      const edges = data.edges.map((edge) => ({
        from: edge.source,
        to: edge.target,
        width: Math.max(1, edge.weight * 4),
        color: { color: edgeColor(edge.type), opacity: 0.7 },
        title: `${edge.type}: ${edge.weight.toFixed(2)}`,
      }));
      const network = new Network(
        containerRef.current,
        { nodes, edges },
        {
          interaction: { hover: true, navigationButtons: true },
          physics: { stabilization: true, barnesHut: { springLength: 140 } },
          nodes: { shape: "dot", scaling: { min: 16, max: 34 } },
        },
      );
      network.on("click", (params: { nodes?: string[] }) => {
        const nodeId = params.nodes?.[0];
        setSelectedNode(data.nodes.find((node) => node.id === nodeId) ?? null);
      });
      networkRef.current = network;
    }
    renderGraph();
    return () => {
      cancelled = true;
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    if (!selectedNode) {
      setSelectedEntry(null);
      return;
    }
    const controller = new AbortController();
    apiClient.getKnowledgeEntry(selectedNode.id, controller.signal)
      .then(setSelectedEntry)
      .catch(() => setSelectedEntry(null));
    return () => controller.abort();
  }, [selectedNode]);

  return (
    <div className="relative min-h-[620px] overflow-hidden bg-white">
      {data.nodes.length === 0 ? (
        <div className="flex h-[620px] flex-col items-center justify-center gap-2 text-sm text-slate-400">
          <GitBranch className="h-5 w-5" />
          暂无知识图谱数据
        </div>
      ) : (
        <div ref={containerRef} className="h-[620px] w-full" />
      )}

      {selectedNode && (
        <aside className="absolute right-4 top-4 w-[360px] max-w-[calc(100%-2rem)] rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{selectedNode.scenario}</div>
              <h3 className="mt-1 text-base font-semibold leading-6 text-slate-900">{selectedNode.topic}</h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="关闭详情"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {selectedEntry?.conclusion ?? "正在加载条目详情..."}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-slate-400">项目</div>
              <div className="mt-1 font-medium text-slate-700">{selectedNode.project}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-slate-400">引用</div>
              <div className="mt-1 font-medium text-slate-700">{selectedNode.reference_count} 次</div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

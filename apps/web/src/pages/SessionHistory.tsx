import React, { useEffect, useState } from "react";
import { Navbar } from "../components/dashboard/Navbar";
import {
  RefreshCcw,
  Download,
  ChevronDown,
  Calendar,
  Search,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  FileText,
  Play,
  MoreHorizontal,
  Bot,
  User,
  Users,
} from "lucide-react";
import { cn } from "../lib/utils";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { apiClient } from "../api/client";
import type { DiscussionSession, Project, ScenarioTemplate, SessionResult } from "../api/types";

// --- Helpers ---
const STATUS_LABELS: Record<string, string> = {
  pending: "待开始",
  running: "进行中",
  completed: "已完成",
  failed: "失败",
  paused: "已暂停",
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

function getStatusBadge(status: string) {
  const label = STATUS_LABELS[status] ?? status;
  const colorMap: Record<string, string> = {
    completed: "bg-emerald-500",
    running: "bg-blue-500",
    failed: "bg-rose-500",
    pending: "bg-slate-400",
    paused: "bg-amber-500",
  };
  const dotColor = colorMap[status] ?? "bg-slate-400";
  return (
    <div className="flex items-center gap-1.5 text-slate-600">
      <div className={cn("w-1.5 h-1.5 rounded-full", dotColor)}></div>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function SessionHistory() {
  const [sessions, setSessions] = useState<DiscussionSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioTemplate[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 搜索/过滤
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterScenarioId, setFilterScenarioId] = useState("");

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [s, p, sc] = await Promise.all([
        apiClient.listSessions(),
        apiClient.listProjects(),
        apiClient.listScenarioTemplates(),
      ]);
      setSessions(s);
      setProjects(p);
      setScenarios(sc);
      if (s.length > 0) setActiveId(s[0].id);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 当 activeId 变化时加载结果
  useEffect(() => {
    if (!activeId) {
      setSessionResult(null);
      return;
    }
    apiClient
      .getSessionResult(activeId)
      .then(setSessionResult)
      .catch(() => setSessionResult(null));
  }, [activeId]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const getProjectName = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    return p?.name ?? projectId;
  };

  const getScenarioName = (scenarioId: string) => {
    const sc = scenarios.find((x) => x.id === scenarioId);
    return sc?.name ?? scenarioId;
  };

  // 搜索/过滤后的 sessions
  const filteredSessions = sessions.filter((s) => {
    if (searchQuery && !s.topic.includes(searchQuery)) return false;
    if (filterProjectId && s.project_id !== filterProjectId) return false;
    if (filterScenarioId && s.scenario_id !== filterScenarioId) return false;
    return true;
  });

  // 过滤变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterProjectId, filterScenarioId]);

  // 前端分页
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const pagedSessions = filteredSessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleRefresh = () => {
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar activePage="会议历史" />

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">会议历史</h1>
            <p className="text-sm text-slate-500">查看和管理所有发起的高质量多 Agent 研讨会议</p>
            {loadError && (
              <div className="mt-3">
                <ErrorBanner message={loadError} onRetry={loadData} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>刷新</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              <span>导出记录</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-wrap lg:flex-nowrap items-end gap-4 w-full">
          <div className="flex flex-col gap-1.5 w-full sm:w-[calc(50%-8px)] lg:w-44 xl:w-48 flex-shrink-0">
            <label className="text-xs font-medium text-slate-600">项目</label>
            <div className="relative">
              <select
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
                className="w-full h-10 px-3 pr-10 appearance-none bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all hover:border-slate-300"
              >
                <option value="">全部项目</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-[calc(50%-8px)] lg:w-44 xl:w-48 flex-shrink-0">
            <label className="text-xs font-medium text-slate-600">场景</label>
            <div className="relative">
              <select
                value={filterScenarioId}
                onChange={(e) => setFilterScenarioId(e.target.value)}
                className="w-full h-10 px-3 pr-10 appearance-none bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all hover:border-slate-300"
              >
                <option value="">全部场景</option>
                {scenarios.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 w-full lg:flex-1 lg:ml-auto">
            <label className="text-xs font-medium text-slate-600">&nbsp;</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索会议标题或关键词"
                className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all hover:border-slate-300 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col xl:flex-row gap-6 min-h-[600px]">
          {/* Left List */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">加载中…</div>
            ) : pagedSessions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">暂无会议记录，请先发起研讨</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-100 text-sm font-medium text-slate-600 bg-white">
                      <th className="py-4 pl-6 pr-4 font-semibold w-[25%]">会议标题</th>
                      <th className="py-4 px-4 font-semibold w-[15%]">项目</th>
                      <th className="py-4 px-4 font-semibold w-[12%]">场景</th>
                      <th className="py-4 px-4 font-semibold w-[18%]">时间</th>
                      <th className="py-4 px-4 font-semibold w-[10%]">状态</th>
                      <th className="py-4 px-4 font-semibold w-[5%] text-right pr-6"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {pagedSessions.map((s) => {
                      const isActive = s.id === activeId;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setActiveId(s.id)}
                          className={cn(
                            "border-b border-slate-100 last:border-none cursor-pointer transition-colors group relative",
                            isActive ? "bg-blue-50/50" : "hover:bg-slate-50",
                          )}
                        >
                          <td className="py-4 pl-6 pr-4 relative">
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 z-10" />}
                            <div className="flex flex-col gap-1">
                              <span className={cn("font-medium", isActive ? "text-blue-700" : "text-slate-900 group-hover:text-blue-600")}>
                                {s.topic}
                              </span>
                              <span className="text-xs text-slate-400">ID: {s.id}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-600">
                            <div className="w-full truncate">{getProjectName(s.project_id)}</div>
                          </td>
                          <td className="py-4 px-4 text-slate-600">
                            <div className="w-full truncate">{getScenarioName(s.scenario_id)}</div>
                          </td>
                          <td className="py-4 px-4 text-slate-600">
                            <div className="flex flex-col gap-0.5">
                              <span>{formatTime(s.created_at)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">{getStatusBadge(s.status)}</td>
                          <td className="py-4 pl-4 pr-6 text-right">
                            <ChevronRight
                              className={cn("w-4 h-4 transition-colors", isActive ? "text-blue-500" : "text-slate-300 group-hover:text-slate-500")}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredSessions.length > 0 && (
              <div className="mt-auto p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                <div>
                  共 <span className="font-medium text-slate-900">{filteredSessions.length}</span> 条{sessions.length !== filteredSessions.length ? <span className="text-xs text-slate-400 ml-1">（全部 {sessions.length}）</span> : null}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded bg-blue-50 text-blue-600 font-medium">
                      {currentPage}
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-white border border-slate-200 rounded py-1 pl-3 pr-8 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer"
                    >
                      <option value={10}>10 条/页</option>
                      <option value={20}>20 条/页</option>
                      <option value={50}>50 条/页</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1.5 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Detail */}
          <div className="w-full xl:w-[480px] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full flex-shrink-0">
            {!activeSession ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-6">请选择一条会议记录</div>
            ) : (
              <>
                <div className="flex-1 p-6 overflow-y-auto">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-6">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-medium whitespace-nowrap mt-0.5">
                      {STATUS_LABELS[activeSession.status] ?? activeSession.status}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">{activeSession.topic}</h2>
                  </div>

                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">项目</div>
                      <div className="text-sm text-slate-700">{getProjectName(activeSession.project_id)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">场景</div>
                      <div className="text-sm text-slate-700">{getScenarioName(activeSession.scenario_id)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">创建时间</div>
                      <div className="text-sm text-slate-700">{formatTime(activeSession.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">会议 ID</div>
                      <div className="text-sm text-slate-700">{activeSession.id}</div>
                    </div>
                  </div>

                  {/* Result Sections */}
                  {sessionResult ? (
                    <div className="space-y-6">
                      {sessionResult.final_conclusion && (
                        <section>
                          <h3 className="text-[15px] font-bold text-slate-900 mb-2">会议摘要</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">{sessionResult.final_conclusion}</p>
                        </section>
                      )}

                      {sessionResult.key_conflicts && sessionResult.key_conflicts.length > 0 && (
                        <section>
                          <h3 className="text-[15px] font-bold text-slate-900 mb-2">关键争议</h3>
                          <ul className="space-y-2">
                            {sessionResult.key_conflicts.map((c, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <span>
                                  {(c as Record<string, unknown>).title ?? `争议 ${i + 1}`}: {(c as Record<string, unknown>).judgement ?? JSON.stringify(c)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {sessionResult.risks && sessionResult.risks.length > 0 && (
                        <section>
                          <h3 className="text-[15px] font-bold text-slate-900 mb-2">风险</h3>
                          <ul className="space-y-2">
                            {sessionResult.risks.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                                <span>{(r as Record<string, unknown>).name ?? JSON.stringify(r)}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {sessionResult.actions && sessionResult.actions.length > 0 && (
                        <section>
                          <h3 className="text-[15px] font-bold text-slate-900 mb-2">行动项</h3>
                          <ul className="space-y-2">
                            {sessionResult.actions.map((a, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span>{(a as Record<string, unknown>).title ?? JSON.stringify(a)}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 text-center py-8">暂无结果数据（Session 可能仍在进行中）</div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-b-xl gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>查看纪要</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 h-10 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm">
                    <Play className="w-4 h-4 fill-white" />
                    <span>再次发起</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center px-4 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm">
                    <Copy className="w-4 h-4 text-blue-500 mr-2" />
                    <span>复制配置</span>
                  </button>
                  <button className="w-10 h-10 flex border shrink-0 items-center justify-center bg-white border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

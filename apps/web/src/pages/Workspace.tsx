import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bot, Check, Code2, Copy, FileText, LoaderCircle, MessageSquare, Scale, ShieldCheck, User } from "lucide-react";
import { apiClient } from "../api/client";
import { subscribeToSessionEvents } from "../api/events";
import type { AgentRole, DiscussionSession, Project, ScenarioTemplate, SessionEvent } from "../api/types";
import { Navbar } from "../components/dashboard/Navbar";
import { cn } from "../lib/utils";

interface AgentMessage {
  id: string;
  roleName: string;
  stage: string;
  content: string;
  createdAt: string;
  roleCode: string | null;
}

interface ConflictItem {
  title: string;
  supportingView: string;
  cautiousView: string;
  judgement: string;
}

const roleIcons = [Bot, User, Code2, ShieldCheck];

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("；");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return asText(record.summary ?? record.message ?? record.final_conclusion ?? Object.values(record).join("；"));
  }
  return "";
}

function mapConflict(value: Record<string, unknown>): ConflictItem {
  return {
    title: asText(value.title) || "关键争议",
    supportingView: asText(value.supporting_view) || asText(value.supportingView),
    cautiousView: asText(value.cautious_view) || asText(value.cautiousView),
    judgement: asText(value.judgement),
  };
}

export function Workspace() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") ?? "";
  const [session, setSession] = useState<DiscussionSession | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [scenario, setScenario] = useState<ScenarioTemplate | null>(null);
  const [roles, setRoles] = useState<AgentRole[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function loadSession() {
      try {
        setIsLoading(true);
        const [sessionData, projectList, scenarioList, roleList] = await Promise.all([
          apiClient.getSession(sessionId),
          apiClient.listProjects(),
          apiClient.listScenarioTemplates(),
          apiClient.listAgentRoles(),
        ]);
        if (cancelled) return;

        setSession(sessionData);
        setProject(projectList.find((item) => item.id === sessionData.project_id) ?? null);
        setScenario(scenarioList.find((item) => item.id === sessionData.scenario_id) ?? null);
        setRoles(roleList);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载 Session 失败");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const subscription = subscribeToSessionEvents(sessionId, {
      onEvent: (event) => {
        setEvents((current) =>
          current.some((item) => item.id === event.id) ? current : [...current, event].sort((a, b) => a.sequence - b.sequence),
        );

        if (event.type === "agent_message") {
          const roleName = roles.find((role) => role.code === event.role_code)?.name ?? event.role_code ?? "Agent";
          setMessages((current) => [
            ...current,
            {
              id: event.id,
              roleName,
              stage: event.stage ?? "",
              content: asText(event.payload),
              createdAt: event.created_at,
              roleCode: event.role_code,
            },
          ]);
        }

        if (event.type === "conflict_detected") {
          const rawConflicts = Array.isArray(event.payload.conflicts) ? event.payload.conflicts : [event.payload];
          setConflicts(rawConflicts.map((item) => mapConflict(item as Record<string, unknown>)));
        }

        if (event.type === "session_completed") {
          setSession((current) => (current ? { ...current, status: "completed" } : current));
        }

        if (event.type === "session_failed") {
          setSession((current) => (current ? { ...current, status: "failed" } : current));
          setError(asText(event.payload.error) || "Session 执行失败");
        }
      },
      onError: () => {
        // EventSource 会在连接关闭时触发 error；完成态不需要把正常关闭展示成失败。
        if (session?.status !== "completed" && session?.status !== "failed") {
          setError("SSE 连接暂时不可用，请确认后端 API 正在运行。");
        }
      },
    });

    return () => subscription.close();
  }, [roles, session?.status, sessionId]);

  const stages = useMemo(() => scenario?.stages ?? [], [scenario]);
  const completedStages = useMemo(
    () => new Set(events.filter((event) => event.type === "stage_completed" && event.stage).map((event) => event.stage as string)),
    [events],
  );
  const latestStartedStage = [...events]
    .reverse()
    .find((event) => event.type === "stage_started" && event.stage)?.stage;
  const currentStage = latestStartedStage ?? session?.current_stage ?? "";
  const progress = stages.length ? Math.round((completedStages.size / stages.length) * 100) : 0;

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans">
        <Navbar activePage="工作台" />
        <main className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">缺少 Session ID</h1>
          <p className="text-slate-500 mb-6">请先从发起研讨页创建真实 Session。</p>
          <Link to="/start-session" className="inline-flex px-5 py-3 rounded-xl bg-blue-600 text-white font-medium">
            发起研讨
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans overflow-hidden">
      <Navbar activePage="工作台" />
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <aside className="w-[320px] flex flex-col gap-4 overflow-y-auto pr-1 shrink-0">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">多 Agent 智能研讨中</h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                实时
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="truncate">会议 ID: {sessionId}</span>
                <Copy className="w-3.5 h-3.5 shrink-0" />
              </div>
              <div>状态：{session?.status ?? (isLoading ? "加载中" : "未知")}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-medium text-slate-700">当前议题</h3>
            </div>
            <h2 className="text-[22px] font-bold text-slate-900 leading-snug mb-5">{session?.topic ?? "加载中..."}</h2>
            <div className="flex flex-wrap gap-2">
              {(project?.tags ?? []).map((tag) => (
                <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-1">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-medium text-slate-900">研讨阶段</h3>
              <span className="text-sm text-slate-400 font-medium">
                {completedStages.size} / {stages.length || "-"}
              </span>
            </div>
            <div className="relative space-y-5 mt-2 pb-4">
              <div className="absolute left-[11px] top-6 bottom-6 w-px bg-slate-200" />
              {stages.map((stage, index) => {
                const completed = completedStages.has(stage);
                const current = currentStage === stage && !completed;
                return (
                  <div key={stage} className="relative flex items-start gap-4">
                    <div
                      className={cn(
                        "relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ring-4 ring-white",
                        completed || current ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 border border-slate-200",
                      )}
                    >
                      {completed ? <Check className="w-3.5 h-3.5" /> : index + 1}
                    </div>
                    <div className={cn("flex flex-col -mt-0.5", completed || current ? "opacity-100" : "opacity-50")}>
                      <span className={cn("text-sm font-medium", current ? "text-blue-600" : "text-slate-800")}>{stage}</span>
                      <span className="text-xs text-slate-400">{completed ? "已完成" : current ? "进行中" : "等待中"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">Agent 发言流</h3>
            </div>
            {error && <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {roles
                .filter((role) => session?.role_ids.includes(role.id))
                .map((role, index) => {
                  const Icon = roleIcons[index % roleIcons.length];
                  return (
                    <div key={role.id} className="min-w-[200px] max-w-[240px] flex-1 border border-slate-100 rounded-xl p-3 bg-white">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-800 text-sm">{role.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-snug line-clamp-2">{role.description}</p>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                {isLoading ? "正在加载会议..." : "等待后端推送 Agent 发言"}
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className="flex gap-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-teal-100 text-teal-600 shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{message.roleName}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-medium">
                      {message.stage || "session"}
                    </span>
                    <span className="text-xs text-slate-400 font-medium ml-1">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed max-w-[90%]">{message.content}</div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <aside className="w-[320px] flex flex-col gap-4 overflow-y-auto pl-1 pr-1 shrink-0">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-700 mb-4">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-sm">项目上下文</h3>
            </div>
            <h4 className="font-bold text-slate-900 text-[15px] mb-3 leading-snug">{project?.name ?? "加载中..."}</h4>
            <p className="text-[13px] text-slate-600 leading-relaxed">{project?.description || project?.goal}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-semibold text-sm text-slate-800 mb-6">会议进度</h3>
            <div className="flex items-center gap-5 mb-6">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-slate-100" strokeWidth="10" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-blue-500"
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * progress) / 100}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tracking-tighter text-slate-900">
                    {progress}<span className="text-sm font-semibold">%</span>
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">整体进度</span>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                当前阶段
                <div className="text-slate-900 font-semibold mt-1">{currentStage || "等待开始"}</div>
              </div>
            </div>
            {session?.status === "completed" && (
              <Link
                to={`/session-result?sessionId=${encodeURIComponent(sessionId)}`}
                className="w-full inline-flex justify-center py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl"
              >
                查看会议结果
              </Link>
            )}
            {session?.status === "failed" && <div className="text-sm text-red-600">Session 执行失败：{session.error_message}</div>}
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-1">
            <div className="flex items-center gap-2 mb-5">
              <Scale className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-sm text-slate-800">关键争议</h3>
            </div>
            {conflicts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                等待争议识别事件
              </div>
            ) : (
              <div className="space-y-4">
                {conflicts.map((conflict) => (
                  <div key={conflict.title} className="rounded-xl bg-amber-50/50 border border-amber-100 p-3 text-sm">
                    <div className="font-semibold text-slate-900 mb-2">{conflict.title}</div>
                    <p className="text-slate-600 mb-1">支持方：{conflict.supportingView}</p>
                    <p className="text-slate-600 mb-1">审慎方：{conflict.cautiousView}</p>
                    <p className="text-amber-700">裁决：{conflict.judgement}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

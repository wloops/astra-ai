import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bot,
  Check,
  Clock,
  Code2,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Grid2X2,
  LoaderCircle,
  MessageSquare,
  Scale,
  ShieldCheck,
  Target,
  User,
} from "lucide-react";
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
  modelUsed?: string;
}

const roleIcons = [Bot, User, Code2, ShieldCheck];

function labelTone(label: string): string {
  if (label === "优秀") return "emerald";
  if (label === "良好") return "blue";
  if (label === "一般") return "amber";
  return "rose";
}

const STAGE_LABELS: Record<string, string> = {
  init_session: "初始化会议",
  load_context: "加载项目上下文",
  clarify_topic: "澄清议题",
  independent_review: "独立评审",
  detect_conflict: "识别争议",
  debate: "交叉辩论",
  judge_and_summarize: "裁决总结",
  generate_actions: "生成行动项",
  finalize_minutes: "生成会议纪要",
};

function stageLabel(stage: string | null | undefined): string {
  if (!stage) return "会议流程";
  return STAGE_LABELS[stage] ?? stage;
}

function parseBackendDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const utcValue = hasTimezone ? normalized : `${normalized}Z`;
  const date = new Date(utcValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: string | null | undefined): string {
  const date = parseBackendDate(value);
  if (!date) return "--";
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function formatShortTime(value: string | null | undefined): string {
  const date = parseBackendDate(value);
  if (!date) return "--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatMessageTime(value: string | null | undefined): string {
  const date = parseBackendDate(value);
  if (!date) return "--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDurationMinutes(start: Date | null, end: Date | null): string {
  if (!start || !end) return "--";
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  return `${minutes} 分钟`;
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("；");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return asText(record.summary ?? record.message ?? record.final_conclusion ?? Object.values(record).join("；"));
  }
  return "";
}

export function Workspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") ?? "";
  const [session, setSession] = useState<DiscussionSession | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [scenario, setScenario] = useState<ScenarioTemplate | null>(null);
  const [roles, setRoles] = useState<AgentRole[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));
  const [reconnecting, setReconnecting] = useState(false);
  const [heartbeatWarning, setHeartbeatWarning] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [mobileTab, setMobileTab] = useState<'progress' | 'context' | 'monitor'>('progress');
  const sessionStatusRef = useRef<string | null>(null);
  const rolesRef = useRef<AgentRole[]>([]);

  // 保持 ref 与状态同步
  useEffect(() => {
    sessionStatusRef.current = session?.status ?? null;
  }, [session?.status]);
  useEffect(() => {
    rolesRef.current = roles;
  }, [roles]);

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
        setProject(projectList.items.find((item) => item.id === sessionData.project_id) ?? null);
        setScenario(scenarioList.items.find((item) => item.id === sessionData.scenario_id) ?? null);
        setRoles(roleList.items);
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
        setReconnecting(false);
        setHeartbeatWarning(false);

        setEvents((current) =>
          current.some((item) => item.id === event.id) ? current : [...current, event].sort((a, b) => a.sequence - b.sequence),
        );

        if (event.type === "agent_message") {
          const roleName = rolesRef.current.find((role) => role.code === event.role_code)?.name ?? event.role_code ?? "Agent";
          setMessages((current) =>
            current.some((m) => m.id === event.id)
              ? current
              : [
                  ...current,
                  {
                    id: event.id,
                    roleName,
                    stage: event.stage ?? "",
                    content: asText(event.payload),
                    createdAt: event.created_at,
                    roleCode: event.role_code,
                    modelUsed: typeof event.payload.model_used === "string" ? event.payload.model_used : undefined,
                  },
                ],
          );
        }

        if (event.type === "session_completed") {
          setSession((current) => (current ? { ...current, status: "completed" } : current));
          setReconnecting(false);
          setHeartbeatWarning(false);
          sessionStatusRef.current = "completed"; // 立即更新 ref，避免重连循环
        }

        if (event.type === "session_failed") {
          setSession((current) => (current ? { ...current, status: "failed" } : current));
          setReconnecting(false);
          setHeartbeatWarning(false);
          sessionStatusRef.current = "failed"; // 立即更新 ref
          setError(asText(event.payload.error) || "Session 执行失败");
        }
      },
      onReconnecting: () => {
        setReconnecting(true);
        setHeartbeatWarning(false);
      },
      onReconnected: () => {
        setReconnecting(false);
        setHeartbeatWarning(false);
        // 重连成功后清除之前可能设置的临时错误
        setError(null);
      },
      onHeartbeatTimeout: () => {
        setHeartbeatWarning(true);
      },
      onHeartbeatRestored: () => {
        setHeartbeatWarning(false);
      },
      onMaxRetriesExceeded: () => {
        setReconnecting(false);
        setError("SSE 连接失败，请刷新页面重试。");
      },
      shouldReconnect: () => {
        // Session 处于终态时不应重连（完成后 SSE 流正常关闭不是故障）
        const status = sessionStatusRef.current;
        return status !== "completed" && status !== "failed";
      },
    });

    return () => subscription.close();
  }, [sessionId]);

  const stages = useMemo(() => scenario?.stages ?? [], [scenario]);
  const latestStartedStage = [...events]
    .reverse()
    .find((event) => event.type === "stage_started" && event.stage)?.stage;
  const terminal = session?.status === "completed" || session?.status === "failed";
  const active = session?.status === "pending" || session?.status === "running";
  const currentStage = terminal ? session?.current_stage ?? "" : latestStartedStage ?? session?.current_stage ?? "";
  const completedStages = useMemo(() => {
    const completed = new Set(
      events.filter((event) => event.type === "stage_completed" && event.stage).map((event) => event.stage as string),
    );
    const currentIndex = stages.indexOf(currentStage);

    // 后端不会为所有阶段发 stage_completed；展示层用阶段顺序补齐已越过的阶段。
    if (currentIndex > 0) {
      stages.slice(0, currentIndex).forEach((stage) => completed.add(stage));
    }
    if (session?.status === "completed") {
      stages.forEach((stage) => completed.add(stage));
    }
    if (session?.status === "failed" && currentStage) {
      stages.slice(0, Math.max(currentIndex, 0)).forEach((stage) => completed.add(stage));
    }

    return completed;
  }, [currentStage, events, session?.status, stages]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [active]);

  const overviewProgress = stages.length ? Math.round((completedStages.size / stages.length) * 100) : 0;
  const sessionStartedAt = parseBackendDate(session?.created_at);
  const sessionEndedAt = terminal ? parseBackendDate(session?.completed_at) ?? parseBackendDate(session?.updated_at) : new Date(nowMs);
  const elapsedMs = sessionStartedAt && sessionEndedAt ? Math.max(0, sessionEndedAt.getTime() - sessionStartedAt.getTime()) : null;
  const elapsedMinutesText = formatDurationMinutes(sessionStartedAt, sessionEndedAt);
  const estimatedRemainingText =
    terminal || session?.status === "failed"
      ? "0 分钟"
      : elapsedMs && overviewProgress > 0
        ? `${Math.max(1, Math.round((elapsedMs / overviewProgress) * (100 - overviewProgress) / 60_000))} 分钟`
        : "--";
  const visibleRoleCount = session?.role_ids.length ?? 0;
  const agentMessageCount = events.filter((event) => event.type === "agent_message").length;
  const latestConflictEvent = [...events].reverse().find((event) => event.type === "conflict_detected");
  const latestConflicts = latestConflictEvent?.payload.conflicts;
  const conflictCount = Array.isArray(latestConflicts) ? latestConflicts.length : latestConflictEvent ? 1 : 0;
  const toolCallCount = events.filter((event) => event.type === "tool_event").length;
  const discussionOverviewMetrics = [
    { label: "已用时", value: elapsedMinutesText },
    { label: "预计剩余", value: estimatedRemainingText },
    { label: "参与角色", value: `${visibleRoleCount}/${visibleRoleCount} 在线` },
    { label: "已生成观点", value: `${agentMessageCount} 条` },
    { label: "已识别争议", value: `${conflictCount} 个` },
    { label: "已调用工具", value: `${toolCallCount} 次` },
  ];
  const currentStageText =
    session?.status === "completed" ? "研讨已完成" : session?.status === "failed" ? "研讨失败" : currentStage ? stageLabel(currentStage) : "等待开始";
  const showCenteredWaiting = messages.length === 0 && active && !isLoading;
  const showBottomWaiting = messages.length > 0 && active;
  const showCompletedNotice = session?.status === "completed";
  const showFailedNotice = session?.status === "failed";
  const loadContextEvent = events.find((event) => event.type === "stage_completed" && event.stage === "load_context");
  const latestToolTime = loadContextEvent?.created_at ?? events[events.length - 1]?.created_at;
  const policyToolDone = Boolean(loadContextEvent || terminal);
  const similarCaseToolDone = session?.status === "completed";
  const similarCaseRunning = active;

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
        <aside className="hidden lg:flex lg:flex-col w-[320px] gap-4 overflow-y-auto pr-1 shrink-0">
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
                      <span className={cn("text-sm font-medium", current ? "text-blue-600" : "text-slate-800")}>
                        {stageLabel(stage)}
                      </span>
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
            {reconnecting && (
              <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                重新连接中…
              </div>
            )}
            {heartbeatWarning && !reconnecting && (
              <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                连接可能已中断，等待事件…
              </div>
            )}
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
              <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
                {isLoading || showCenteredWaiting ? <LoaderCircle className="w-5 h-5 animate-spin text-blue-500" /> : null}
                <span>
                  {isLoading
                    ? "正在加载会议..."
                    : showCenteredWaiting
                      ? "正在等待 Agent 发言..."
                      : showCompletedNotice
                        ? "研讨已完成，可查看会议结果"
                        : showFailedNotice
                          ? "研讨已失败，请查看错误信息"
                          : "暂无 Agent 发言"}
                </span>
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
                      {stageLabel(message.stage)}
                    </span>
                    {message.modelUsed && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium">
                        {message.modelUsed}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-medium ml-1">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed max-w-[90%]">{message.content}</div>
                </div>
              </div>
            ))}
            {showBottomWaiting && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-600">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                等待下一位 Agent 发言...
              </div>
            )}
            {messages.length > 0 && showCompletedNotice && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700">
                研讨已完成，可查看会议结果
              </div>
            )}
            {messages.length > 0 && showFailedNotice && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                研讨已失败，请查看错误信息
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:flex lg:flex-col w-[360px] gap-4 overflow-y-auto pl-1 pr-1 shrink-0">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-700">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-sm">项目上下文</h3>
              </div>
              <Link to="/project-context" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                查看全部
              </Link>
            </div>
            <h4 className="font-bold text-slate-900 text-[15px] mb-4 leading-snug">{project?.name ?? "加载中..."}</h4>
            <div className="space-y-3 text-[13px] text-slate-600">
              <div className="flex items-start gap-3">
                <Grid2X2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400">场景：</span>
                  <span>{scenario?.name ?? "未选择"}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400">创建时间：</span>
                  <span>{formatDateTime(session?.created_at)}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Target className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <span className="text-slate-400">项目描述：</span>
                  <span>{project?.description || project?.goal || "暂无项目描述"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 mb-6">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-sm">研讨状态总览</h3>
            </div>
            <div className="flex items-center gap-5 mb-5">
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
                    strokeDashoffset={251.2 - (251.2 * overviewProgress) / 100}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tracking-tighter text-slate-900">
                    {overviewProgress}<span className="text-sm font-semibold">%</span>
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">整体进度</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400 mb-1">当前阶段</div>
                <div className="text-sm font-semibold text-slate-900 leading-snug">{currentStageText}</div>
                <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${overviewProgress}%` }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {discussionOverviewMetrics.map((metric) => (
                <div key={metric.label} className="rounded-xl bg-slate-50/80 px-3 py-2.5">
                  <div className="text-[11px] text-slate-400 mb-1">{metric.label}</div>
                  <div className="text-sm font-semibold text-slate-900">{metric.value}</div>
                </div>
              ))}
            </div>
            {session?.status === "completed" && (
              <Link
                to={`/session-result?sessionId=${encodeURIComponent(sessionId)}`}
                className="mt-5 w-full inline-flex justify-center py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl"
              >
                查看会议结果
              </Link>
            )}
            {session?.status === "failed" && <div className="mt-4 text-sm text-red-600">Session 执行失败：{session.error_message}</div>}
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 mb-5">
              <Scale className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-sm">质量与风险监控</h3>
            </div>
            <div className="space-y-3">
              {session?.metrics ? (
                <>
                  {[
                    { label: "结论收敛度", value: `${Math.round(session.metrics.conclusion_convergence * 100)}%`, tone: labelTone(session.metrics.conclusion_label), pct: session.metrics.conclusion_convergence },
                    { label: "上下文充分度", value: session.metrics.context_label, tone: labelTone(session.metrics.context_label), pct: session.metrics.context_sufficiency },
                    { label: "风险覆盖度", value: session.metrics.risk_label, tone: labelTone(session.metrics.risk_label), pct: session.metrics.risk_coverage },
                  ].map((metric) => (
                    <div key={metric.label} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-500">{metric.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.round(metric.pct * 100)}%` }} />
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            metric.tone === "blue" && "bg-blue-50 text-blue-600",
                            metric.tone === "emerald" && "bg-emerald-50 text-emerald-600",
                            metric.tone === "amber" && "bg-amber-50 text-amber-600",
                            metric.tone === "rose" && "bg-rose-50 text-rose-600",
                          )}
                        >
                          {metric.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-sm text-slate-400 text-center py-3">
                  {session?.status === "running" ? "研讨进行中…" : "暂无数据"}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 mb-5">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-sm">活跃进程与工具</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-700">合规政策检索</div>
                  <div className="text-xs text-slate-400">{formatShortTime(latestToolTime)}</div>
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-md text-xs font-medium",
                    policyToolDone ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400",
                  )}
                >
                  {policyToolDone ? "完成" : "待开始"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-700">历史决策相似案例检索</div>
                  <div className="text-xs text-slate-400">{formatShortTime(events[events.length - 1]?.created_at)}</div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                    similarCaseToolDone
                      ? "bg-emerald-50 text-emerald-600"
                      : similarCaseRunning
                        ? "bg-blue-50 text-blue-600"
                        : "bg-slate-50 text-slate-400",
                  )}
                >
                  {similarCaseRunning && <LoaderCircle className="w-3 h-3 animate-spin" />}
                  {similarCaseToolDone ? "完成" : similarCaseRunning ? "运行中" : "待开始"}
                </span>
              </div>
            </div>
            <button
              onClick={() => sessionId && navigate(`/session-result?sessionId=${sessionId}`)}
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              查看详情
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-stretch z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { key: 'progress', label: '进度', icon: FileText },
          { key: 'context', label: '上下文', icon: Target },
          { key: 'monitor', label: '监控', icon: Scale },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
              mobileTab === tab.key ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700',
            )}
            aria-label={tab.label}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile Panel */}
      {mobileTab && (
        <div className="lg:hidden fixed bottom-12 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-30 max-h-[40vh] overflow-y-auto p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {mobileTab === 'progress' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">研讨阶段</h3>
              <div className="space-y-3">
                {stages.map((stage, index) => {
                  const completed = completedStages.has(stage);
                  const current = currentStage === stage && !completed;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                        completed || current ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200',
                      )}>
                        {completed ? <Check className="w-3.5 h-3.5" /> : index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn('text-sm', current ? 'text-blue-600 font-medium' : 'text-slate-700')}>{stageLabel(stage)}</span>
                        <span className="text-xs text-slate-400">{completed ? '已完成' : current ? '进行中' : '等待中'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {mobileTab === 'context' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">项目上下文</h3>
              <div className="text-sm text-slate-700">{project?.name ?? '加载中...'}</div>
              <div className="text-xs text-slate-500">{project?.description ?? '暂无项目描述'}</div>
              {project?.goal && (
                <div className="mt-2">
                  <h4 className="text-xs font-medium text-slate-500">目标</h4>
                  <div className="text-sm text-slate-700">{project.goal}</div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {(project?.tags ?? []).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {mobileTab === 'monitor' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">质量与风险</h3>
              {session?.metrics ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">结论收敛度</span><span className="font-medium">{Math.round(session.metrics.conclusion_convergence * 100)}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">上下文充分度</span><span className="font-medium">{session.metrics.context_label}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">风险覆盖度</span><span className="font-medium">{session.metrics.risk_label}</span></div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">研讨进行中...</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Spacer for mobile tab bar */}
      <div className="lg:hidden h-12 shrink-0" />
    </div>
  );
}

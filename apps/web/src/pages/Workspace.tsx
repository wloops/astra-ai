import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bot,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Grid2X2,
  LoaderCircle,
  MessageSquare,
  Pause,
  Play,
  Scale,
  ShieldCheck,
  Square,
  Target,
  User,
} from "lucide-react";
import { apiClient } from "../api/client";
import { subscribeToSessionEvents } from "../api/events";
import type { AgentRole, DiscussionSession, HostDecision, HumanReviewRequest, KnowledgeReference, Project, ScenarioTemplate, SessionEvent } from "../api/types";
import { Navbar } from "../components/dashboard/Navbar";
import { cn } from "../lib/utils";

interface AgentMessage {
  id: string;
  roleName: string;
  stage: string;
  content: string;
  targetContent: string;
  createdAt: string;
  roleCode: string | null;
  modelUsed?: string;
  streaming?: boolean;
  streamMode?: "single" | "none";
}

interface StageProgressItem {
  stage: string;
  added: boolean;
  skippedReason?: string;
  decisions?: StageDecisionSummary[];
}

interface StageDecisionSummary {
  id: string;
  label: string;
  reason: string;
}

interface DebateRoundView {
  id: string;
  roundIndex: number;
  speakerRoleCode: string;
  speakerName: string;
  respondsToRoleCode: string | null;
  stance: string;
  claim: string;
  evidence: string;
  risk: string;
  concession: string;
  modelUsed?: string;
}

interface DebateThreadView {
  id: string;
  participants: string[];
  conflictFocus: string[];
  plannedRounds: number;
  rounds: DebateRoundView[];
  moderation?: {
    judgement: string;
    consensus: string[];
    unresolvedConflicts: string[];
    nextAction: string;
  };
  completed?: {
    summary: string;
    keyDivergences: string[];
    convergedConclusions: string[];
  };
}

const roleIcons = [Bot, User, Code2, ShieldCheck];

type RoleStatus = "waiting" | "speaking" | "spoken" | "parallel" | "failed" | "removed";

const ROLE_STATUS_LABELS: Record<RoleStatus, string> = {
  waiting: "等待中",
  speaking: "发言中",
  spoken: "已发言",
  parallel: "并行处理中",
  failed: "失败",
  removed: "已移除",
};

const ROLE_STATUS_STYLES: Record<RoleStatus, string> = {
  waiting: "bg-slate-50 text-slate-500 border-slate-100",
  speaking: "bg-blue-50 text-blue-600 border-blue-100",
  spoken: "bg-emerald-50 text-emerald-600 border-emerald-100",
  parallel: "bg-indigo-50 text-indigo-600 border-indigo-100",
  failed: "bg-red-50 text-red-600 border-red-100",
  removed: "bg-slate-100 text-slate-400 border-slate-200",
};

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

function payloadText(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function eventRoleCode(event: SessionEvent): string | null {
  return event.role_code ?? (typeof event.payload.role_code === "string" ? event.payload.role_code : null);
}

function payloadStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function roleDisplayName(code: string | null | undefined, roles: AgentRole[]): string {
  if (!code) return "Agent";
  return roles.find((role) => role.code === code)?.name ?? code;
}

function buildDebateThreads(events: SessionEvent[], roles: AgentRole[]): DebateThreadView[] {
  const threads: DebateThreadView[] = [];
  let current: DebateThreadView | null = null;

  events
    .filter((event) => event.stage === "debate")
    .forEach((event) => {
      if (event.type === "debate_started") {
        current = {
          id: event.id,
          participants: payloadStringList(event.payload.participants),
          conflictFocus: payloadStringList(event.payload.conflict_focus),
          plannedRounds: typeof event.payload.planned_rounds === "number" ? event.payload.planned_rounds : 1,
          rounds: [],
        };
        threads.push(current);
        return;
      }

      if (!current && ["debate_round", "debate_moderated", "debate_completed"].includes(event.type)) {
        current = {
          id: `debate-${event.id}`,
          participants: [],
          conflictFocus: [],
          plannedRounds: 1,
          rounds: [],
        };
        threads.push(current);
      }
      if (!current) return;

      if (event.type === "debate_round") {
        const speakerRoleCode = payloadText(event.payload, "speaker_role_code") || event.role_code || "host";
        current.rounds.push({
          id: event.id,
          roundIndex: typeof event.payload.round_index === "number" ? event.payload.round_index : current.rounds.length + 1,
          speakerRoleCode,
          speakerName: roleDisplayName(speakerRoleCode, roles),
          respondsToRoleCode: payloadText(event.payload, "responds_to_role_code") || null,
          stance: payloadText(event.payload, "stance"),
          claim: payloadText(event.payload, "claim"),
          evidence: payloadText(event.payload, "evidence"),
          risk: payloadText(event.payload, "risk"),
          concession: payloadText(event.payload, "concession"),
          modelUsed: payloadText(event.payload, "model_used") || undefined,
        });
      }

      if (event.type === "debate_moderated") {
        current.moderation = {
          judgement: payloadText(event.payload, "judgement"),
          consensus: payloadStringList(event.payload.consensus),
          unresolvedConflicts: payloadStringList(event.payload.unresolved_conflicts),
          nextAction: payloadText(event.payload, "next_action"),
        };
      }

      if (event.type === "debate_completed") {
        current.completed = {
          summary: payloadText(event.payload, "summary"),
          keyDivergences: payloadStringList(event.payload.key_divergences),
          convergedConclusions: payloadStringList(event.payload.converged_conclusions),
        };
      }
    });

  return threads;
}

function revealNextChunk(content: string, target: string): string {
  if (content.length >= target.length) return content;
  return target.slice(0, Math.min(target.length, content.length + 4));
}

function stageWaitingPrompt(stage: string | null | undefined): string {
  if (!stage) return "正在等待研讨继续...";
  const prompts: Record<string, string> = {
    clarify_topic: "主持人正在澄清议题...",
    independent_review: "多位 Agent 正在并行独立评审...",
    detect_conflict: "正在识别争议点...",
    debate: "等待下一轮交叉辩论...",
    judge_and_summarize: "主持人正在裁决总结...",
    generate_actions: "正在生成行动项...",
    finalize_minutes: "正在生成会议纪要...",
  };
  return prompts[stage] ?? `正在推进 ${stageLabel(stage)}...`;
}

function asHostDecision(payload: Record<string, unknown>): HostDecision {
  return {
    action: String(payload.action ?? "NEXT_STAGE") as HostDecision["action"],
    reason: asText(payload.reason),
    question: typeof payload.question === "string" ? payload.question : null,
    blocking_level: typeof payload.blocking_level === "string" ? payload.blocking_level : null,
    options: Array.isArray(payload.options) ? payload.options.map(String) : [],
    default_on_timeout: typeof payload.default_on_timeout === "string" ? payload.default_on_timeout as HostDecision["default_on_timeout"] : null,
    default_answer: typeof payload.default_answer === "string" ? payload.default_answer : null,
    timeout_seconds: typeof payload.timeout_seconds === "number" ? payload.timeout_seconds : null,
    impact: typeof payload.impact === "string" ? payload.impact : null,
    query: typeof payload.query === "string" ? payload.query : null,
    stage: typeof payload.stage === "string" ? payload.stage : null,
    stage_name: typeof payload.stage_name === "string" ? payload.stage_name : null,
    stage_prompt: typeof payload.stage_prompt === "string" ? payload.stage_prompt : null,
    role_code: typeof payload.role_code === "string" ? payload.role_code : null,
    role_name: typeof payload.role_name === "string" ? payload.role_name : null,
    role_responsibility: typeof payload.role_responsibility === "string" ? payload.role_responsibility : null,
    roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
    phase: payload.phase === "initial_planning" ? "initial_planning" : payload.phase === "runtime" ? "runtime" : undefined,
    selected_role_codes: Array.isArray(payload.selected_role_codes) ? payload.selected_role_codes.map(String) : undefined,
    role_reasons: payload.role_reasons && typeof payload.role_reasons === "object" ? payload.role_reasons as Record<string, string> : undefined,
    model_used: typeof payload.model_used === "string" ? payload.model_used : null,
  };
}

function hostDecisionLabel(decision: HostDecision): string {
  if (decision.phase === "initial_planning") return "会前组队";
  if (decision.action === "REQUEST_HUMAN_REVIEW") return "人工确认";
  if (decision.action === "ADD_STAGE") return "新增阶段";
  if (decision.action === "SKIP_STAGE") return "跳过阶段";
  if (decision.action === "PULL_ROLE") return "补充角色";
  if (decision.action === "REMOVE_ROLE") return "移除角色";
  if (decision.action === "PARALLEL_RUN") return "并行推进";
  if (decision.action === "CONCLUDE") return "收束结论";
  return "主持判断";
}

function hostDecisionFallback(decision: HostDecision): string {
  if (decision.phase === "initial_planning" && decision.selected_role_codes?.length) {
    return `本轮参会角色：${decision.selected_role_codes.join("、")}`;
  }
  if (decision.action === "REQUEST_HUMAN_REVIEW" && decision.question) {
    return decision.question;
  }
  return "Host Agent 已给出阶段判断";
}

function asHumanReviewRequest(payload: Record<string, unknown>): HumanReviewRequest | null {
  if (typeof payload.id !== "string" || typeof payload.question !== "string") return null;
  return {
    id: payload.id,
    session_id: typeof payload.session_id === "string" ? payload.session_id : "",
    question: payload.question,
    reason: typeof payload.reason === "string" ? payload.reason : "",
    blocking_level: typeof payload.blocking_level === "string" ? payload.blocking_level : "medium",
    options: Array.isArray(payload.options) ? payload.options.map(String) : [],
    status: payload.status === "resolved" || payload.status === "timed_out" ? payload.status : "pending",
    response: payload.response && typeof payload.response === "object" ? payload.response as Record<string, unknown> : null,
    default_on_timeout:
      payload.default_on_timeout === "use_default" || payload.default_on_timeout === "abort_if_blocking"
        ? payload.default_on_timeout
        : "mark_open_question",
    default_answer: typeof payload.default_answer === "string" ? payload.default_answer : "",
    impact: typeof payload.impact === "string" ? payload.impact : "",
    requested_at: typeof payload.requested_at === "string" ? payload.requested_at : "",
    expires_at: typeof payload.expires_at === "string" ? payload.expires_at : null,
    resolved_at: typeof payload.resolved_at === "string" ? payload.resolved_at : null,
  };
}

function appendMessageOnce(current: AgentMessage[], message: AgentMessage): AgentMessage[] {
  return current.some((item) => item.id === message.id) ? current : [...current, message];
}

function splitNumberedItems(value: string): string[] {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const marked = text.replace(/\s*(\d+)[.、．]\s*/g, "\n$1. ");
  const parts = marked
    .split(/\n+/)
    .map((item) => item.replace(/^\d+[.、．]\s*/, "").trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [text];
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds} 秒`;
  return `${minutes} 分 ${seconds.toString().padStart(2, "0")} 秒`;
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
  const [pendingReview, setPendingReview] = useState<HumanReviewRequest | null>(null);
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(true);
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [reviewItemAnswers, setReviewItemAnswers] = useState<Record<number, string>>({});
  const [selectedReviewOption, setSelectedReviewOption] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [mobileTab, setMobileTab] = useState<'progress' | 'context' | 'monitor'>('progress');
  const sessionStatusRef = useRef<string | null>(null);
  const rolesRef = useRef<AgentRole[]>([]);
  const activeParallelStagesRef = useRef(new Set<string>());
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

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
        setPendingReview((current) => sessionData.pending_human_review ?? current);
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
        if (event.type === "parallel_start" && event.stage) {
          activeParallelStagesRef.current.add(event.stage);
        }
        if (event.type === "parallel_complete" && event.stage) {
          activeParallelStagesRef.current.delete(event.stage);
        }

        if (event.type === "human_review_requested") {
          const review = asHumanReviewRequest(event.payload);
          if (review) {
            setPendingReview(review);
            setReviewDrawerOpen(true);
            setReviewAnswer("");
            setReviewItemAnswers({});
            setSelectedReviewOption("");
            setReviewError(null);
            setSession((current) => (current ? { ...current, status: "paused" } : current));
            sessionStatusRef.current = "paused";
            setMessages((current) =>
              appendMessageOnce(current, {
                id: event.id,
                roleName: "host",
                stage: "human_review",
                content: `请求人工确认：${review.question}`,
                targetContent: `请求人工确认：${review.question}`,
                createdAt: event.created_at,
                roleCode: "host",
                streaming: false,
                streamMode: "none",
              }),
            );
          }
        }

        if (event.type === "human_review_resolved") {
          const review = asHumanReviewRequest(event.payload);
          setPendingReview(null);
          setReviewDrawerOpen(false);
          setReviewSubmitting(false);
          setReviewError(null);
          setSession((current) => (current ? { ...current, status: "running" } : current));
          sessionStatusRef.current = "running";
          setMessages((current) =>
            appendMessageOnce(current, {
              id: event.id,
              roleName: "host",
              stage: "human_review",
              content: `人工确认已完成：${review?.question ?? "用户回答已接收"}`,
              targetContent: `人工确认已完成：${review?.question ?? "用户回答已接收"}`,
              createdAt: event.created_at,
              roleCode: "host",
              streaming: false,
              streamMode: "none",
            }),
          );
        }

        if (event.type === "human_review_timeout") {
          const review = asHumanReviewRequest(event.payload);
          setPendingReview(null);
          setReviewDrawerOpen(false);
          setReviewSubmitting(false);
          setReviewError(null);
          setSession((current) => (current ? { ...current, status: "running" } : current));
          sessionStatusRef.current = "running";
          setMessages((current) =>
            appendMessageOnce(current, {
              id: event.id,
              roleName: "host",
              stage: "human_review",
              content: `人工确认超时：${review?.question ?? "已按超时策略继续"}`,
              targetContent: `人工确认超时：${review?.question ?? "已按超时策略继续"}`,
              createdAt: event.created_at,
              roleCode: "host",
              streaming: false,
              streamMode: "none",
            }),
          );
        }

        if (event.type === "agent_message_delta") {
          const messageId = payloadText(event.payload, "message_id") || event.id;
          const delta = payloadText(event.payload, "delta");
          const roleCode = eventRoleCode(event);
          const roleName = rolesRef.current.find((role) => role.code === roleCode)?.name ?? roleCode ?? "Agent";
          setMessages((current) => {
            const existing = current.find((message) => message.id === messageId);
            if (existing) {
              const targetContent = `${existing.targetContent || existing.content}${delta}`;
              return current.map((message) =>
                message.id === messageId
                  ? {
                      ...message,
                      content: revealNextChunk(message.content, targetContent),
                      targetContent,
                      createdAt: event.created_at,
                      streaming: true,
                      streamMode: "single",
                    }
                  : message,
              );
            }
            const content = revealNextChunk("", delta);
            return [
              ...current,
              {
                id: messageId,
                roleName,
                stage: event.stage ?? payloadText(event.payload, "stage"),
                content,
                targetContent: delta,
                createdAt: event.created_at,
                roleCode,
                modelUsed: typeof event.payload.model_used === "string" ? event.payload.model_used : undefined,
                streaming: content.length < delta.length,
                streamMode: "single",
              },
            ];
          });
        }

        if (event.type === "agent_message_done") {
          const messageId = payloadText(event.payload, "message_id") || event.id;
          const content = payloadText(event.payload, "content");
          const roleCode = eventRoleCode(event);
          const roleName = rolesRef.current.find((role) => role.code === roleCode)?.name ?? roleCode ?? "Agent";
          setMessages((current) => {
            const existing = current.find((message) => message.id === messageId);
            if (existing) {
              return current.map((message) =>
                message.id === messageId
                  ? {
                      ...message,
                      targetContent: content || message.targetContent || message.content,
                      createdAt: event.created_at,
                      streaming: message.content.length < (content || message.targetContent || message.content).length,
                      streamMode: "single",
                    }
                  : message,
              );
            }
            const visibleContent = revealNextChunk("", content);
            return [
              ...current,
              {
                id: messageId,
                roleName,
                stage: event.stage ?? payloadText(event.payload, "stage"),
                content: visibleContent,
                targetContent: content,
                createdAt: event.created_at,
                roleCode,
                modelUsed: typeof event.payload.model_used === "string" ? event.payload.model_used : undefined,
                streaming: visibleContent.length < content.length,
                streamMode: "single",
              },
            ];
          });
        }

        if (event.type === "agent_message") {
          const roleName = rolesRef.current.find((role) => role.code === event.role_code)?.name ?? event.role_code ?? "Agent";
          const messageId = payloadText(event.payload, "message_id");
          const fullContent = asText(event.payload);
          const isParallelMessage = Boolean(event.stage && activeParallelStagesRef.current.has(event.stage));
          setMessages((current) => {
            const existingId = messageId || event.id;
            const existing = current.find((m) => m.id === existingId || m.id === event.id);
            if (existing) {
              return current.map((message) =>
                message.id === existing.id
                  ? {
                      ...message,
                      targetContent: fullContent || message.targetContent,
                      streaming: !isParallelMessage && message.content.length < (fullContent || message.targetContent).length,
                      streamMode: isParallelMessage ? "none" : "single",
                    }
                  : message,
              );
            }
            const content = isParallelMessage ? fullContent : revealNextChunk("", fullContent);
            return [
              ...current,
              {
                id: existingId,
                roleName,
                stage: event.stage ?? "",
                content,
                targetContent: fullContent,
                createdAt: event.created_at,
                roleCode: event.role_code,
                modelUsed: typeof event.payload.model_used === "string" ? event.payload.model_used : undefined,
                streaming: !isParallelMessage && content.length < fullContent.length,
                streamMode: isParallelMessage ? "none" : "single",
              },
            ];
          });
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

  useEffect(() => {
    if (!messages.some((message) => message.streaming && message.streamMode === "single")) return;

    const timer = window.setInterval(() => {
      setMessages((current) =>
        current.map((message) => {
          if (!message.streaming || message.streamMode !== "single") return message;
          const targetContent = message.targetContent || message.content;
          const content = revealNextChunk(message.content, targetContent);
          return {
            ...message,
            content,
            streaming: content.length < targetContent.length,
          };
        }),
      );
    }, 35);

    return () => window.clearInterval(timer);
  }, [messages]);

  const stageItems = useMemo<StageProgressItem[]>(() => {
    const ordered = new Map<string, StageProgressItem>();
    const realStages = new Set<string>();
    (scenario?.stages ?? []).forEach((stage) => ordered.set(stage, { stage, added: false }));
    events.forEach((event) => {
      const stage = event.stage ?? undefined;
      if (stage && event.type !== "host_decision") {
        realStages.add(stage);
      }
      if ((event.type === "stage_started" || event.type === "stage_completed") && stage && !ordered.has(stage)) {
        ordered.set(stage, { stage, added: false });
      }
      if (event.type === "host_decision") {
        const decision = asHostDecision(event.payload);
        const decisionStage = decision.stage_name ?? decision.stage ?? undefined;
        if (decisionStage) {
          const existing = ordered.get(decisionStage) ?? { stage: decisionStage, added: decision.action === "ADD_STAGE" };
          if (decision.action === "NEXT_STAGE") {
            const orderedStages = Array.from(ordered.keys());
            const targetIndex = orderedStages.indexOf(decisionStage);
            orderedStages.slice(0, targetIndex).forEach((candidate) => {
              const skippedCandidate = ordered.get(candidate);
              if (skippedCandidate && !realStages.has(candidate) && !skippedCandidate.skippedReason) {
                ordered.set(candidate, { ...skippedCandidate, skippedReason: decision.reason || "该阶段已由主持人决策跳过" });
              }
            });
          }
          ordered.set(decisionStage, {
            ...existing,
            added: existing.added || decision.action === "ADD_STAGE",
            decisions: [
              ...(existing.decisions ?? []),
              {
                id: event.id,
                label: hostDecisionLabel(decision),
                reason: decision.reason || hostDecisionFallback(decision),
              },
            ],
          });
        }
      }
      if (event.type === "stage_added" && stage) {
        const existing = ordered.get(stage) ?? { stage, added: false };
        ordered.set(stage, { ...existing, added: true });
      }
      if (event.type === "stage_skipped" && stage) {
        const existing = ordered.get(stage) ?? { stage, added: false };
        ordered.set(stage, { ...existing, skippedReason: asText(event.payload.reason) });
      }
    });
    return Array.from(ordered.values());
  }, [events, scenario?.stages]);
  const stages = useMemo(() => stageItems.map((item) => item.stage), [stageItems]);
  const skippedStageReasons = useMemo(() => {
    const entries = stageItems
      .filter((item) => item.skippedReason)
      .map((item) => [item.stage, item.skippedReason as string] as const);
    return new Map(entries);
  }, [stageItems]);
  const activeRoleCodes = useMemo(() => {
    const initialCodes = new Set(
      roles.filter((role) => session?.role_ids.includes(role.id)).map((role) => role.code),
    );
    events.forEach((event) => {
      const roleCode = event.role_code ?? (typeof event.payload.role_code === "string" ? event.payload.role_code : null);
      if (!roleCode) return;
      if (event.type === "role_pulled") initialCodes.add(roleCode);
      if (event.type === "role_removed") initialCodes.delete(roleCode);
    });
    return initialCodes;
  }, [events, roles, session?.role_ids]);
  const roleStatuses = useMemo(() => {
    const statuses = new Map<string, RoleStatus>();
    activeRoleCodes.forEach((code) => statuses.set(code, "waiting"));

    events.forEach((event) => {
      const roleCode = eventRoleCode(event);
      if (event.type === "stage_started" && event.stage && activeRoleCodes.has("host")) {
        statuses.set("host", "speaking");
      }
      if (event.type === "parallel_start") {
        const parallelRoles = Array.isArray(event.payload.roles) ? event.payload.roles.map(String) : [];
        parallelRoles.forEach((code) => {
          if (activeRoleCodes.has(code)) statuses.set(code, "parallel");
        });
      }
      if (event.type === "agent_message_delta" && roleCode) {
        statuses.set(roleCode, "speaking");
      }
      if ((event.type === "agent_message_done" || event.type === "agent_message") && roleCode) {
        statuses.set(roleCode, "spoken");
      }
      if (event.type === "tool_event" && roleCode && event.payload.error) {
        statuses.set(roleCode, "failed");
      }
      if (event.type === "role_removed" && roleCode) {
        statuses.set(roleCode, "removed");
      }
      if (event.type === "parallel_complete") {
        activeRoleCodes.forEach((code) => {
          if (statuses.get(code) === "parallel") statuses.set(code, "waiting");
        });
      }
      if (event.type === "session_completed" || event.type === "session_failed") {
        activeRoleCodes.forEach((code) => {
          if (statuses.get(code) === "speaking" || statuses.get(code) === "parallel") statuses.set(code, "waiting");
        });
      }
    });

    return statuses;
  }, [activeRoleCodes, events]);
  const debateThreads = useMemo(() => buildDebateThreads(events, roles), [events, roles]);
  const eventBackedStages = useMemo(() => {
    const backed = new Set<string>();
    events.forEach((event) => {
      if (event.stage && event.type !== "host_decision") backed.add(event.stage);
    });
    return backed;
  }, [events]);
  const latestStartedStage = [...events]
    .reverse()
    .find((event) => event.type === "stage_started" && event.stage)?.stage;
  const terminal = session?.status === "completed" || session?.status === "failed";
  const active = session?.status === "pending" || session?.status === "running" || session?.status === "paused";
  const currentStage = terminal ? session?.current_stage ?? "" : latestStartedStage ?? session?.current_stage ?? "";
  const completedStages = useMemo(() => {
    const completed = new Set(
      events.filter((event) => event.type === "stage_completed" && event.stage).map((event) => event.stage as string),
    );
    skippedStageReasons.forEach((_, stage) => completed.add(stage));
    const currentIndex = stages.indexOf(currentStage);

    // 后端不会为所有阶段发 stage_completed；展示层用阶段顺序补齐已越过的阶段。
    if (currentIndex > 0) {
      stages.slice(0, currentIndex).forEach((stage) => {
        if (eventBackedStages.has(stage)) completed.add(stage);
      });
    }
    if (session?.status === "completed") {
      stages.forEach((stage) => {
        if (eventBackedStages.has(stage)) completed.add(stage);
      });
    }
    if (session?.status === "failed" && currentStage) {
      stages.slice(0, Math.max(currentIndex, 0)).forEach((stage) => {
        if (eventBackedStages.has(stage)) completed.add(stage);
      });
    }

    return completed;
  }, [currentStage, eventBackedStages, events, session?.status, skippedStageReasons, stages]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), pendingReview ? 1_000 : 30_000);
    return () => window.clearInterval(timer);
  }, [active, pendingReview]);

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
  const visibleRoleCount = activeRoleCodes.size;
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
  const reviewQuestionItems = pendingReview ? splitNumberedItems(pendingReview.question) : [];
  const reviewRequestedAt = parseBackendDate(pendingReview?.requested_at);
  const reviewExpiresAt = parseBackendDate(pendingReview?.expires_at);
  const reviewRemainingMs = reviewExpiresAt ? Math.max(0, reviewExpiresAt.getTime() - nowMs) : null;
  const reviewTotalMs =
    reviewRequestedAt && reviewExpiresAt
      ? Math.max(1, reviewExpiresAt.getTime() - reviewRequestedAt.getTime())
      : null;
  const reviewCountdownPercent =
    reviewRemainingMs !== null && reviewTotalMs !== null
      ? Math.max(0, Math.min(100, Math.round((reviewRemainingMs / reviewTotalMs) * 100)))
      : 0;
  const reviewExpired = reviewRemainingMs !== null && reviewRemainingMs <= 0;
  const currentStageText =
    session?.status === "completed" ? "研讨已完成" : session?.status === "failed" ? "研讨失败" : session?.status === "paused" ? "等待人工确认" : currentStage ? stageLabel(currentStage) : "等待开始";
  const showCenteredWaiting = messages.length === 0 && active && !isLoading;
  const showBottomWaiting = messages.length > 0 && active;
  const waitingPrompt = pendingReview ? "等待人工确认后继续研讨..." : stageWaitingPrompt(currentStage);
  const controlBarStatus = pendingReview
    ? "等待人工确认"
    : session?.status === "completed"
      ? "研讨已完成"
      : session?.status === "failed"
        ? "研讨失败"
        : currentStage
          ? stageLabel(currentStage)
          : "等待会议状态";
  const controlBarDetail = pendingReview
    ? reviewQuestionItems.length > 1
      ? `${reviewQuestionItems.length} 个待确认项`
      : pendingReview.question
    : session?.status === "completed"
      ? "可查看会议结果"
      : session?.status === "failed"
        ? session.error_message ?? "请查看失败原因"
        : waitingPrompt;
  const sessionControlActions = [
    {
      label: "暂停研讨",
      icon: Pause,
      disabled: true,
      reason: "暂停接口待接入",
    },
    {
      label: "继续研讨",
      icon: Play,
      disabled: !pendingReview,
      reason: pendingReview ? "展开人工确认后提交继续" : "暂无待确认事项",
      onClick: () => setReviewDrawerOpen(true),
    },
    {
      label: "结束研讨",
      icon: Square,
      disabled: true,
      reason: "结束接口待接入",
    },
  ];
  const showCompletedNotice = session?.status === "completed";
  const showFailedNotice = session?.status === "failed";
  const loadContextEvent = events.find((event) => event.type === "stage_completed" && event.stage === "load_context");
  const latestToolTime = loadContextEvent?.created_at ?? events[events.length - 1]?.created_at;
  const policyToolDone = Boolean(loadContextEvent || terminal);
  const latestKnowledgeEvent = [...events].reverse().find((event) => event.type === "knowledge_referenced");
  const knowledgeMatches = (
    Array.isArray(latestKnowledgeEvent?.payload.matches) ? latestKnowledgeEvent?.payload.matches : []
  ) as unknown as KnowledgeReference[];
  const similarCaseToolDone = Boolean(latestKnowledgeEvent);
  const similarCaseRunning = active && !latestKnowledgeEvent;
  const similarCaseTime = latestKnowledgeEvent?.created_at ?? events[events.length - 1]?.created_at;
  const scrollMessagesToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  };
  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom < 96;
    shouldAutoScrollRef.current = atBottom;
    setShowScrollToBottom(!atBottom);
  };

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    scrollMessagesToBottom("smooth");
  }, [messages, waitingPrompt, showBottomWaiting, showCompletedNotice, showFailedNotice]);

  async function submitHumanReview() {
    if (!pendingReview || reviewSubmitting) return;
    if (reviewExpired) {
      setReviewError("该确认请求已超时，正在等待后端按超时策略继续。");
      return;
    }
    const itemAnswers = reviewQuestionItems
      .map((question, index) => {
        const answer = reviewItemAnswers[index]?.trim();
        return answer ? `${index + 1}. ${question}\n确认：${answer}` : "";
      })
      .filter(Boolean);
    const answer = [
      selectedReviewOption.trim() ? `选择口径：${selectedReviewOption.trim()}` : "",
      ...itemAnswers,
      reviewAnswer.trim() ? `补充说明：${reviewAnswer.trim()}` : "",
    ].filter(Boolean).join("\n\n");
    if (!answer) {
      setReviewError("请填写至少一个待确认项、选择一个口径或补充说明。");
      return;
    }
    try {
      setReviewSubmitting(true);
      setReviewError(null);
      await apiClient.respondHumanReview(sessionId, pendingReview.id, {
        answer,
        selected_option: selectedReviewOption || null,
      });
    } catch (err) {
      setReviewSubmitting(false);
      setReviewError(err instanceof Error ? err.message : "提交人工确认失败");
    }
  }

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
      {pendingReview && reviewDrawerOpen && (
        <div className="fixed inset-x-0 bottom-24 top-20 z-[90] flex items-end justify-center bg-slate-900/25 px-4">
          <div className="flex max-h-[min(70dvh,640px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-blue-100 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">人工确认</div>
                  <h2 className="mt-1 text-lg font-bold leading-snug text-slate-900">
                    {reviewQuestionItems.length > 1 ? "请确认以下决策口径" : pendingReview.question}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {pendingReview.blocking_level}
                </span>
              </div>
              {reviewRemainingMs !== null && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-blue-700">剩余确认时间</span>
                    <span className={cn("font-mono font-semibold", reviewExpired ? "text-red-600" : "text-blue-700")}>
                      {reviewExpired ? "已超时" : formatCountdown(reviewRemainingMs)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-1000", reviewExpired ? "bg-red-500" : "bg-blue-600")}
                      style={{ width: `${reviewCountdownPercent}%` }}
                    />
                  </div>
                  {pendingReview.expires_at && (
                    <div className="mt-2 text-xs text-slate-500">超时时间：{formatDateTime(pendingReview.expires_at)}</div>
                  )}
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {reviewQuestionItems.length > 1 && (
                <section className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500">待确认项</div>
                  <div className="space-y-2">
                    {reviewQuestionItems.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                        <div className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-600">
                            {index + 1}
                          </span>
                          <span className="leading-relaxed">{item}</span>
                        </div>
                        <textarea
                          value={reviewItemAnswers[index] ?? ""}
                          onChange={(event) =>
                            setReviewItemAnswers((current) => ({ ...current, [index]: event.target.value }))
                          }
                          rows={2}
                          disabled={reviewExpired}
                          className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                          placeholder={`填写第 ${index + 1} 项确认口径`}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <div className="space-y-3 text-sm text-slate-600">
                {pendingReview.reason && <p className="leading-relaxed">{pendingReview.reason}</p>}
                {pendingReview.impact && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold text-slate-500">影响范围</div>
                    <div className="mt-1 text-slate-700">{pendingReview.impact}</div>
                  </div>
                )}
              </div>
              {pendingReview.options.length > 0 && (
                <section className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500">可选确认口径</div>
                  {pendingReview.options.map((option) => {
                    const optionItems = splitNumberedItems(option);
                    return (
                      <label
                        key={option}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50"
                      >
                        <input
                          type="radio"
                          name="human-review-option"
                          value={option}
                          checked={selectedReviewOption === option}
                          disabled={reviewExpired}
                          className="mt-1"
                          onChange={() => {
                            setSelectedReviewOption(option);
                          }}
                        />
                        <span className="space-y-1 leading-relaxed">
                          {optionItems.length > 1 ? (
                            optionItems.map((item, index) => (
                              <span key={`${item}-${index}`} className="block">
                                <span className="mr-1 font-semibold text-slate-500">{index + 1}.</span>
                                {item}
                              </span>
                            ))
                          ) : (
                            option
                          )}
                        </span>
                      </label>
                    );
                  })}
                </section>
              )}
              <textarea
                value={reviewAnswer}
                onChange={(event) => setReviewAnswer(event.target.value)}
                rows={4}
                disabled={reviewExpired}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                placeholder="补充说明，或在上方逐项填写确认口径"
              />
              {reviewError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{reviewError}</div>}
            </div>
          </div>
        </div>
      )}
      <Navbar activePage="工作台" />
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <aside className="hidden lg:flex lg:flex-col w-[320px] gap-4 overflow-y-auto pr-1 shrink-0">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">多 Agent 智能研讨中</h2>
              </div>
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
              {stageItems.map((item, index) => {
                const stage = item.stage;
                const completed = completedStages.has(stage);
                const skipped = skippedStageReasons.has(stage);
                const current = currentStage === stage && !completed && !skipped;
                return (
                  <div key={stage} className="relative flex items-start gap-4">
                    <div
                      className={cn(
                        "relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ring-4 ring-white",
                        skipped
                          ? "bg-slate-200 text-slate-500"
                          : completed || current
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-400 border border-slate-200",
                      )}
                    >
                      {completed && !skipped ? <Check className="w-3.5 h-3.5" /> : index + 1}
                    </div>
                    <div
                      className={cn("flex flex-col -mt-0.5", completed || current ? "opacity-100" : "opacity-50")}
                      title={skippedStageReasons.get(stage)}
                    >
                      <span className={cn("text-sm font-medium", current ? "text-blue-600" : "text-slate-800")}>
                        {stageLabel(stage)}
                        {item.added && <span className="ml-1 text-[10px] text-blue-500">新增</span>}
                      </span>
                      <span className="text-xs text-slate-400">{skipped ? "已跳过" : completed ? "已完成" : current ? "进行中" : "等待中"}</span>
                      {skipped && (
                        <span className="mt-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] leading-snug text-slate-600">
                          已跳过：{skippedStageReasons.get(stage)}
                        </span>
                      )}
                      {item.decisions?.slice(-2).map((decision) => (
                        <span key={decision.id} className="mt-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] leading-snug text-blue-700">
                          <span className="font-semibold">{decision.label}：</span>
                          <span>{decision.reason}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 shrink-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <MessageSquare className="w-4 h-4 shrink-0 text-slate-500" />
                <h3 className="truncate font-semibold text-slate-900">Agent 发言流</h3>
              </div>
              <div className="flex shrink-0 items-center gap-1.5" aria-label="研讨控制">
                {sessionControlActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      aria-label={action.label}
                      title={action.disabled ? action.reason : action.label}
                      disabled={action.disabled}
                      onClick={action.onClick}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
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
                .filter((role) => activeRoleCodes.has(role.code))
                .map((role, index) => {
                  const Icon = roleIcons[index % roleIcons.length];
                  const status = roleStatuses.get(role.code) ?? "waiting";
                  return (
                    <div key={role.id} className="min-w-[200px] max-w-[240px] flex-1 border border-slate-100 rounded-xl p-3 bg-white">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-slate-800 text-sm truncate">{role.name}</span>
                        </div>
                        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", ROLE_STATUS_STYLES[status])}>
                          {status === "speaking" && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />}
                          {ROLE_STATUS_LABELS[status]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-snug line-clamp-2">{role.description}</p>
                    </div>
                  );
                })}
            </div>
          </div>

          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            aria-label="Agent 发言列表"
            className="relative flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-y-auto p-6 pb-4 space-y-6"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
                {isLoading || showCenteredWaiting ? <LoaderCircle className="w-5 h-5 animate-spin text-blue-500" /> : null}
                <span>
                  {isLoading
                    ? "正在加载会议..."
                    : showCenteredWaiting
                      ? waitingPrompt
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
                  <div className="text-sm text-slate-700 leading-relaxed max-w-[90%]">
                    {message.content}
                    {message.streaming && <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-blue-500 align-[-2px]" />}
                  </div>
                </div>
              </div>
            ))}
            {debateThreads.map((thread) => (
              <section
                key={thread.id}
                aria-label="交叉辩论过程"
                className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">交叉辩论过程</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {thread.participants.length > 0
                        ? `参与角色：${thread.participants.map((code) => roleDisplayName(code, roles)).join("、")}`
                        : "从历史事件重建"}
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-indigo-700">
                    {thread.completed ? "已完成" : `${thread.rounds.length}/${thread.plannedRounds} 轮`}
                  </span>
                </div>
                {thread.conflictFocus.length > 0 && (
                  <div className="mb-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-600">
                    焦点：{thread.conflictFocus.join("；")}
                  </div>
                )}
                <div className="space-y-3">
                  {thread.rounds.map((round) => (
                    <div key={round.id} className="rounded-xl border border-white bg-white p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-900">{round.speakerName}</span>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                          第 {round.roundIndex} 轮
                        </span>
                        {round.respondsToRoleCode && (
                          <span className="text-slate-500">回应 {roleDisplayName(round.respondsToRoleCode, roles)}</span>
                        )}
                        {round.modelUsed && <span className="text-slate-400">{round.modelUsed}</span>}
                      </div>
                      <p className="text-sm leading-relaxed text-slate-700">{round.claim}</p>
                      {(round.evidence || round.risk || round.concession) && (
                        <div className="mt-2 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                          {round.evidence && <span>证据：{round.evidence}</span>}
                          {round.risk && <span>风险：{round.risk}</span>}
                          {round.concession && <span>让步：{round.concession}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {thread.moderation && (
                  <div className="mt-3 rounded-xl border border-blue-100 bg-white p-3 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">主持人收束</div>
                    <p className="mt-1">{thread.moderation.judgement}</p>
                    {(thread.moderation.consensus.length > 0 || thread.moderation.unresolvedConflicts.length > 0) && (
                      <div className="mt-2 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                        {thread.moderation.consensus.length > 0 && <span>共识：{thread.moderation.consensus.join("；")}</span>}
                        {thread.moderation.unresolvedConflicts.length > 0 && <span>分歧：{thread.moderation.unresolvedConflicts.join("；")}</span>}
                      </div>
                    )}
                  </div>
                )}
                {thread.completed && (
                  <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {thread.completed.summary}
                  </div>
                )}
              </section>
            ))}
            {showBottomWaiting && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-600">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                {waitingPrompt}
              </div>
            )}
            {showScrollToBottom && (
              <button
                type="button"
                aria-label="滚动到底部"
                onClick={() => {
                  shouldAutoScrollRef.current = true;
                  setShowScrollToBottom(false);
                  scrollMessagesToBottom("smooth");
                }}
                className="sticky bottom-3 ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-600 shadow-lg hover:bg-blue-50"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
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
          {session && (
            <div className="shrink-0">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-lg">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", pendingReview ? "bg-amber-500" : terminal ? "bg-emerald-500" : "bg-blue-500")} />
                    <span className="text-sm font-semibold text-slate-900">{controlBarStatus}</span>
                    {pendingReview && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {pendingReview.blocking_level}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-3 text-xs text-slate-500">
                    <span className="truncate">{controlBarDetail}</span>
                    {pendingReview && reviewRemainingMs !== null && (
                      <span className={cn("shrink-0 font-mono font-semibold", reviewExpired ? "text-red-600" : "text-blue-600")}>
                        {reviewExpired ? "已超时" : formatCountdown(reviewRemainingMs)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={!pendingReview}
                    onClick={() => setReviewDrawerOpen((open) => !open)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingReview ? (reviewDrawerOpen ? "收起面板" : "展开确认") : "人工确认"}
                  </button>
                  <button
                    type="button"
                    onClick={submitHumanReview}
                    disabled={!pendingReview || reviewSubmitting || reviewExpired}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!pendingReview ? "暂无待确认" : reviewExpired ? "等待超时处理" : reviewSubmitting ? "提交中..." : "提交确认"}
                  </button>
                </div>
              </div>
            </div>
          )}
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
                  <div className="text-xs text-slate-400">{formatShortTime(similarCaseTime)}</div>
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
                  {similarCaseToolDone ? `找到 ${knowledgeMatches.length} 个案例` : similarCaseRunning ? "检索中" : "等待中"}
                </span>
              </div>
              {similarCaseToolDone && (
                <div className="ml-11 space-y-2">
                  {knowledgeMatches.length ? (
                    knowledgeMatches.slice(0, 3).map((item) => (
                      <Link
                        key={item.entry_id}
                        to={`/session-result?sessionId=${encodeURIComponent(item.source_session_id ?? "")}`}
                        className="block rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:border-blue-100 hover:bg-blue-50/50"
                      >
                        <div className="truncate text-xs font-medium text-slate-800">{item.topic}</div>
                        <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{item.conclusion}</div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">暂无匹配历史案例</div>
                  )}
                </div>
              )}
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
                {stageItems.map((item, index) => {
                  const stage = item.stage;
                  const completed = completedStages.has(stage);
                  const skipped = skippedStageReasons.has(stage);
                  const current = currentStage === stage && !completed && !skipped;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                        skipped ? 'bg-slate-200 text-slate-500' : completed || current ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200',
                      )}>
                        {completed && !skipped ? <Check className="w-3.5 h-3.5" /> : index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn('text-sm', current ? 'text-blue-600 font-medium' : 'text-slate-700')}>
                          {stageLabel(stage)}
                          {item.added && <span className="ml-1 text-[10px] text-blue-500">新增</span>}
                        </span>
                        <span className="text-xs text-slate-400">{skipped ? '已跳过' : completed ? '已完成' : current ? '进行中' : '等待中'}</span>
                        {skipped && (
                          <span className="mt-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] leading-snug text-slate-600">
                            已跳过：{skippedStageReasons.get(stage)}
                          </span>
                        )}
                        {item.decisions?.slice(-1).map((decision) => (
                          <span key={decision.id} className="mt-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] leading-snug text-blue-700">
                            <span className="font-semibold">{decision.label}：</span>
                            <span>{decision.reason}</span>
                          </span>
                        ))}
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

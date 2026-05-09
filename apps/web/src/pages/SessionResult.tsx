import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  HelpCircle,
  ListTodo,
  Scale,
  ShieldAlert,
  User,
} from "lucide-react";
import { apiClient } from "../api/client";
import type { ScenarioTemplate, SessionResult as SessionResultData } from "../api/types";
import { Navbar } from "../components/dashboard/Navbar";
import { PromoteDialog } from "../components/tasks/PromoteDialog";

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function questionText(value: string | Record<string, unknown>, index: number): string {
  if (typeof value === "string") return value;
  return text(value.question, text(value.title, `待确认问题 ${index + 1}`));
}

function questionMeta(value: string | Record<string, unknown>) {
  if (typeof value === "string") return null;
  return {
    source: text(value.source),
    blocking: text(value.blocking_level),
    impact: text(value.impact),
    status: text(value.status),
  };
}

function listText(value: unknown): string {
  return Array.isArray(value) ? value.map(String).filter(Boolean).join("；") : text(value);
}

export function SessionResult() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") ?? "";
  const [result, setResult] = useState<SessionResultData | null>(null);
  const [scenario, setScenario] = useState<ScenarioTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState<string | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteMessage, setPromoteMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function loadResult() {
      try {
        setIsLoading(true);
        setError(null);
        const [data, sessionData, scenarioList] = await Promise.all([
          apiClient.getSessionResult(sessionId),
          apiClient.getSession(sessionId),
          apiClient.listScenarioTemplates(),
        ]);
        if (!cancelled) {
          setResult(data);
          setScenario(scenarioList.items.find((item) => item.id === sessionData.scenario_id) ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "结果尚未生成");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadResult();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar activePage="会议历史" />
        <main className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">缺少 Session ID</h1>
          <p className="text-slate-500 mb-6">请从会议进行页进入结果页。</p>
          <Link to="/start-session" className="inline-flex px-5 py-3 rounded-xl bg-blue-600 text-white font-medium">
            发起研讨
          </Link>
        </main>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar activePage="会议历史" />
        <main className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            {isLoading ? "正在读取会议结果" : "结果尚未生成"}
          </h1>
          {error && <p className="text-slate-500 mb-6">{error}</p>}
          <Link
            to={`/workspace?sessionId=${encodeURIComponent(sessionId)}`}
            className="inline-flex px-5 py-3 rounded-xl bg-blue-600 text-white font-medium"
          >
            返回会议进行页
          </Link>
        </main>
      </div>
    );
  }

  const actualFlow = result.actual_flow ?? [];
  const suggestedFlow = scenario?.stages ?? [];
  const skippedStages = new Map((result.skipped_stages ?? []).map((item) => [item.stage, item.reason]));
  const addedStages = new Set((result.added_stages ?? []).map((item) => item.stage));
  const hasFlowData = actualFlow.length > 0;
  const debateTrace = result.debate_trace ?? [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar activePage="会议历史" />

      <main className="max-w-[1600px] mx-auto px-6 xl:px-12 py-6 pb-12">
        <div className="flex items-center justify-between mb-4">
          <Link
            to={`/workspace?sessionId=${encodeURIComponent(sessionId)}`}
            className="flex items-center text-blue-600 font-medium text-sm gap-1 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </Link>
          <div className="text-slate-500 text-sm">
            生成时间 {new Date(result.created_at).toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
          <div className="flex items-center gap-5 lg:w-1/3">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-teal-500" fill="currentColor" stroke="white" strokeWidth={1} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">本次研讨已完成</h2>
              <p className="text-slate-500 mt-1 text-sm">后端已生成结构化 SessionResult</p>
            </div>
          </div>

          <div className="flex-1 lg:px-8 lg:border-x border-slate-100">
            <h3 className="text-slate-900 font-semibold mb-2">最终结论摘要</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{result.final_conclusion}</p>
          </div>

          <div className="grid grid-cols-3 gap-6 lg:w-[30%] text-center">
            <div>
              <div className="text-xs text-slate-500 mb-2">关键争议</div>
              <div className="text-2xl font-bold text-slate-900">{result.key_conflicts.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">角色观点</div>
              <div className="text-2xl font-bold text-slate-900">{result.role_summaries.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">行动项</div>
              <div className="text-2xl font-bold text-slate-900">{result.actions.length}</div>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6">
          <h3 className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            研讨流程
          </h3>
          {hasFlowData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-slate-700 mb-3">实际执行流程</div>
                <div className="flex flex-wrap gap-2">
                  {actualFlow.map((stage) => (
                    <span
                      key={stage}
                      title={skippedStages.get(stage)}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium",
                        skippedStages.has(stage)
                          ? "bg-slate-100 text-slate-500"
                          : addedStages.has(stage)
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700",
                      ].join(" ")}
                    >
                      {stage}
                      {skippedStages.has(stage) ? " · 已跳过" : addedStages.has(stage) ? " · 新增" : ""}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700 mb-3">场景建议流程</div>
                <div className="flex flex-wrap gap-2">
                  {suggestedFlow.map((stage) => (
                    <span key={stage} className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {stage}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">该研讨使用旧版流程，暂无流程对比数据。</p>
          )}
        </section>

        {debateTrace.length > 0 && (
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6">
            <h3 className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
              <Scale className="w-5 h-5 text-indigo-600" />
              关键辩论追溯
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {debateTrace.map((item, index) => (
                <div key={index} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">
                    {text(item.title, text(item.summary, `辩论记录 ${index + 1}`))}
                  </div>
                  <div className="mt-2 space-y-1">
                    {item.speaker_role_code && <div>角色：{text(item.speaker_role_code)}</div>}
                    {item.stance && <div>立场：{text(item.stance)}</div>}
                    {item.claim && <div>主张：{text(item.claim)}</div>}
                    {item.judgement && <div>主持人收束：{text(item.judgement)}</div>}
                    {item.key_divergences && <div>关键分歧：{listText(item.key_divergences)}</div>}
                    {item.converged_conclusions && <div>收敛结论：{listText(item.converged_conclusions)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              最终结论
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{result.final_conclusion}</p>
          </section>

          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
              <Scale className="w-5 h-5 text-blue-600" />
              关键争议
            </h3>
            <div className="space-y-3">
              {result.key_conflicts.map((item, index) => (
                <div key={index} className="text-sm text-slate-600">
                  <div className="font-medium text-slate-900">{text(item.title, `争议 ${index + 1}`)}</div>
                  <div>支持方：{text(item.supporting_view)}</div>
                  <div>审慎方：{text(item.cautious_view)}</div>
                  <div className="text-blue-700">裁决：{text(item.judgement)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
              <ShieldAlert className="w-5 h-5 text-purple-600" />
              风险
            </h3>
            <div className="space-y-2">
              {result.risks.map((risk, index) => (
                <div key={index} className="flex justify-between gap-3 text-sm text-slate-600 border-b border-slate-50 pb-2">
                  <span>{text(risk.name, text(risk.title, `风险 ${index + 1}`))}</span>
                  <span className="text-xs text-orange-600">{text(risk.level)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              待确认问题
            </h3>
            <ul className="text-sm text-slate-700 space-y-2">
              {result.open_questions.map((question, index) => (
                <li key={`${questionText(question, index)}-${index}`} className="flex gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full mt-2 shrink-0" />
                  <span>
                    {questionText(question, index)}
                    {questionMeta(question) && (
                      <span className="mt-1 block text-xs text-slate-400">
                        {[questionMeta(question)?.status, questionMeta(question)?.blocking, questionMeta(question)?.source]
                          .filter(Boolean)
                          .join(" · ")}
                        {questionMeta(question)?.impact ? ` · ${questionMeta(question)?.impact}` : ""}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section>
              <h3 className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
                <User className="w-5 h-5 text-blue-600" />
                角色观点摘要
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {result.role_summaries.map((role, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="font-semibold text-slate-900 text-sm mb-2">
                      {text(role.role_name, text(role.role_code, `角色 ${index + 1}`))}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{text(role.summary, text(role.recommendation))}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
                <ListTodo className="w-5 h-5 text-blue-600" />
                行动项
                <button
                  onClick={() => setPromoteOpen(true)}
                  className="ml-auto rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  转为任务
                </button>
              </h3>
              {promoteMessage && (
                <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {promoteMessage}
                  <Link to="/task-board" className="ml-3 text-blue-700 hover:underline">查看任务看板</Link>
                </div>
              )}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium w-12">#</th>
                      <th className="px-4 py-3 font-medium">行动项</th>
                      <th className="px-4 py-3 font-medium w-36">负责人</th>
                      <th className="px-4 py-3 font-medium w-28">优先级</th>
                      <th className="px-4 py-3 font-medium w-28">状态</th>
                      <th className="px-4 py-3 font-medium w-28">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.actions.map((action, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 text-slate-800">{text(action.title)}</td>
                        <td className="px-4 py-3 text-slate-600">{text(action.owner)}</td>
                        <td className="px-4 py-3 text-slate-600">{text(action.priority)}</td>
                        <td className="px-4 py-3 text-slate-600">{text(action.status)}</td>
                        <td className="px-4 py-3">
                          {action.blocked_by_open_question && (
                            <div className="mb-1 text-[11px] text-amber-600">依赖待确认问题</div>
                          )}
                          <button
                            onClick={() => {
                              apiClient.promoteActions(sessionId, [index]).then((response) => {
                                setPromoteMessage(`已创建 ${response.created} 个任务，跳过 ${response.skipped} 个。`);
                              });
                            }}
                            className="rounded-md border border-blue-100 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            转为任务
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="lg:col-span-1 h-full flex flex-col">
            <h3 className="text-slate-900 font-semibold flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              AI 生成纪要
              <span className="text-xs font-normal text-slate-500">(Markdown 预览)</span>
            </h3>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex-1 overflow-auto max-h-[800px]">
              <div className="font-mono text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {result.markdown_minutes}
              </div>
            </div>
          </section>
        </div>
      </main>
      <PromoteDialog
        open={promoteOpen}
        actions={result.actions}
        onClose={() => setPromoteOpen(false)}
        onPromote={(indices) => apiClient.promoteActions(sessionId, indices)}
      />
    </div>
  );
}

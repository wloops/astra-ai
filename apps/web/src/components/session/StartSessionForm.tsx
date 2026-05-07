import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  CheckSquare,
  Code,
  FileSearch,
  FileText,
  Folder,
  Folders,
  HelpCircle,
  Info,
  Rocket,
  User,
  Users,
} from "lucide-react";
import { apiClient } from "../../api/client";
import type { AgentRole, Project, ScenarioTemplate } from "../../api/types";
import { cn } from "../../lib/utils";

const roleIcons = [Bot, User, Code, FileSearch];

export function StartSessionForm() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [roles, setRoles] = useState<AgentRole[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioTemplate[]>([]);
  const [projectId, setProjectId] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [topic, setTopic] = useState("是否允许 200 元以下打车或餐饮发票自动结算？");
  const [supplementalNotes, setSupplementalNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setIsLoading(true);
        setError(null);
        const [projectList, roleList, scenarioList] = await Promise.all([
          apiClient.listProjects(),
          apiClient.listAgentRoles(),
          apiClient.listScenarioTemplates(),
        ]);
        if (cancelled) return;

        setProjects(projectList.items);
        setRoles(roleList.items);
        setScenarios(scenarioList.items);
        setProjectId(projectList.items[0]?.id ?? "");
        setScenarioId(scenarioList.items[0]?.id ?? "");
        setRoleIds(roleList.items.filter((role) => role.is_default).map((role) => role.id));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载后端数据失败");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId), [projects, projectId]);
  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === scenarioId),
    [scenarios, scenarioId],
  );

  const toggleRole = (roleId: string) => {
    setRoleIds((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId],
    );
  };

  const handleSubmit = async () => {
    if (!projectId || !scenarioId || !topic.trim()) {
      setError("请选择项目、场景，并填写研讨议题。");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const session = await apiClient.createSession({
        project_id: projectId,
        scenario_id: scenarioId,
        topic: topic.trim(),
        role_ids: roleIds,
        supplemental_notes: supplementalNotes.trim(),
      });
      navigate(`/workspace?sessionId=${encodeURIComponent(session.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建 Session 失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto w-full">
        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6">发起研讨会议</h2>

          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <label className="flex items-start md:items-center py-2">
              <div className="w-[80px] shrink-0 flex items-center gap-2 text-slate-600 font-medium text-sm">
                <Folder className="w-4 h-4" />
                <span>项目</span>
              </div>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                disabled={isLoading}
                className="flex-1 ml-4 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="h-px bg-slate-100 w-full" />

            <label className="flex items-start md:items-center py-2">
              <div className="w-[80px] shrink-0 flex items-center gap-2 text-slate-600 font-medium text-sm">
                <Folders className="w-4 h-4" />
                <span>场景</span>
              </div>
              <select
                value={scenarioId}
                onChange={(event) => setScenarioId(event.target.value)}
                disabled={isLoading}
                className="flex-1 ml-4 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="h-px bg-slate-100 w-full" />

            <label className="flex items-start py-2">
              <div className="w-[80px] shrink-0 flex items-center gap-2 text-slate-600 font-medium text-sm pt-2">
                <HelpCircle className="w-4 h-4" />
                <span>议题</span>
              </div>
              <div className="flex-1 pl-4 relative">
                <textarea
                  className="w-full h-[100px] bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all placeholder-slate-400"
                  value={topic}
                  maxLength={500}
                  onChange={(event) => setTopic(event.target.value)}
                />
                <div className="absolute bottom-3 right-3 text-xs text-slate-400 font-medium">
                  {topic.length}/500
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="px-8 py-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-slate-900 font-bold text-lg">
            <Users className="w-5 h-5 text-slate-500" />
            <span>参与角色</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {roles.map((role, index) => {
              const Icon = roleIcons[index % roleIcons.length];
              const checked = roleIds.includes(role.id);
              return (
                <button
                  type="button"
                  key={role.id}
                  onClick={() => toggleRole(role.id)}
                  className={cn(
                    "text-left rounded-xl p-4 relative flex items-start gap-3 border transition-colors",
                    checked ? "border-teal-200 bg-teal-50/30" : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  {checked && <CheckSquare className="absolute top-2 right-2 w-4 h-4 text-blue-500" />}
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200 shadow-sm text-blue-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{role.name}</span>
                      {role.is_default && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-100 text-teal-700">
                          默认
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
                      {role.description || role.responsibilities.join("，")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-8 pt-6 pb-24">
          <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold text-lg">
            <FileText className="w-5 h-5 text-slate-500" />
            <span>项目上下文预览</span>
          </div>

          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-6 border-b border-slate-200 mb-4 px-2">
              <button className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-2 -mb-[1px]">
                当前架构
              </button>
              <button className="text-sm font-medium text-slate-500 hover:text-slate-800 pb-2 -mb-[1px]">
                当前进展
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed px-2">
              {selectedProject?.architecture || selectedProject?.description || "暂无项目上下文。"}
            </p>
            {selectedScenario?.description && (
              <p className="text-xs text-slate-500 leading-relaxed px-2 mt-3">
                场景说明：{selectedScenario.description}
              </p>
            )}
            <textarea
              value={supplementalNotes}
              onChange={(event) => setSupplementalNotes(event.target.value)}
              placeholder="补充约束、背景或本次会议希望重点关注的问题"
              className="mt-4 w-full h-20 bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200/80 px-8 py-4 flex items-center justify-between z-10 shadow-[0_-4px_20px_rgb(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-white bg-teal-100 flex items-center justify-center shrink-0 shadow-sm">
            <Bot className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
            <span>{roleIds.length || "未选择"} 位参与者将加入研讨</span>
            <Info className="w-4 h-4" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading || isSubmitting}
          className="px-6 py-3 bg-gradient-to-br from-teal-500 to-blue-600 disabled:opacity-60 hover:opacity-90 transition-opacity text-white text-base font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Rocket className="w-4 h-4" fill="currentColor" />
          {isSubmitting ? "创建中..." : "启动智能研讨"}
        </button>
      </div>
    </div>
  );
}

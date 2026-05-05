import React, { useEffect, useState } from "react";
import { Navbar } from "../components/dashboard/Navbar";
import {
  Plus,
  Bot,
  User,
  Code2,
  FileCheck2,
  BarChart3,
  ShieldCheck,
  Info,
  PenSquare,
  Target,
  Wrench,
  ArrowRightCircle,
  Users2,
  FileText,
  LayoutTemplate,
  Eye,
  Layers,
  Database,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../lib/utils";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { apiClient } from "../api/client";
import type { AgentRole, ScenarioTemplate } from "../api/types";

// --- Icon/color mapping helpers ---
const ROLE_ICONS: Record<string, LucideIcon> = {
  host: Bot,
  product_manager: User,
  backend_architect: Code2,
  qa_engineer: ShieldCheck,
  data_analyst: BarChart3,
  security: ShieldCheck,
};

const ROLE_COLORS: Record<string, { color: string; bgLight: string; textLight: string }> = {
  host: { color: "bg-teal-500", bgLight: "bg-teal-50", textLight: "text-teal-600" },
  product_manager: { color: "bg-blue-500", bgLight: "bg-blue-50", textLight: "text-blue-600" },
  backend_architect: { color: "bg-indigo-500", bgLight: "bg-indigo-50", textLight: "text-indigo-600" },
  qa_engineer: { color: "bg-purple-500", bgLight: "bg-purple-50", textLight: "text-purple-600" },
  data_analyst: { color: "bg-sky-500", bgLight: "bg-sky-50", textLight: "text-sky-600" },
  security: { color: "bg-violet-500", bgLight: "bg-violet-50", textLight: "text-violet-600" },
};

const DEFAULT_COLORS = { color: "bg-slate-500", bgLight: "bg-slate-50", textLight: "text-slate-600" };

const SCENE_ICONS: Record<string, LucideIcon> = {
  requirements_clarification: Layers,
  architecture_review: Database,
};
const DEFAULT_SCENE_ICON = Layers;
const SCENE_COLORS: Record<string, string> = {
  requirements_clarification: "bg-sky-500",
  architecture_review: "bg-indigo-500",
};
const DEFAULT_SCENE_COLOR = "bg-teal-500";

// Display type for a role card
interface RoleDisplay {
  id: string;
  name: string;
  isBuiltIn: boolean;
  desc: string;
  icon: LucideIcon;
  color: string;
  bgLight: string;
  textLight: string;
  responsibilities: string;
  dimensions: string[];
  tools: { name: string; icon: LucideIcon }[];
  styles: string[];
  canDebate: boolean;
  canUseTools: boolean;
}

function mapRoleToDisplay(r: AgentRole): RoleDisplay {
  const colors = ROLE_COLORS[r.code] ?? DEFAULT_COLORS;
  return {
    id: r.id,
    name: r.name,
    isBuiltIn: r.is_default,
    desc: r.description ?? "",
    icon: ROLE_ICONS[r.code] ?? Bot,
    ...colors,
    responsibilities: (r.responsibilities ?? []).join("；"),
    dimensions: r.focus_areas ?? [],
    tools: (r.tools ?? []).map((t) => ({ name: t, icon: Wrench })),
    styles: r.output_style ? [r.output_style] : [],
    canDebate: r.can_debate,
    canUseTools: r.can_use_tools,
  };
}

interface SceneDisplay {
  id: string;
  name: string;
  isBuiltIn: boolean;
  desc: string;
  icon: LucideIcon;
  color: string;
  roleCodes: string[];
}

function mapSceneToDisplay(s: ScenarioTemplate): SceneDisplay {
  return {
    id: s.id,
    name: s.name,
    isBuiltIn: true,
    desc: s.description ?? "",
    icon: SCENE_ICONS[s.code] ?? DEFAULT_SCENE_ICON,
    color: SCENE_COLORS[s.code] ?? DEFAULT_SCENE_COLOR,
    roleCodes: s.default_role_codes ?? [],
  };
}

// Default tool icon
const DEFAULT_TOOL_ICONS: Record<string, LucideIcon> = {
  会议记录: FileText,
  议题澄清: Info,
  投票决策: Target,
  计时器: FileText,
  待办生成: FileCheck2,
  知识检索: FileText,
};

export function RoleConfig() {
  const [roles, setRoles] = useState<AgentRole[]>([]);
  const [scenes, setScenes] = useState<ScenarioTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Tab state
  const [tab, setTab] = useState<"roles" | "scenes">("roles");
  const [activeRole, setActiveRole] = useState<RoleDisplay | null>(null);
  const [activeScene, setActiveScene] = useState<SceneDisplay | null>(null);
  const [showNewRole, setShowNewRole] = useState(false);

  const loadData = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([apiClient.listAgentRoles(), apiClient.listScenarioTemplates()])
      .then(([r, s]) => {
        setRoles(r);
        setScenes(s);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "加载数据失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const roleDisplays: RoleDisplay[] = roles.map(mapRoleToDisplay);
  const sceneDisplays: SceneDisplay[] = scenes.map(mapSceneToDisplay);

  // Auto-select first role/scene
  useEffect(() => {
    if (tab === "roles" && roleDisplays.length > 0 && !activeRole) {
      setActiveRole(roleDisplays[0]);
    }
    if (tab === "scenes" && sceneDisplays.length > 0 && !activeScene) {
      setActiveScene(sceneDisplays[0]);
    }
  }, [tab, roleDisplays, sceneDisplays, activeRole, activeScene]);

  // New role form state
  const [newRoleForm, setNewRoleForm] = useState({
    name: "",
    code: "",
    description: "",
    responsibilities: "",
    focus_areas: "",
    tools: "",
    output_style: "",
  });

  const handleCreateRole = async () => {
    if (!newRoleForm.name.trim() || !newRoleForm.code.trim()) return;
    setCreateError(null);
    try {
      const created = await apiClient.createAgentRole({
        name: newRoleForm.name,
        code: newRoleForm.code,
        description: newRoleForm.description,
        responsibilities: newRoleForm.responsibilities.split(/[,，]/).filter(Boolean),
        focus_areas: newRoleForm.focus_areas.split(/[,，]/).filter(Boolean),
        tools: newRoleForm.tools.split(/[,，]/).filter(Boolean),
        output_style: newRoleForm.output_style,
      });
      setRoles((prev) => [...prev, created]);
      setNewRoleForm({ name: "", code: "", description: "", responsibilities: "", focus_areas: "", tools: "", output_style: "" });
      setShowNewRole(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "创建角色失败，请重试");
    }
  };

  // Find role display by code for scene role avatars
  const getRoleByCode = (code: string) => roleDisplays.find((r) => r.id === code || roles.find((x) => x.code === code)?.id === r.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <span className="text-slate-400">加载中…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar activePage="角色配置" />

      <div className="flex-1 w-full max-w-[1500px] mx-auto flex gap-6 p-6 h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[300px] flex-shrink-0 flex flex-col h-full bg-slate-50">
          <div className="mb-6">
            <h1 className="text-[20px] font-bold text-slate-900 mb-1.5">角色与场景配置</h1>
            <p className="text-[13px] text-slate-500 leading-relaxed">管理角色能力与场景模板，打造高质量研讨体验</p>
          </div>

          {loadError && <div className="mb-4"><ErrorBanner message={loadError} onRetry={loadData} /></div>}
          {createError && <div className="mb-4"><ErrorBanner message={createError} onDismiss={() => setCreateError(null)} /></div>}

          <div className="flex p-1 bg-slate-200/50 rounded-lg mb-6 shadow-none">
            <button
              onClick={() => setTab("roles")}
              className={cn(
                "flex-1 py-1.5 flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-all duration-200",
                tab === "roles" ? "bg-white shadow-sm text-blue-600 border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/30",
              )}
            >
              <Users2 className="w-4 h-4" />
              角色库
            </button>
            <button
              onClick={() => setTab("scenes")}
              className={cn(
                "flex-1 py-1.5 flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-all duration-200",
                tab === "scenes" ? "bg-white shadow-sm text-blue-600 border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/30",
              )}
            >
              <LayoutTemplate className="w-4 h-4" />
              场景模板
            </button>
          </div>

          {tab === "roles" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">全部角色</h2>
                <button
                  onClick={() => setShowNewRole(true)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium px-2.5 py-1.5 rounded-full border border-blue-100 bg-white hover:bg-blue-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新建角色
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 pb-6 space-y-3">
                {roleDisplays.length === 0 ? (
                  <div className="text-slate-400 text-sm text-center py-8">暂无角色</div>
                ) : (
                  roleDisplays.map((role) => (
                    <div
                      key={role.id}
                      onClick={() => setActiveRole(role)}
                      className={cn(
                        "p-4 rounded-xl cursor-pointer transition-all duration-200 border",
                        activeRole?.id === role.id ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] hover:shadow-sm",
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white", role.bgLight)}>
                          <role.icon className={cn("w-5 h-5", role.textLight)} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={cn("font-medium text-[14px]", activeRole?.id === role.id ? "text-blue-900 font-semibold" : "text-slate-900")}>
                              {role.name}
                            </h3>
                            {role.isBuiltIn && (
                              <span className="px-1.5 py-0 rounded text-[10px] font-medium bg-emerald-100/80 text-emerald-700 border border-emerald-200/50">内置</span>
                            )}
                          </div>
                          <p className={cn("text-xs leading-relaxed line-clamp-2", activeRole?.id === role.id ? "text-blue-800/70" : "text-slate-500")}>
                            {role.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === "scenes" && (
            <div className="flex-1 overflow-y-auto pr-2 pb-6 space-y-3">
              {sceneDisplays.length === 0 ? (
                <div className="text-slate-400 text-sm text-center py-8">暂无场景模板</div>
              ) : (
                sceneDisplays.map((scene) => (
                  <div
                    key={scene.id}
                    onClick={() => setActiveScene(scene)}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all duration-200 border",
                      activeScene?.id === scene.id ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm", scene.color)}>
                        <scene.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[14px] text-slate-900">{scene.name}</h3>
                          {scene.isBuiltIn && (
                            <span className="px-1.5 py-0 rounded text-[10px] font-medium bg-emerald-100/80 text-emerald-700 border border-emerald-200/50">内置</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{scene.desc}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>

        {/* Center Panel */}
        <main className="flex-1 flex flex-col bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden min-w-[500px]">
          {tab === "roles" && activeRole ? (
            <div className="p-8 overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className={cn("w-[68px] h-[68px] rounded-full flex items-center justify-center", activeRole.bgLight)}>
                    <activeRole.icon className={cn("w-9 h-9", activeRole.textLight)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h2 className="text-[22px] font-bold text-slate-900">{activeRole.name}</h2>
                      {activeRole.isBuiltIn && (
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-100/90 text-emerald-700 border border-emerald-200/50">内置</span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[14px]">{activeRole.desc}</p>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                  <PenSquare className="w-4 h-4" />
                  编辑基础信息
                </button>
              </div>

              <div className="space-y-5">
                <DetailCard title="职责说明" icon={Info}>
                  <p className="text-slate-600 text-[14px] leading-relaxed">{activeRole.responsibilities || "暂无职责说明。"}</p>
                </DetailCard>

                <DetailCard title="关注维度" icon={Target}>
                  <div className="flex flex-wrap gap-2.5">
                    {activeRole.dimensions.length > 0 ? (
                      activeRole.dimensions.map((d) => (
                        <span key={d} className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[13px] font-medium rounded-full">{d}</span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">暂无维度</span>
                    )}
                  </div>
                </DetailCard>

                <DetailCard title="可调用工具" icon={FileText}>
                  <div className="flex flex-wrap gap-3">
                    {activeRole.tools.length > 0 ? (
                      activeRole.tools.map((t, i) => {
                        const Icon = DEFAULT_TOOL_ICONS[t.name] ?? Wrench;
                        return (
                          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-[13px] font-medium rounded-lg shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
                            <Icon className="w-3.5 h-3.5 text-slate-400" />
                            {t.name}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-slate-500 text-sm">暂无工具</span>
                    )}
                  </div>
                </DetailCard>

                <DetailCard title="输出风格" icon={ArrowRightCircle}>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {activeRole.styles.length > 0 ? (
                      activeRole.styles.map((s) => (
                        <span key={s} className="text-blue-600 text-[14px] font-medium">{s}</span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">暂无风格</span>
                    )}
                  </div>
                </DetailCard>

                {/* Settings Toggles */}
                <div className="mt-8 space-y-0.5">
                  <ToggleRow icon={Users2} title="允许参与辩论" desc="允许该角色在讨论中发表观点并参与辩论。" active={activeRole.canDebate} />
                  <ToggleRow icon={Wrench} title="允许调用工具" desc="允许该角色调用系统工具辅助完成任务。" active={activeRole.canUseTools} />
                  <ToggleRow icon={ShieldCheck} title="默认参会" desc="在新建立讨论时，默认将该角色加入会议。" active={false} last />
                </div>
              </div>
            </div>
          ) : tab === "scenes" && activeScene ? (
            <div className="p-8 overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className={cn("w-[68px] h-[68px] rounded-xl flex items-center justify-center text-white shadow-sm", activeScene.color)}>
                    <activeScene.icon className="w-9 h-9" />
                  </div>
                  <div>
                    <h2 className="text-[22px] font-bold text-slate-900 mb-1.5">{activeScene.name}</h2>
                    <p className="text-slate-500 text-[14px]">{activeScene.desc}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-4">默认角色</h3>
                  <div className="flex flex-wrap gap-3">
                    {activeScene.roleCodes.map((code, i) => {
                      const role = roleDisplays.find((r) => r.id === code || roles.find((x) => x.code === code)?.id === r.id);
                      if (!role) return <span key={i} className="text-slate-400 text-sm px-3 py-2 border rounded-lg">{code}</span>;
                      return (
                        <div key={i} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border", role.bgLight)}>
                          <role.icon className={cn("w-4 h-4", role.textLight)} />
                          <span className="text-sm font-medium text-slate-700">{role.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              请从左侧选择一个{tab === "roles" ? "角色" : "场景模板"}
            </div>
          )}
        </main>

        {/* Right Sidebar - Scenes preview (only when on roles tab) */}
        {tab === "roles" && (
          <aside className="w-[340px] flex-shrink-0 flex flex-col h-full bg-slate-50 border-l border-slate-200/60 pl-6 pt-2">
            <div className="flex items-end justify-between mb-1.5">
              <h2 className="text-[17px] font-bold text-slate-900">场景模板预览</h2>
              <button className="text-blue-600 hover:text-blue-700 text-[13px] font-medium pr-1">查看全部</button>
            </div>
            <p className="text-[13px] text-slate-500 mb-5">该角色在以下场景模板中的典型配置与作用预览</p>

            <div className="flex-1 overflow-y-auto pb-6 space-y-3.5 pr-2">
              {sceneDisplays.length === 0 ? (
                <div className="text-slate-400 text-sm text-center py-8">暂无场景模板</div>
              ) : (
                sceneDisplays.map((scene) => (
                  <div key={scene.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white shadow-sm", scene.color)}>
                          <scene.icon className="w-[22px] h-[22px]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-[15px] text-slate-900">{scene.name}</h3>
                            <span className="px-1.5 py-0 rounded text-[10px] font-medium bg-emerald-100/80 text-emerald-700 border border-emerald-200/50">内置</span>
                          </div>
                        </div>
                      </div>
                      <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium px-2.5 py-1.5 rounded-md border border-blue-100 hover:bg-blue-50 transition-colors mt-0.5">
                        <Eye className="w-3 h-3" />
                        预览
                      </button>
                    </div>

                    <p className="text-slate-500 text-[13px] leading-relaxed mb-4">{scene.desc}</p>

                    <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                      <span className="text-[12px] font-medium text-slate-500">常用角色</span>
                      <div className="flex items-center -space-x-1.5">
                        {scene.roleCodes.slice(0, 3).map((code, i) => {
                          const role = roleDisplays.find((r) => r.id === code || roles.find((x) => x.code === code)?.id === r.id);
                          if (!role) return null;
                          return (
                            <div key={i} className={cn("w-6 h-6 rounded-full border-2 border-white flex items-center justify-center relative", role.bgLight)} style={{ zIndex: 10 - i }}>
                              <role.icon className={cn("w-3.5 h-3.5", role.textLight)} />
                            </div>
                          );
                        })}
                        {scene.roleCodes.length > 3 && (
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center relative z-0">
                            <span className="text-[10px] font-medium text-slate-500">+{scene.roleCodes.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* New Role Dialog */}
        {showNewRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">新建角色</h2>
                <button onClick={() => setShowNewRole(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">角色名称 *</label>
                  <input type="text" value={newRoleForm.name} onChange={(e) => setNewRoleForm((f) => ({ ...f, name: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：安全合规" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">代号 *</label>
                  <input type="text" value={newRoleForm.code} onChange={(e) => setNewRoleForm((f) => ({ ...f, code: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：security_analyst" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
                  <textarea value={newRoleForm.description} onChange={(e) => setNewRoleForm((f) => ({ ...f, description: e.target.value }))} className="w-full h-16 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="角色简要描述" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">职责（逗号分隔）</label>
                  <input type="text" value={newRoleForm.responsibilities} onChange={(e) => setNewRoleForm((f) => ({ ...f, responsibilities: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：发现安全问题, 审计日志" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">关注维度（逗号分隔）</label>
                  <input type="text" value={newRoleForm.focus_areas} onChange={(e) => setNewRoleForm((f) => ({ ...f, focus_areas: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：安全性, 合规性" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">工具（逗号分隔）</label>
                  <input type="text" value={newRoleForm.tools} onChange={(e) => setNewRoleForm((f) => ({ ...f, tools: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：日志分析, 漏洞扫描" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">输出风格</label>
                  <input type="text" value={newRoleForm.output_style} onChange={(e) => setNewRoleForm((f) => ({ ...f, output_style: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：专业严谨" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowNewRole(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
                <button onClick={handleCreateRole} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700" disabled={!newRoleForm.name.trim() || !newRoleForm.code.trim()}>
                  创建角色
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---
function DetailCard({ title, icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-slate-500">
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[13px] font-medium">
          <PenSquare className="w-3.5 h-3.5" />
          编辑
        </button>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ icon: Icon, title, desc, active, last }: { icon: LucideIcon; title: string; desc: string; active: boolean; last?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between py-5", !last && "border-b border-slate-100")}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-slate-900 font-medium text-[15px]">{title}</h4>
          <p className="text-slate-500 text-[13px] mt-0.5">{desc}</p>
        </div>
      </div>
      <button className={cn("w-12 h-6 rounded-full transition-colors relative cursor-pointer", active ? "bg-blue-600" : "bg-slate-200")}>
        <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", active ? "left-7" : "left-1")} />
      </button>
    </div>
  );
}

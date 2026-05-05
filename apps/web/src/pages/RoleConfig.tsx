import React, { useState } from "react";
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
  Type,
  Users2,
  Tool,
  CheckCircle2,
  FileText,
  MessageSquare,
  Settings,
  Clock,
  Calendar,
  Search,
  ChevronRight,
  Briefcase,
  LayoutTemplate,
  Share2,
  BadgeCheck,
  RotateCcw,
  Eye,
  Settings2,
  Users,
  Box,
  Layers,
  Database,
  ArrowRightCircle
} from "lucide-react";
import { cn } from "../lib/utils";

const rolesData = [
  {
    id: "ai-host",
    name: "AI 主持人",
    isBuiltIn: true,
    desc: "控场与引导，推进议题进程，促进结论并输出行动项。",
    icon: Bot,
    color: "bg-teal-500",
    bgLight: "bg-teal-50",
    textLight: "text-teal-600",
    responsibilities: "负责会议流程的组织与推进，提出关键问题引导讨论，归纳观点与分歧，促成共识并输出行动项与结论。",
    dimensions: ["会议目标达成", "议题进度控制", "参与度与发言平衡", "结论质量", "下一步行动明确"],
    tools: [
      { name: "会议记录", icon: FileText },
      { name: "议题澄清", icon: Info },
      { name: "投票决策", icon: Target },
      { name: "计时器", icon: Clock },
      { name: "待办生成", icon: FileCheck2 },
      { name: "知识检索", icon: Search },
    ],
    styles: ["结构化", "简明扼要", "中立客观", "积极引导", "行动导向"],
    canDebate: true,
    canUseTools: true,
    defaultJoin: true,
  },
  {
    id: "pm",
    name: "产品经理",
    isBuiltIn: true,
    desc: "聚焦用户价值与需求发现，输出需求与验收标准建议。",
    icon: User,
    color: "bg-blue-500",
    bgLight: "bg-blue-50",
    textLight: "text-blue-600",
  },
  {
    id: "architect",
    name: "后端架构师",
    isBuiltIn: true,
    desc: "评估技术方案可行性，关注系统设计与集成实现。",
    icon: Code2,
    color: "bg-indigo-500",
    bgLight: "bg-indigo-50",
    textLight: "text-indigo-600",
  },
  {
    id: "qa",
    name: "测试工程师",
    isBuiltIn: true,
    desc: "识别测试风险与覆盖点，设计测试策略与验收标准。",
    icon: ShieldCheck,
    color: "bg-purple-500",
    bgLight: "bg-purple-50",
    textLight: "text-purple-600",
  },
  {
    id: "data-analyst",
    name: "数据分析师",
    isBuiltIn: true,
    desc: "提供数据洞察与指标分析，支持决策与效果评估。",
    icon: BarChart3,
    color: "bg-sky-500",
    bgLight: "bg-sky-50",
    textLight: "text-sky-600",
  },
  {
    id: "security",
    name: "安全合规",
    isBuiltIn: true,
    desc: "识别安全与合规风险，提供策略建议与合规检查。",
    icon: ShieldCheck,
    color: "bg-violet-500",
    bgLight: "bg-violet-50",
    textLight: "text-violet-600",
  }
];

const scenesData = [
  {
    id: "s1",
    name: "需求澄清",
    isBuiltIn: true,
    desc: "澄清和细化需求，识别关键问题与验收标准，明确下一步计划。",
    icon: Layers,
    color: "bg-sky-500",
    roles: [rolesData[0], rolesData[1], rolesData[2]],
    moreRoles: 2
  },
  {
    id: "s2",
    name: "产品设计",
    isBuiltIn: true,
    desc: "定义产品方案与用户体验，输出 PRD 与关键流程建议。",
    icon: Users2,
    color: "bg-emerald-500",
    roles: [rolesData[1], rolesData[0], rolesData[2]],
    moreRoles: 3
  },
  {
    id: "s3",
    name: "架构评审",
    isBuiltIn: true,
    desc: "评审技术方案的可行性、风险与成本，形成改进建议。",
    icon: Database,
    color: "bg-indigo-500",
    roles: [rolesData[2], rolesData[1], rolesData[3]],
    moreRoles: 2
  },
  {
    id: "s4",
    name: "测试评审",
    isBuiltIn: true,
    desc: "评审测试策略、用例覆盖与风险，明确验收标准与缺口。",
    icon: ShieldCheck,
    color: "bg-purple-500",
    roles: [rolesData[0], rolesData[1], rolesData[3]],
    moreRoles: 2
  },
  {
    id: "s5",
    name: "复盘总结",
    isBuiltIn: true,
    desc: "复盘目标达成与问题根因，沉淀经验并形成改进计划。",
    icon: Users,
    color: "bg-teal-500",
    roles: [rolesData[0], rolesData[1], rolesData[3]],
    moreRoles: 2
  }
];

export function RoleConfig() {
  const [activeRole, setActiveRole] = useState(rolesData[0]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar activePage="角色配置" />
      
      <div className="flex-1 w-full max-w-[1500px] mx-auto flex gap-6 p-6 h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Sidebar - Roles List */}
        <aside className="w-[300px] flex-shrink-0 flex flex-col h-full bg-slate-50">
          <div className="mb-6">
            <h1 className="text-[20px] font-bold text-slate-900 mb-1.5">角色与场景配置</h1>
            <p className="text-[13px] text-slate-500 leading-relaxed">管理角色能力与场景模板，打造高质量研讨体验</p>
          </div>
          
          <div className="flex p-1 bg-slate-200/50 rounded-lg mb-6 shadow-none">
            <button className="flex-1 py-1.5 flex items-center justify-center gap-2 bg-white rounded-md shadow-sm text-blue-600 font-medium text-sm transition-all duration-200 border border-slate-200/50">
              <Users2 className="w-4 h-4" />
              角色库
            </button>
            <button className="flex-1 py-1.5 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-all duration-200 hover:bg-slate-200/30 rounded-md">
              <LayoutTemplate className="w-4 h-4" />
              场景模板
            </button>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">全部角色</h2>
            <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium px-2.5 py-1.5 rounded-full border border-blue-100 bg-white hover:bg-blue-50 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              新建角色
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 pb-6 space-y-3 custom-scrollbar">
            {rolesData.map(role => (
              <div 
                key={role.id}
                onClick={() => setActiveRole(role)}
                className={cn(
                  "p-4 rounded-xl cursor-pointer transition-all duration-200 border",
                  activeRole.id === role.id 
                    ? "bg-blue-50 border-blue-200 shadow-sm" 
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] hover:shadow-sm"
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white", activeRole.id === role.id ? role.bgLight : "border border-slate-100")}>
                    <role.icon className={cn("w-5 h-5", activeRole.id === role.id ? role.textLight : role.textLight.replace("text-", "text-").replace("600", "500"))} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn("font-medium text-[14px]", activeRole.id === role.id ? "text-blue-900 font-semibold" : "text-slate-900")}>
                        {role.name}
                      </h3>
                      {role.isBuiltIn && (
                        <span className="px-1.5 py-0 rounded text-[10px] font-medium bg-emerald-100/80 text-emerald-700 border border-emerald-200/50">
                          内置
                        </span>
                      )}
                    </div>
                    <p className={cn("text-xs leading-relaxed line-clamp-2", activeRole.id === role.id ? "text-blue-800/70" : "text-slate-500")}>
                      {role.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
        
        {/* Center Panel - Role Details */}
        <main className="flex-1 flex flex-col bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden min-w-[500px]">
          <div className="p-8 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-5">
                <div className={cn("w-[68px] h-[68px] rounded-full flex items-center justify-center", activeRole.bgLight)}>
                  <activeRole.icon className={cn("w-9 h-9", activeRole.textLight)} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h2 className="text-[22px] font-bold text-slate-900">{activeRole.name}</h2>
                    {activeRole.isBuiltIn && (
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-100/90 text-emerald-700 border border-emerald-200/50">
                        内置
                      </span>
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
            
            {/* Outline Cards */}
            <div className="space-y-5">
              
              {/* Responsibility */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 pb-7 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="text-slate-500">
                      <Info className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900">职责说明</h3>
                  </div>
                  <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[13px] font-medium">
                    <PenSquare className="w-3.5 h-3.5" />
                    编辑
                  </button>
                </div>
                <p className="text-slate-600 text-[14px] leading-relaxed">
                  {activeRole.responsibilities || "暂无职责说明。"}
                </p>
              </div>

              {/* Dimensions */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="text-slate-500">
                      <Target className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900">关注维度</h3>
                  </div>
                  <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[13px] font-medium">
                    <PenSquare className="w-3.5 h-3.5" />
                    编辑
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {activeRole.dimensions?.map(dim => (
                    <span key={dim} className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[13px] font-medium rounded-full">
                      {dim}
                    </span>
                  )) || (
                    <span className="text-slate-500 text-sm font-medium">暂无维度</span>
                  )}
                </div>
              </div>

              {/* Tools */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="text-slate-500">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900">可调用工具</h3>
                  </div>
                  <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[13px] font-medium">
                    <PenSquare className="w-3.5 h-3.5" />
                    编辑
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {activeRole.tools?.map((tool, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-[13px] font-medium rounded-lg shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] hover:border-slate-300 transition-colors">
                      <tool.icon className="w-3.5 h-3.5 text-slate-400" />
                      {tool.name}
                    </div>
                  )) || (
                    <span className="text-slate-500 text-sm font-medium">暂无工具</span>
                  )}
                </div>
              </div>

              {/* Output Style */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="text-slate-500">
                      <ArrowRightCircle className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900">输出风格</h3>
                  </div>
                  <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[13px] font-medium">
                    <PenSquare className="w-3.5 h-3.5" />
                    编辑
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {activeRole.styles?.map(style => (
                    <span key={style} className="text-blue-600 text-[14px] font-medium">
                      {style}
                    </span>
                  )) || (
                    <span className="text-slate-500 text-sm font-medium">暂无风格</span>
                  )}
                </div>
              </div>
              
              {/* Settings Toggles */}
              <div className="mt-8 space-y-0.5">
                {/* Toggle 1 */}
                <div className="flex items-center justify-between py-5 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                      <Users2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-slate-900 font-medium text-[15px]">允许参与辩论</h4>
                      <p className="text-slate-500 text-[13px] mt-0.5">允许该角色在讨论中发表观点并参与辩论。</p>
                    </div>
                  </div>
                  <button className={cn("w-12 h-6 rounded-full transition-colors relative cursor-pointer", activeRole.canDebate ? "bg-blue-600" : "bg-slate-200")}>
                    <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", activeRole.canDebate ? "left-7" : "left-1")} />
                  </button>
                </div>
                
                {/* Toggle 2 */}
                <div className="flex items-center justify-between py-5 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-slate-900 font-medium text-[15px]">允许调用工具</h4>
                      <p className="text-slate-500 text-[13px] mt-0.5">允许该角色调用系统工具辅助完成任务。</p>
                    </div>
                  </div>
                  <button className={cn("w-12 h-6 rounded-full transition-colors relative cursor-pointer", activeRole.canUseTools ? "bg-blue-600" : "bg-slate-200")}>
                    <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", activeRole.canUseTools ? "left-7" : "left-1")} />
                  </button>
                </div>
                
                {/* Toggle 3 */}
                <div className="flex items-center justify-between py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-slate-900 font-medium text-[15px]">默认参会</h4>
                      <p className="text-slate-500 text-[13px] mt-0.5">在新建立讨论时，默认将该角色加入会议。</p>
                    </div>
                  </div>
                  <button className={cn("w-12 h-6 rounded-full transition-colors relative cursor-pointer", activeRole.defaultJoin ? "bg-blue-600" : "bg-slate-200")}>
                    <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", activeRole.defaultJoin ? "left-7" : "left-1")} />
                  </button>
                </div>
              </div>
              
            </div>
          </div>
        </main>
        
        {/* Right Sidebar - Scenarios */}
        <aside className="w-[340px] flex-shrink-0 flex flex-col h-full bg-slate-50 border-l border-slate-200/60 pl-6 pt-2">
          <div className="flex items-end justify-between mb-1.5">
            <h2 className="text-[17px] font-bold text-slate-900">场景模板预览</h2>
            <button className="text-blue-600 hover:text-blue-700 text-[13px] font-medium pr-1">查看全部</button>
          </div>
          <p className="text-[13px] text-slate-500 mb-5">该角色在以下场景模板中的典型配置与作用预览</p>
          
          <div className="flex-1 overflow-y-auto pb-6 space-y-3.5 pr-2 custom-scrollbar">
            {scenesData.map(scene => (
              <div key={scene.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white shadow-sm", scene.color)}>
                      <scene.icon className="w-[22px] h-[22px]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[15px] text-slate-900">{scene.name}</h3>
                        {scene.isBuiltIn && (
                          <span className="px-1.5 py-0 rounded text-[10px] font-medium bg-emerald-100/80 text-emerald-700 border border-emerald-200/50">
                            内置
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium px-2.5 py-1.5 rounded-md border border-blue-100 hover:bg-blue-50 transition-colors mt-0.5">
                    <Eye className="w-3 h-3" />
                    预览
                  </button>
                </div>
                
                <p className="text-slate-500 text-[13px] leading-relaxed mb-4">
                  {scene.desc}
                </p>
                
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <span className="text-[12px] font-medium text-slate-500">常用角色</span>
                  <div className="flex items-center -space-x-1.5">
                    {scene.roles.map((r, i) => (
                      <div key={i} className={cn("w-6 h-6 rounded-full border-2 border-white flex items-center justify-center relative z-10", r.bgLight)} style={{ zIndex: 10 - i }}>
                        <r.icon className={cn("w-3.5 h-3.5", r.textLight)} />
                      </div>
                    ))}
                    {scene.moreRoles > 0 && (
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center relative z-0">
                        <span className="text-[10px] font-medium text-slate-500">+{scene.moreRoles}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

      </div>
    </div>
  );
}

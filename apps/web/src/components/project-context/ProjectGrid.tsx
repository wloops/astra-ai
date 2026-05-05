import React from "react";
import { MoreHorizontal, FileText, CheckCircle2, ShieldCheck, BookOpen, Presentation, Code2 } from "lucide-react";
import { cn } from "../../lib/utils";

const projects = [
  {
    title: "企业极速差旅报销系统",
    role: "我创建的",
    icon: FileText,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    desc: "优化差旅报销流程，实现自动化审批与财务对接，提升员工报销体验与财务处理效率。",
    tags: ["产品研发", "流程优化"],
    completeness: 85,
    updateTime: "2024-12-20 14:30",
    avatars: 3,
    extraAvatars: "+3",
  },
  {
    title: "支付模块技术方案评审",
    role: "我参与的",
    icon: ShieldCheck,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    desc: "评估多种支付接入方案的技术可行性、风险与成本，确定最优技术实现路径。",
    tags: ["技术方案", "架构评审"],
    completeness: 72,
    updateTime: "2024-12-18 10:15",
    avatars: 3,
    extraAvatars: "+2",
  },
  {
    title: "用户权限体系设计",
    role: "我创建的",
    icon: BookOpen,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50",
    desc: "设计基于角色的权限管理体系，支持细粒度权限控制与数据隔离方案。",
    tags: ["产品研发", "权限管理"],
    completeness: 90,
    updateTime: "2024-12-17 16:45",
    avatars: 3,
    extraAvatars: "+2",
  },
  {
    title: "竞品分析与市场调研",
    role: "我参与的",
    icon: Presentation,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
    desc: "分析目标市场竞品情况，识别产品机会点与竞争策略，形成市场洞察报告。",
    tags: ["市场分析", "竞品分析"],
    completeness: 65,
    updateTime: "2024-12-15 09:30",
    avatars: 3,
    extraAvatars: "+4",
  },
  {
    title: "项目启动与目标对齐会",
    role: "我创建的",
    icon: CheckCircle2,
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-50",
    desc: "明确项目目标、范围、里程碑与关键干系人，确保团队目标一致。",
    tags: ["项目管理", "目标对齐"],
    completeness: 80,
    updateTime: "2024-12-12 14:00",
    avatars: 3,
    extraAvatars: "+1",
  },
  {
    title: "财务数据对接方案",
    role: "我参与的",
    icon: Code2,
    iconColor: "text-teal-500",
    iconBg: "bg-teal-50",
    desc: "设计财务系统对接方案，确保数据安全、准确传输与实时同步。",
    tags: ["技术方案", "数据对接"],
    completeness: 60,
    updateTime: "2024-12-10 11:20",
    avatars: 3,
    extraAvatars: "+3",
  },
];

export function ProjectGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      {projects.map((project, idx) => {
        const Icon = project.icon;
        
        return (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5", project.iconBg)}>
                  <Icon className={cn("w-5 h-5", project.iconColor)} />
                </div>
                <div>
                   <h3 className="font-bold text-slate-800 line-clamp-1 leading-tight mb-2" title={project.title}>
                     {project.title}
                   </h3>
                   <span className={cn(
                     "text-xs px-2 py-0.5 rounded uppercase font-medium tracking-wide",
                     project.role === "我创建的" ? "bg-teal-50 text-teal-600" : "bg-blue-50 text-blue-600"
                   )}>
                     {project.role}
                   </span>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mr-2">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">
              {project.desc}
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
              {project.tags.map((tag) => (
                <span key={tag} className={cn("text-xs px-2.5 py-1 rounded border", project.iconBg, project.iconColor, project.iconColor.replace("text-", "border-").replace("500", "200").replace("600", "200"))}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-auto">
              {/* Completeness bar */}
              <div className="flex items-center justify-between mb-1">
                 <span className="text-xs text-slate-500 font-medium">上下文完整度</span>
                 <span className="text-xs font-bold text-slate-700">{project.completeness}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full mb-4 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    project.completeness >= 80 ? "bg-teal-500" : (project.completeness >= 60 ? "bg-blue-500" : "bg-amber-500")
                  )} 
                  style={{ width: `${project.completeness}%` }}
                />
              </div>

              {/* Footer info: update time & avatars */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-400">
                  更新时间：{project.updateTime}
                </div>
                <div className="flex items-center -space-x-1.5">
                  {Array.from({ length: project.avatars }).map((_, i) => (
                    <img 
                      key={i}
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${project.title}${i}&backgroundColor=e2e8f0`}
                      alt="avatar" 
                      className="w-6 h-6 rounded-full border-2 border-white bg-slate-100"
                    />
                  ))}
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center z-10">
                    {project.extraAvatars}
                  </div>
                </div>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}

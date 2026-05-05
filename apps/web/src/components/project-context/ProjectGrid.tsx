import React from "react";
import { MoreHorizontal, FileText, ShieldCheck, BookOpen, Presentation, Code2, Briefcase, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Project } from "../../api/types";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

const ICON_POOL: { icon: LucideIcon; iconColor: string; iconBg: string }[] = [
  { icon: FileText, iconColor: "text-blue-500", iconBg: "bg-blue-50" },
  { icon: ShieldCheck, iconColor: "text-emerald-500", iconBg: "bg-emerald-50" },
  { icon: BookOpen, iconColor: "text-purple-500", iconBg: "bg-purple-50" },
  { icon: Presentation, iconColor: "text-amber-500", iconBg: "bg-amber-50" },
  { icon: Code2, iconColor: "text-teal-500", iconBg: "bg-teal-50" },
  { icon: Briefcase, iconColor: "text-indigo-500", iconBg: "bg-indigo-50" },
];

interface ProjectGridProps {
  projects?: Project[];
  searchQuery?: string;
  onEditProject?: (project: Project) => void;
}

export function ProjectGrid({ projects: externalProjects, searchQuery = "", onEditProject }: ProjectGridProps) {
  const allProjects = (externalProjects ?? []).filter(
    (p) => !searchQuery || p.name.includes(searchQuery),
  );

  if (allProjects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
        暂无项目，请先创建项目
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      {allProjects.map((project, idx) => {
        const iconConfig = ICON_POOL[idx % ICON_POOL.length];
        const Icon = iconConfig.icon;

        return (
          <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5", iconConfig.iconBg)}>
                  <Icon className={cn("w-5 h-5", iconConfig.iconColor)} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 line-clamp-1 leading-tight mb-2" title={project.name}>
                    {project.name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded uppercase font-medium tracking-wide bg-teal-50 text-teal-600">
                    项目
                  </span>
                </div>
              </div>
              <button
                onClick={() => onEditProject?.(project)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mr-2"
                title="编辑项目"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">
              {project.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
              {(project.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className={cn("text-xs px-2.5 py-1 rounded border", iconConfig.iconBg, iconConfig.iconColor, iconConfig.iconColor.replace("text-", "border-").replace("500", "200").replace("600", "200"))}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500 font-medium">上下文完整度</span>
                <span className="text-xs font-bold text-slate-700">{project.completeness}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full mb-4 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    project.completeness >= 80 ? "bg-teal-500" : project.completeness >= 60 ? "bg-blue-500" : "bg-amber-500",
                  )}
                  style={{ width: `${project.completeness}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-400">更新时间：{formatTime(project.updated_at)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

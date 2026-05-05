import React from "react";
import { Folder, Briefcase, MessageSquareText, Headphones, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Project } from "../../api/types";

interface ProjectDisplay {
  title: string;
  tag: string;
  tagColor: string;
  desc: string;
  contextValue: number;
  time: string;
  iconBg: string;
  icon: LucideIcon;
}

function mapProjectToDisplay(p: Project): ProjectDisplay {
  const tag = p.tags?.[0] ?? "项目";
  const icons: Record<string, LucideIcon> = {
    需求澄清: MessageSquareText,
    方案评审: Briefcase,
    产品优化: Headphones,
    架构评审: Briefcase,
  };
  return {
    title: p.name,
    tag,
    tagColor: "text-teal-600 bg-teal-50",
    desc: p.description ?? "",
    contextValue: p.completeness ?? 0,
    time: formatTime(p.updated_at),
    iconBg: "bg-teal-50 text-teal-600",
    icon: icons[tag] ?? Briefcase,
  };
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

interface RecentProjectsProps {
  projects?: Project[];
}

export function RecentProjects({ projects: externalProjects }: RecentProjectsProps) {
  const allProjects = externalProjects ?? [];
  const displayProjects = allProjects
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3)
    .map(mapProjectToDisplay);

  if (displayProjects.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">最近项目</h2>
          </div>
        </div>
        <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-sm">
          暂无项目数据，请先创建项目
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900">最近项目</h2>
        </div>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
          查看全部 <ChevronRight className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayProjects.map((p, idx) => (
          <div
            key={idx}
            className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div>
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    p.iconBg,
                  )}
                >
                  <p.icon className="w-5 h-5" />
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium px-2 py-1 rounded-md",
                    p.tagColor,
                  )}
                >
                  {p.tag}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 mt-3 line-clamp-1">
                {p.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                {p.desc}
              </p>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-slate-500">上下文完整度</span>
                <span className="text-slate-900">{p.contextValue}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    p.contextValue > 90
                      ? "bg-gradient-to-r from-teal-400 to-teal-500"
                      : p.contextValue > 70
                        ? "bg-gradient-to-r from-blue-400 to-blue-500"
                        : "bg-gradient-to-r from-purple-400 to-purple-500",
                  )}
                  style={{ width: `${p.contextValue}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 mt-3 font-medium">
                最近更新: {p.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

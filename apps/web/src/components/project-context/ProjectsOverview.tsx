import React from "react";
import { FolderOpen, ShieldCheck, Clock } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Project } from "../../api/types";

interface ProjectsOverviewProps {
  projects?: Project[];
}

export function ProjectsOverview({ projects: externalProjects }: ProjectsOverviewProps) {
  const allProjects = externalProjects ?? [];
  const total = allProjects.length;
  const highCompleteness = allProjects.filter((p) => p.completeness >= 80).length;
  const lowCompleteness = allProjects.filter((p) => p.completeness < 60).length;

  const stats = [
    {
      title: "全部项目",
      value: String(total),
      icon: FolderOpen,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    },
    {
      title: "完整上下文 (≥80%)",
      value: String(highCompleteness),
      icon: ShieldCheck,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      title: "待完善项目 (<60%)",
      value: String(lowCompleteness),
      icon: Clock,
      iconColor: "text-rose-600",
      iconBg: "bg-rose-50",
    },
    {
      title: "项目总数",
      value: String(total),
      icon: FolderOpen,
      iconColor: "text-teal-600",
      iconBg: "bg-teal-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-slate-500 text-sm font-medium mb-1">{stat.title}</h4>
                <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
              </div>
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.iconBg)}>
                <Icon className={cn("w-5 h-5", stat.iconColor)} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

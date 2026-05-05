import React from "react";
import { Users, Folder, CheckSquare, ClipboardCheck, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface StatItem {
  title: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

interface StatsCardsProps {
  stats?: StatItem[];
}

export function StatsCards({ stats: externalStats }: StatsCardsProps) {
  const defaultStats: StatItem[] = [
    {
      title: "研讨总数",
      value: "0",
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      title: "已沉淀项目上下文",
      value: "0",
      icon: Folder,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-500",
    },
    {
      title: "已完成研讨",
      value: "0",
      icon: CheckSquare,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-500",
    },
    {
      title: "进行中研讨",
      value: "0",
      icon: ClipboardCheck,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
  ];

  const displayStats = externalStats ?? defaultStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {displayStats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm flex items-start gap-4"
        >
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
              stat.iconBg,
              stat.iconColor,
            )}
          >
            <stat.icon className="w-6 h-6" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm font-medium text-slate-500">
              {stat.title}
            </span>
            <span className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">
              {stat.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

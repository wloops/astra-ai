import React from "react";
import { Users, Folder, CheckSquare, ClipboardCheck } from "lucide-react";
import { cn } from "../../lib/utils";

export function StatsCards() {
  const stats = [
    {
      title: "本周研讨次数",
      value: "12",
      change: "33%",
      isUp: true,
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      title: "已沉淀项目上下文",
      value: "18",
      change: "20%",
      isUp: true,
      icon: Folder,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-500",
    },
    {
      title: "达成结论数",
      value: "23",
      change: "53%",
      isUp: true,
      icon: CheckSquare,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-500",
    },
    {
      title: "待跟进行动项",
      value: "7",
      change: "13%",
      isUp: false,
      icon: ClipboardCheck,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
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
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-500">
              {stat.title}
            </span>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-2xl font-semibold tracking-tight text-slate-900">
                {stat.value}
              </span>
              <span className={cn(
                "text-xs font-medium flex items-center",
                stat.isUp ? "text-green-500" : "text-red-500"
              )}>
                较上周 {stat.isUp ? "↑" : "↓"} {stat.change}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import React from "react";
import { FolderOpen, ShieldCheck, Clock, Users, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "../../lib/utils";

const stats = [
  {
    title: "全部项目",
    value: "12",
    trend: 2,
    trendDirection: "up",
    icon: FolderOpen,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    title: "完整上下文",
    value: "8",
    trend: 1,
    trendDirection: "up",
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    title: "待完善项目",
    value: "4",
    trend: -1,
    trendDirection: "down",
    icon: Clock,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50",
  },
  {
    title: "我的参与",
    value: "6",
    trend: 2,
    trendDirection: "up",
    icon: Users,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
  },
];

export function ProjectsOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const isUp = stat.trendDirection === "up";
        
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
            
            <div className="flex items-center text-xs">
              <span className="text-slate-400 mr-2">较上周</span>
              <span className={cn(
                "flex items-center font-medium",
                isUp ? "text-emerald-500" : "text-rose-500"
              )}>
                {isUp ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
                {Math.abs(stat.trend)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

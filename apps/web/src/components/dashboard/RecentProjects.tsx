import React from "react";
import { Folder, Briefcase, MessageSquareText, Headphones, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export function RecentProjects() {
  const projects = [
    {
      title: "企业极速差旅报销系统",
      tag: "需求澄清",
      tagColor: "text-green-600 bg-green-50",
      desc: "企业级差旅报销系统（V2.0 智能化重构）",
      contextValue: 92,
      time: "5月20日 10:30",
      iconBg: "bg-teal-50 text-teal-600",
      icon: Briefcase,
    },
    {
      title: "智能合同审查平台",
      tag: "方案评审",
      tagColor: "text-blue-600 bg-blue-50",
      desc: "AI 驱动的合同智能审查与风险识别平台",
      contextValue: 78,
      time: "5月19日 16:45",
      iconBg: "bg-blue-50 text-blue-600",
      icon: MessageSquareText,
    },
    {
      title: "客服质检优化平台",
      tag: "产品优化",
      tagColor: "text-purple-600 bg-purple-50",
      desc: "基于大模型的客服对话质检与洞察平台",
      contextValue: 64,
      time: "5月19日 09:15",
      iconBg: "bg-purple-50 text-purple-600",
      icon: Headphones,
    },
  ];

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
        {projects.map((p, idx) => (
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

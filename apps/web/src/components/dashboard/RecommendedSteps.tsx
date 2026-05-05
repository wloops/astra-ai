import React from "react";
import { cn } from "../../lib/utils";

export function RecommendedSteps() {
  const steps = [
    {
      title: "完善项目上下文",
      desc: "为「智能合同审查平台」补充更多上下文，提升研讨质量",
      btnText: "去完善",
      iconColor: "text-teal-600",
      iconBg: "bg-teal-50",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M12 3v18" />
          <rect width="18" height="18" x="3" y="3" rx="2" />
        </svg>
      ),
    },
    {
      title: "跟进行动项",
      desc: "还有 7 个行动项待跟进，推动项目落地",
      btnText: "去查看",
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
          <path d="M17 14h-6" />
          <path d="M13 18H7" />
          <path d="M7 14h.01" />
          <path d="M17 18h.01" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
        </svg>
      ),
    },
    {
      title: "回顾历史结论",
      desc: "回顾过往关键结论，避免重复讨论",
      btnText: "去回顾",
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full">
      <h2 className="text-base font-semibold text-slate-900 mb-4 px-2 pt-2">
        推荐下一步
      </h2>

      <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4 items-start">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                step.iconBg,
                step.iconColor,
              )}
            >
              {step.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                {step.desc}
              </p>
            </div>
            <button className="shrink-0 text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 transition-colors">
              {step.btnText}
            </button>
          </div>
        ))}

        <div className="w-full pt-2 flex justify-center text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
          查看更多建议
        </div>
      </div>
    </div>
  );
}

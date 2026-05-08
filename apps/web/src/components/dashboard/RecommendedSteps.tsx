import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { DiscussionSession, Project, Task } from "../../api/types";

interface RecommendedStepsProps {
  sessions?: DiscussionSession[];
  projects?: Project[];
  tasks?: Task[];
}

export function RecommendedSteps({ sessions: externalSessions, projects: externalProjects, tasks: externalTasks }: RecommendedStepsProps) {
  const sessions = externalSessions ?? [];
  const projects = externalProjects ?? [];
  const tasks = externalTasks ?? [];

  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const lowCompletenessProjects = projects.filter((p) => p.completeness < 60);
  const activeTaskCount = tasks.filter((task) => task.status === "todo" || task.status === "in_progress").length;

  const steps = [
    ...(activeTaskCount > 0 ? [{
      title: "执行待办任务",
      desc: `当前有 ${activeTaskCount} 个待推进任务需要处理`,
      btnText: "去看板",
      href: "/task-board",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    }] : []),
    {
      title: lowCompletenessProjects.length > 0 ? "完善项目上下文" : "发起新的研讨",
      desc:
        lowCompletenessProjects.length > 0
          ? `还有 ${lowCompletenessProjects.length} 个项目上下文完整度不足60%`
          : "发起一场多 Agent 智能研讨，验证产品功能",
      btnText: lowCompletenessProjects.length > 0 ? "去完善" : "去发起",
      href: lowCompletenessProjects.length > 0 ? "/project-context" : "/start-session",
      iconColor: "text-teal-600",
      iconBg: "bg-teal-50",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M12 3v18" />
          <rect width="18" height="18" x="3" y="3" rx="2" />
        </svg>
      ),
    },
    {
      title: "查看会议历史",
      desc: completedCount > 0 ? `已有 ${completedCount} 次完成的研讨，回顾历史结论` : "会议历史为空，完成首次研讨后即可查看",
      btnText: "去查看",
      href: "/session-history",
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M17 14h-6" /><path d="M13 18H7" /><path d="M7 14h.01" /><path d="M17 18h.01" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
        </svg>
      ),
    },
    {
      title: "管理角色与场景",
      desc: "配置 Agent 角色和场景模板以适配你的业务需求",
      btnText: "去配置",
      href: "/role-config",
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
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
            <Link to={step.href} className="shrink-0 text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 transition-colors">
              {step.btnText}
            </Link>
          </div>
        ))}

        <div className="w-full pt-2 flex justify-center text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
          查看更多建议
        </div>
      </div>
    </div>
  );
}

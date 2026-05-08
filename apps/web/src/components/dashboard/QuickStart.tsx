import React from "react";
import { Plus, Clock, FolderCog, ChevronRight, KanbanSquare } from "lucide-react";
import { Link } from "react-router-dom";

export function QuickStart() {
  return (
    <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-blue-600"
        >
          <path d="m13 2-2 2.5h3L11 22l2-2.5h-3L13 2Z" />
        </svg>
        <h2 className="text-base font-semibold text-slate-900">快速开始</h2>
        <span className="text-sm text-slate-400 ml-2">
          从这里快速发起研讨或管理你的工作内容
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/start-session" className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-[16px] p-4 text-left flex items-center justify-between group shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-semibold text-white">发起研讨</div>
              <div className="text-xs text-white/80 mt-0.5">
                开启一场高质量的 Agent 研讨
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white transition-transform group-hover:translate-x-1" />
        </Link>

        <Link to="/session-history" className="border border-slate-200 bg-slate-50/50 rounded-[16px] p-4 text-left flex items-center justify-between group hover:bg-slate-50 transition-all hover:border-slate-300">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-slate-200 bg-white rounded-xl flex items-center justify-center text-slate-500 group-hover:text-slate-700 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                查看历史
              </div>
              <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                查看最近的会议记录与结论
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
        </Link>

        <Link to="/project-context" className="border border-slate-200 bg-slate-50/50 rounded-[16px] p-4 text-left flex items-center justify-between group hover:bg-slate-50 transition-all hover:border-slate-300">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-slate-200 bg-white rounded-xl flex items-center justify-center text-slate-500 group-hover:text-slate-700 transition-colors">
              <FolderCog className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                管理项目
              </div>
              <div className="text-xs text-slate-500 mt-0.5 shrink-0 whitespace-nowrap">
                管理项目与上下文资产
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
        </Link>

        <Link to="/task-board" className="border border-slate-200 bg-slate-50/50 rounded-[16px] p-4 text-left flex items-center justify-between group hover:bg-slate-50 transition-all hover:border-slate-300">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-slate-200 bg-white rounded-xl flex items-center justify-center text-slate-500 group-hover:text-slate-700 transition-colors">
              <KanbanSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">任务看板</div>
              <div className="text-xs text-slate-500 mt-0.5 shrink-0 whitespace-nowrap">
                跟踪行动项与执行状态
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

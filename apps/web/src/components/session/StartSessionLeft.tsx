import React from "react";
import {
  Sparkles,
  FileText,
  Users,
  Network,
  Folder,
  MessageSquare,
  Rocket,
} from "lucide-react";

export function StartSessionLeft() {
  return (
    <div className="flex flex-col xl:pr-12 pt-4">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-600 text-sm font-medium mb-6 w-max">
        <Sparkles className="w-4 h-4 fill-current" />
        <span>智能研讨 / Smart Session</span>
      </div>

      <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
        发起一场高质量多 Agent 研讨
      </h1>

      <p className="text-base xl:text-lg text-slate-600 mb-10 leading-relaxed max-w-[480px]">
        选择项目上下文、场景与议题，邀请合适的专家角色，让多 Agent
        协同为你提供结构化、可落地的研讨结论。
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-14">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
          <FileText className="w-4 h-4 text-teal-500" />
          <span>业务上下文驱动</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
          <Users className="w-4 h-4 text-blue-500" />
          <span>多角色协同</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
          <Network className="w-4 h-4 text-purple-500" />
          <span>结构化输出</span>
        </div>
      </div>

      {/* Step Diagram Card */}
      <div className="bg-white/60 backdrop-blur-xl border border-white rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center relative mb-4">
              <Folder className="w-8 h-8 text-teal-500" />
              <div className="absolute -bottom-2 w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm">
                1
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-900">选择项目</div>
            <div className="text-xs text-slate-500 mt-1 max-w-[80px] text-center">
              选择项目上下文
              <br />
              提供完整背景
            </div>
          </div>

          <div className="h-px bg-slate-200 flex-1 mx-4 -mt-10"></div>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center relative mb-4">
              <MessageSquare className="w-8 h-8 text-blue-500" />
              <div className="absolute -bottom-2 w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm">
                2
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-900">配置议题</div>
            <div className="text-xs text-slate-500 mt-1 max-w-[80px] text-center">
              定义研讨议题
              <br />
              明确关注问题
            </div>
          </div>

          <div className="h-px bg-slate-200 flex-1 mx-4 -mt-10"></div>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center relative mb-4">
              <Users className="w-8 h-8 text-indigo-500" />
              <div className="absolute -bottom-2 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm">
                3
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-900">选择角色</div>
            <div className="text-xs text-slate-500 mt-1 max-w-[80px] text-center">
              邀请专家角色
              <br />
              组成研讨团队
            </div>
          </div>

          <div className="h-px bg-slate-200 flex-1 mx-4 -mt-10"></div>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center relative mb-4">
              <Rocket className="w-8 h-8 text-blue-600" />
              <div className="absolute -bottom-2 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm">
                4
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-900">启动研讨</div>
            <div className="text-xs text-slate-500 mt-1 max-w-[80px] text-center">
              多 Agent 协同
              <br />
              生成结论建议
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

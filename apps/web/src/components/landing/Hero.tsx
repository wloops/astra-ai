import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Layers, Users, CheckSquare, FileText } from 'lucide-react';
import { HeroDiscussionMockup } from './HeroDiscussionMockup';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Decorative Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[50%] bg-cyan-300/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10 min-w-0">
        <div className="w-full lg:flex-1 max-w-2xl lg:max-w-none shrink-0 pr-0 xl:pr-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-sm font-medium mb-8">
            <Users size={16} />
            <span>多 Agent 协同 · 智能研讨 · 高效落地</span>
          </div>
          <h1 className="text-5xl lg:text-[60px] leading-[1.15] font-extrabold text-slate-900 tracking-tight mb-8">
            让复杂议题，<br />
            在<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">多 Agent 研讨中</span><br />
            收敛成可执行结果
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-10 max-w-xl">
            Astra AI 读取项目背景与上下文，智能编排多领域专家 Agent 协同研讨，识别争议焦点，推动深度讨论，最终输出结构化结论与行动清单，让每次决策更清晰、可落地。
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-12">
            <Link to="/dashboard" className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-500/25 transition-all outline-none focus:ring-4 focus:ring-blue-100">
              <Play fill="currentColor" size={20} />
              开始一次研讨
            </Link>
            <button className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-bold text-lg border border-slate-200 shadow-sm transition-all focus:ring-4 focus:ring-slate-100">
              <Layers size={20} className="text-slate-400" />
              查看演示案例
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
              <FileText size={16} className="text-blue-500" />
              <div>
                <span className="text-slate-800 font-bold block leading-tight">上下文驱动</span>
                <span className="text-[10px]">深度理解项目背景</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
              <Users size={16} className="text-emerald-500" />
              <div>
                <span className="text-slate-800 font-bold block leading-tight">多角色协同</span>
                <span className="text-[10px]">专业 Agent 协同研讨</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
              <CheckSquare size={16} className="text-purple-500" />
              <div>
                <span className="text-slate-800 font-bold block leading-tight">结构化交付</span>
                <span className="text-[10px]">结论清晰，行动可执行</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[50%] xl:w-[55%] flex justify-center lg:justify-end shrink min-w-0">
          <HeroDiscussionMockup />
        </div>
      </div>
    </section>
  );
}

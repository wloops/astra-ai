import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden mx-auto max-w-7xl px-6 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/50 border border-blue-100 text-blue-600 text-sm font-medium mb-8">
        <Sparkles className="w-4 h-4" />
        <span>Agora AI 2.0 现已发布，搭载全新智能研讨 Agent</span>
      </div>
      <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-tight">
        让团队思考真正<br className="hidden md:block"/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600">转化为业务资产</span>
      </h1>
      <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
        Agora AI 是新一代智能工作台，能够自动捕捉研讨上下文、提取核心结论并追踪行动项，让您的企业知识不再沉睡在回忆里。
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to="/dashboard" className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 group">
          开启你的智能工作台
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
        <button className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
          预约演示
        </button>
      </div>

      <div className="mt-20 relative mx-auto max-w-5xl">
        <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFF] via-transparent to-transparent z-10" />
        <div className="rounded-2xl border border-slate-200/60 bg-white/40 p-2 backdrop-blur-sm shadow-2xl overflow-hidden transform relative">
          <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3" alt="Dashboard Preview" className="rounded-xl border border-slate-200/50 object-cover object-center w-full h-[300px] md:h-[500px]" />
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <Link to="/dashboard" className="px-6 py-3 bg-white/90 backdrop-blur-md text-slate-900 font-semibold rounded-full shadow-lg border border-slate-200 hover:scale-105 transition-transform flex items-center gap-2">
              进入工作台预览
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

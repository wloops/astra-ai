import React from 'react';
import { FileText, PieChart, LayoutGrid, Clock, Target, Check, ChevronRight, RefreshCw, Loader2, PlayCircle, LoaderCircle, History, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

export function WorkspaceRightPanel() {
  return (
    <div className="w-[320px] flex flex-col gap-4 overflow-y-auto pl-1 pr-1 shrink-0">
      
      {/* Project Context */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-700">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-sm">项目上下文</h3>
          </div>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
            查看全部
          </button>
        </div>
        
        <h4 className="font-bold text-slate-900 text-[15px] mb-3 leading-snug">
          企业极速差旅报销系统（V2.0 智能化重构）
        </h4>
        
        <div className="space-y-3 text-[13px] text-slate-600">
          <div className="flex items-start gap-2">
            <LayoutGrid className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <span className="shrink-0">场景:</span>
            <span className="text-slate-800">需求澄清</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <span className="shrink-0">创建时间:</span>
            <span className="text-slate-800">2025-05-28 09:41</span>
          </div>
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <span className="shrink-0">项目描述:</span>
            <span className="text-slate-800 leading-relaxed">打造一体化差旅报销平台，提升报销效率与合规管控能力。</span>
          </div>
        </div>
      </div>

      {/* Session Progress */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
        <div className="flex items-center gap-2 mb-6">
          <PieChart className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-sm text-slate-800">会议进度</h3>
        </div>

        <div className="flex items-center gap-5 mb-8">
          <div className="relative w-20 h-20 shrink-0">
            {/* SVG Ring Progress */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="40"
                className="stroke-slate-100"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="50" cy="50" r="40"
                className="stroke-blue-500"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="251.2"
                strokeDashoffset="135.6" /* ~46% of 251.2 */
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tracking-tighter text-slate-900">46<span className="text-sm font-semibold">%</span></span>
              <span className="text-[9px] text-slate-400 font-medium">整体进度</span>
            </div>
          </div>
          <div className="flex flex-col flex-1 pl-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">预计剩余</span>
              <span className="text-slate-900 font-semibold">18 分钟</span>
            </div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-500">预计完成</span>
              <span className="text-slate-900 font-semibold">14:58</span>
            </div>
            {/* Linear progress bar */}
            <div className="h-1.5 bg-slate-100 rounded-full w-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full w-[46%]"></div>
            </div>
          </div>
        </div>

        {/* Dense progress list */}
        <div className="space-y-3">
          {[
            { name: '议题定义', status: 'completed' },
            { name: '信息收集与澄清', status: 'completed' },
            { name: '多 Agent 分析与辩论', status: 'current' },
            { name: '共识归纳', status: 'upcoming' },
            { name: '结论输出与建议', status: 'upcoming' },
            { name: '总结与下一步', status: 'upcoming' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {item.status === 'completed' && <Check className="w-3.5 h-3.5 text-green-500" />}
                {item.status === 'current' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1 mr-1"></div>}
                {item.status === 'upcoming' && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 text-transparent"></div>}
                <span className={cn(
                  "font-medium",
                  item.status === 'completed' ? "text-slate-600" :
                  item.status === 'current' ? "text-slate-900 font-bold" :
                  "text-slate-400"
                )}>
                  {item.name}
                </span>
              </div>
              <span className={cn(
                "text-xs font-medium",
                item.status === 'completed' ? "text-green-600" :
                item.status === 'current' ? "text-blue-600" :
                "text-slate-400"
              )}>
                {item.status === 'completed' ? '✓ 已完成' : 
                 item.status === 'current' ? '● 进行中' : 
                 '待开始'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Processes & Tools */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-5">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
           <h3 className="font-semibold text-sm text-slate-800">活跃进程与工具</h3>
        </div>

        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-slate-700">合规政策检索</span>
            </div>
            <div className="flex gap-2 items-center">
               <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium text-[10px]">完成</span>
               <span className="text-xs text-slate-400 w-10 text-right">14:36</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
               <div className="w-6 h-6 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
                <History className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-slate-900">历史决策相似案例检索</span>
            </div>
            <div className="flex gap-2 items-center">
               <span className="flex items-center gap-1 font-medium text-blue-600 text-xs">
                 <LoaderCircle className="w-3 h-3 animate-spin"/> 运行中
               </span>
               <span className="text-xs text-slate-400 w-10 text-right">14:36</span>
            </div>
          </div>

          <div className="flex items-center justify-between opacity-60">
            <div className="flex items-center gap-2.5">
               <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                <LayoutGrid className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-slate-600">风险规则匹配分析</span>
            </div>
            <div className="flex gap-2 items-center">
               <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium text-[10px]">排队中</span>
               <span className="w-10"></span>
            </div>
          </div>

          <div className="flex items-center justify-between opacity-60">
             <div className="flex items-center gap-2.5">
               <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-slate-600">财务系统数据模拟</span>
            </div>
            <div className="flex gap-2 items-center">
               <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium text-[10px]">待执行</span>
               <span className="w-10"></span>
            </div>
          </div>
        </div>

        <button className="w-full py-2.5 mt-4 bg-blue-50/50 hover:bg-blue-50 text-blue-600 text-sm font-medium rounded-xl transition-colors flex justify-center items-center gap-1.5 border border-blue-100/50">
          查看全部工具与日志 <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}

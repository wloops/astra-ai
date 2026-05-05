import React from 'react';
import { Copy, Plus, Check } from 'lucide-react';

const stages = [
  { id: 1, name: '议题定义', status: 'completed', time: '14:32' },
  { id: 2, name: '信息收集与澄清', status: 'completed', time: '14:36' },
  { id: 3, name: '多 Agent 分析与辩论', status: 'current', time: '进行中 · 预计 8-12 分钟' },
  { id: 4, name: '共识归纳', status: 'upcoming', time: '待开始' },
  { id: 5, name: '结论输出与建议', status: 'upcoming', time: '待开始' },
  { id: 6, name: '总结与下一步', status: 'upcoming', time: '待开始' },
];

export function WorkspaceLeftPanel() {
  return (
    <div className="w-[320px] flex flex-col gap-4 overflow-y-auto pr-1 shrink-0">
      {/* Session Info */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">多 Agent 智能研讨中</h2>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            实时
          </div>
        </div>
        <div className="space-y-2 text-sm text-slate-500">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">会议 ID: AG-20250603-0012 <Copy className="w-3.5 h-3.5 cursor-pointer hover:text-slate-800" /></span>
          </div>
          <div>开始时间: 14:32:18</div>
        </div>
      </div>

      {/* Current Topic */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-slate-100 p-1 rounded">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8l-4 4v14a2 2 0 0 0 2 2z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>
          </span>
          <h3 className="text-sm font-medium text-slate-700">当前议题</h3>
        </div>
        <h2 className="text-[22px] font-bold text-slate-900 leading-snug mb-5">
          是否允许 200 元以下打车或餐饮发票自动结算？
        </h2>
        <div className="flex flex-wrap gap-2">
          {['费用管理', '合规风控', '效率提升'].map(tag => (
            <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
              {tag}
            </span>
          ))}
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-blue-500 hover:bg-slate-100 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Discussion Stages */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"></path><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8l-4 4v14a2 2 0 0 0 2 2z"></path></svg>
            <h3 className="text-sm font-medium text-slate-900">研讨阶段</h3>
          </div>
          <span className="text-sm text-slate-400 font-medium">3 / 6</span>
        </div>

        <div className="relative space-y-6 mt-2 pb-4">
          {/* Vertical Track line */}
          <div className="absolute left-[11px] top-6 bottom-6 w-px bg-slate-200"></div>
          
          {stages.map((stage, index) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const isUpcoming = stage.status === 'upcoming';
            
            return (
              <div key={stage.id} className="relative flex items-start gap-4">
                {/* Step indicator */}
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ring-4 ring-white
                  ${isCompleted ? 'bg-blue-600 text-white' : 
                    isCurrent ? 'bg-blue-600 text-white' : 
                    'bg-slate-100 text-slate-400 font-medium border border-slate-200'}`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : stage.id}
                </div>

                <div className={`flex flex-col -mt-0.5 w-full
                  ${isUpcoming ? 'opacity-50' : 'opacity-100'}
                `}>
                  <div className="flex justify-between items-baseline w-full">
                    <span className={`text-sm font-medium ${isCurrent ? 'text-blue-600' : 'text-slate-800'}`}>
                      {stage.name}
                    </span>
                    {isCompleted && (
                      <span className="text-[11px] text-slate-400">{stage.time}</span>
                    )}
                  </div>
                  {isCurrent && (
                    <div className="mt-1 flex items-center text-xs text-slate-500">
                      <span className="inline-flex w-[2px] h-[2px] rounded-full bg-slate-400 mr-2"></span>
                      {stage.time}
                    </div>
                  )}
                  {isUpcoming && (
                    <div className="mt-0.5 text-xs text-slate-400">
                      {stage.time}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

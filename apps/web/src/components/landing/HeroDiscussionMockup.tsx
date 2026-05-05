import React from 'react';
import {
  Settings, User, Layers, Shield, Plus, Target, ArrowRight,
  CheckCircle2, CircleDashed, FileText, CheckSquare, Users,
} from 'lucide-react';
import { Tag } from './Tag';

export function HeroDiscussionMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-blue-900/5 border border-slate-100 flex flex-col w-full max-w-[760px] aspect-[4/3] sm:aspect-[16/11] lg:aspect-[16/10] mx-auto lg:mx-0 overflow-hidden relative text-[13px] sm:text-sm">
      {/* Header */}
      <div className="px-5 py-3 sm:py-3.5 flex items-center justify-between border-b border-slate-50 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800 text-[13px] sm:text-sm">
            多 Agent 研讨中 · 企业极速差旅报销系统
          </span>
        </div>
        <div className="flex items-center gap-3 text-[12px] sm:text-[13px] text-slate-500">
          <span>已进行 00:32</span>
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-blue-100 text-blue-600 font-bold text-[11px] sm:text-xs bg-white shadow-sm">
            43%
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 p-4 sm:p-5 gap-4 lg:gap-5 bg-slate-50/30 overflow-hidden">
        {/* Left Chat Area */}
        <div className="flex-1 flex flex-col gap-3 sm:gap-4 overflow-hidden">
          {/* Roles */}
          <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-1 shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {([
              { role: 'AI 主持人', status: '主持中', color: 'blue', icon: Settings },
              { role: '产品经理', status: '参与中', color: 'emerald', icon: User },
              { role: '后端架构师', status: '参与中', color: 'indigo', icon: Layers },
              { role: '测试工程师', status: '参与中', color: 'amber', icon: Shield },
            ] as const).map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 p-2 pr-3.5 rounded-xl border border-${r.color}-100 bg-${r.color}-50/50 min-w-max`}
              >
                <div className={`p-1.5 rounded-lg bg-${r.color}-100 text-${r.color}-600`}>
                  <r.icon size={14} />
                </div>
                <div>
                  <div className="text-[12px] sm:text-[13px] font-semibold text-slate-800">{r.role}</div>
                  <div className={`text-[10px] leading-tight text-${r.color}-600 font-medium`}>{r.status}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-1 pb-2">
            <div className="shrink-0">
              <div className="text-[11px] font-medium text-slate-400 mb-1.5">当前讨论主题</div>
              <div className="flex gap-2">
                <Tag variant="blue">OCR 识别准确率</Tag>
                <Tag variant="gray">自动结算风险边界</Tag>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="mt-3 sm:mt-4 space-y-4 pb-2">
              <div className="flex gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Settings size={14} className="sm:w-4 sm:h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-slate-800">AI 主持人</span>
                    <span className="text-[11px] text-slate-400">15:21</span>
                  </div>
                  <div className="text-[12px] sm:text-[13px] text-slate-600 leading-relaxed bg-white p-2.5 sm:p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                    我们需要确定 OCR 识别准确率的最低可接受阈值，以及自动结算的风险边界。<br />
                    请各位专家从业务、技术和风险角度发表意见。
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <User size={14} className="sm:w-4 sm:h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-slate-800">产品经理 Aria</span>
                    <span className="text-[11px] text-slate-400">15:23</span>
                  </div>
                  <div className="text-[12px] sm:text-[13px] text-slate-600 leading-relaxed bg-white p-2.5 sm:p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                    从业务角度，建议将 OCR 准确率设为 ≥ 95%，低于此阈值将显著增加人工复核成本，<br />影响用户体验。
                  </div>
                </div>
              </div>

              <div className="flex gap-3 opacity-60">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Layers size={14} className="sm:w-4 sm:h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-slate-800">后端架构师 Linus</span>
                    <span className="text-[11px] text-slate-400">15:24</span>
                  </div>
                  <div className="text-[12px] sm:text-[13px] text-slate-500 leading-relaxed">
                    技术上 ≥ 95% 在当前模型表现下可实现，但需优化图像预处理...
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="mt-1 shrink-0 flex items-center gap-2 p-1.5 sm:p-2 bg-white border border-slate-200 rounded-full shadow-sm">
            <span className="text-[10px] sm:text-[11px] text-slate-400 pl-2 lg:pl-3 flex-1 flex items-center truncate">
              <span className="animate-pulse mr-1.5 h-3 w-0.5 bg-blue-500 rounded-full inline-block shrink-0" />
              <span className="truncate">AI 主持人正在推进讨论...</span>
            </span>
            <button className="text-blue-600 text-[11px] sm:text-xs font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded">
              <Plus size={12} /> <span className="hidden sm:inline">补充观点</span><span className="sm:hidden">补充</span>
            </button>
            <button className="text-blue-600 text-[11px] sm:text-xs font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded">
              <Target size={12} /> <span className="hidden sm:inline">指定角色</span><span className="sm:hidden">@角色</span>
            </button>
            <button className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center rounded-full sm:ml-1 shrink-0 shadow-md shadow-blue-500/20 transition-colors">
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[180px] lg:w-[190px] shrink-0 flex flex-col gap-3 sm:gap-4 hidden md:flex overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-2 pr-1">
          {/* Progress */}
          <div className="bg-white p-3 lg:p-4 rounded-xl border border-slate-100 shadow-sm shrink-0">
            <div className="text-[13px] font-bold text-slate-800 mb-3">研讨进度</div>
            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-slate-200 before:to-slate-200 pl-5">
              <div className="relative text-[11px] lg:text-xs text-slate-600 font-medium">
                <div className="absolute -left-5 top-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white ring-[3px] ring-white"><CheckCircle2 size={10} /></div>
                议题澄清
              </div>
              <div className="relative text-[11px] lg:text-xs text-slate-600 font-medium">
                <div className="absolute -left-5 top-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white ring-[3px] ring-white"><CheckCircle2 size={10} /></div>
                争议识别
              </div>
              <div className="relative text-[11px] lg:text-xs text-slate-800 font-bold flex items-center justify-between">
                <div className="absolute -left-5 top-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center ring-[3px] ring-white"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /></div>
                <span>展开辩论</span>
              </div>
              <div className="relative text-[11px] lg:text-xs text-slate-400 font-medium mt-2">
                <div className="absolute -left-5 top-0 w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center ring-[3px] ring-white"><CircleDashed size={10} className="text-slate-300" /></div>
                结论确认
              </div>
              <div className="relative text-[11px] lg:text-xs text-slate-400 font-medium mt-2">
                <div className="absolute -left-5 top-0 w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center ring-[3px] ring-white"><CircleDashed size={10} className="text-slate-300" /></div>
                生成交付物
              </div>
            </div>
          </div>

          <div className="bg-white p-3 lg:p-4 rounded-xl border border-slate-100 shadow-sm shrink-0">
            <div className="text-[13px] font-bold text-slate-800 mb-2 lg:mb-3 flex justify-between items-center">
              关键争议点
            </div>
            <ul className="text-[11px] lg:text-xs text-slate-600 space-y-2 lg:space-y-2.5">
              <li className="flex items-start gap-1.5"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full mt-[3px] shrink-0" /> <span className="leading-tight">OCR 识别准确率阈值</span></li>
              <li className="flex items-start gap-1.5"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full mt-[3px] shrink-0" /> <span className="leading-tight">自动结算风险边界</span></li>
              <li className="flex items-start gap-1.5"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full mt-[3px] shrink-0" /> <span className="leading-tight">异常场景处理策略</span></li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-50/50 to-white p-3 lg:p-4 rounded-xl border border-blue-100/50 shadow-sm shrink-0">
            <div className="text-[13px] font-bold text-slate-800 mb-2 lg:mb-3">预期产出</div>
            <ul className="text-[11px] lg:text-xs text-slate-600 space-y-1.5 lg:space-y-2">
              <li className="flex items-center gap-1.5"><FileText size={12} className="text-slate-400" /> 结论摘要</li>
              <li className="flex items-center gap-1.5"><CheckSquare size={12} className="text-slate-400" /> 行动项清单</li>
              <li className="flex items-center gap-1.5"><Users size={12} className="text-slate-400" /> 责任与节点</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

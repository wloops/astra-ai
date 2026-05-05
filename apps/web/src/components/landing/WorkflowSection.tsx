import React from 'react';
import {
  FileText, Target, Users, Zap, CheckSquare,
  Layers, CheckCircle2, ArrowRight,
} from 'lucide-react';

const steps = [
  { num: 1, icon: FileText, title: '注入项目上下文', desc: '读取项目背景、当前进展与约束条件，构建完整上下文视图。', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { num: 2, icon: Target, title: 'AI 主持人拆解议题', desc: '基于上下文澄清目标，拆解核心问题，定义讨论维度与研讨路线。', color: 'text-blue-500', bg: 'bg-cyan-50' },
  { num: 3, icon: Users, title: '多角色独立评审', desc: '产品、架构、测试等专家基于专业视角，独立分析并给出观点。', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { num: 4, icon: Zap, title: '争议识别与交叉辩论', desc: '自动识别观点冲突与分歧点，发起交叉辩论，推动讨论深入。', color: 'text-amber-500', bg: 'bg-amber-50' },
  { num: 5, icon: CheckSquare, title: '输出结论与行动项', desc: '汇总关键结论，明确责任人与行动项，形成可落地的决策输出。', color: 'text-blue-600', bg: 'bg-blue-50' },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-24 bg-white relative">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-50 border border-cyan-100 rounded-full text-cyan-600 text-sm font-semibold mb-4 tracking-wide">
            <Layers size={14} /> 工作流 / Workflow
          </div>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">从上下文到结论的智能研讨流程</h2>
          <p className="text-slate-500 text-lg">Astra AI 驱动多 Agent 协同研讨，将复杂议题拆解、辩论、汇聚，输出可执行的决策结论。</p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 md:gap-2 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-[64px] lg:top-[72px] left-[5%] right-[5%] h-0.5 bg-slate-100 z-0" />

          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-xl shadow-slate-200/40 flex-1 min-w-[200px] lg:max-w-[260px] w-full text-center relative z-10 hover:-translate-y-1 transition-transform flex flex-col items-center h-full">
                <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  {step.num}
                </div>
                <div className={`w-20 h-20 mx-auto ${step.bg} rounded-full flex items-center justify-center mb-6 shrink-0`}>
                  <step.icon size={32} className={step.color} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-3 shrink-0">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed flex-1">{step.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:flex flex-col justify-center text-cyan-300 z-10 shrink-0 mx-1">
                  <ArrowRight size={24} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Bottom Feature Bar */}
        <div className="mt-16 bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-wrap gap-8 items-center justify-center max-w-4xl mx-auto shadow-sm">
          {[
            { icon: Layers, color: 'text-blue-500', title: '业务上下文', desc: '完整理解项目全貌' },
            { icon: Users, color: 'text-emerald-500', title: '角色调度', desc: '专家 Agent 智能协同' },
            { icon: Target, color: 'text-amber-500', title: '冲突识别', desc: '分歧发现与深度辩论' },
            { icon: CheckCircle2, color: 'text-blue-600', title: '行动闭环', desc: '结论落地与持续跟进' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="w-px h-8 bg-slate-200 hidden md:block" />}
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-white shadow-sm rounded-lg ${item.color}`}>
                  <item.icon size={20} />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{item.title}</div>
                  <div className="text-xs text-slate-500">{item.desc}</div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

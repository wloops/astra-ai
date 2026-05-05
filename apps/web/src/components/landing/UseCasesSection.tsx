import React from 'react';
import {
  Sparkles, MessageSquare, PieChart, Layers, Shield,
  Settings, User, FileText, Users, ArrowRight,
} from 'lucide-react';

const cases = [
  {
    icon: MessageSquare, iconColor: 'text-blue-500', iconBg: 'bg-blue-50',
    title: '需求澄清', desc: '澄清需求背景与边界，识别潜在风险与不确定性，对齐目标与期望。',
    roles: ['产品经理', '业务专家', '用户代表'],
  },
  {
    icon: PieChart, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50',
    title: '产品方案评审', desc: '评估方案的可行性、价值与风险，提出优化建议，验证方案的可落地性。',
    roles: ['产品经理', '设计专家', '技术专家'],
  },
  {
    icon: Layers, iconColor: 'text-indigo-500', iconBg: 'bg-indigo-50',
    title: '架构评审', desc: '评估架构的合理性、扩展性与可维护性，识别技术风险与演进建议。',
    roles: ['架构师', '技术专家', '运维专家'],
  },
  {
    icon: Shield, iconColor: 'text-amber-500', iconBg: 'bg-amber-50',
    title: '上线前风险评审', desc: '识别上线前的潜在风险与阻塞项，给出应对策略与验证计划，保障顺利发布。',
    roles: ['测试专家', '运维专家', '安全专家'],
  },
  {
    icon: MessageSquare, iconColor: 'text-cyan-500', iconBg: 'bg-cyan-50',
    title: '技术方案辩论', desc: '围绕关键技术方案展开多角度辩论，验证假设，形成最优技术决策。',
    roles: ['技术专家', '架构师', '性能专家'],
  },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="py-24 bg-slate-50/50">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">适用场景</h2>
          </div>
          <p className="text-slate-500">覆盖研发全流程中的关键决策环节，让 AI 主持的多 Agent 研讨为团队带来高质量、更高效率的协同决策体验。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.iconBg} ${c.iconColor}`}>
                  <c.icon size={24} />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{c.title}</h3>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">{c.desc}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {c.roles.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 text-slate-600 text-xs rounded-lg font-medium">
                    <User size={12} className="text-slate-400" /> {r}
                  </span>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-50 mt-auto flex items-center justify-between text-sm font-medium text-blue-600 group-hover:text-blue-700">
                查看模板 <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}

          {/* Special Configurable Card */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3 text-blue-700 font-bold text-lg">
                <Settings size={20} /> 场景可配置
              </div>
              <p className="text-sm text-blue-800/70 leading-relaxed mb-6">支持灵活配置研讨阶段、参与角色与输出模板，按需切换最佳研讨模式，适配不同团队与项目特点。</p>

              <div className="space-y-3 mb-6 bg-white/60 p-4 rounded-xl border border-white/50 backdrop-blur-sm">
                {[
                  { l: '阶段配置', icon: Layers },
                  { l: '角色配置', icon: Users },
                  { l: '输出模板', icon: FileText },
                ].map((item, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <item.icon size={14} className="text-blue-500" /> {item.l}
                    </span>
                    <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                      <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto inline-flex items-center gap-1.5 px-4 py-2 bg-white text-blue-600 font-bold text-sm rounded-xl w-max shadow-sm shadow-blue-900/5 hover:-translate-y-0.5 transition-transform cursor-pointer">
                了解更多 <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import {
  Sparkles, FileText, Users, Zap, CheckSquare,
  MessageSquare, User, Database, LayoutTemplate,
} from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/50 border border-blue-500/30 rounded-full text-blue-300 text-sm font-semibold mb-4 tracking-wide">
            <Sparkles size={14} /> 核心能力 / Why Astra AI
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4">为什么适合复杂业务协作</h2>
          <p className="text-slate-400 text-lg">从议题发起到结构化结论输出，围绕业务上下文，多角色协同研讨，识别争议并形成可执行决策。</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 p-8 rounded-3xl transition-colors group">
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20">
                <FileText size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-300 transition-colors">业务上下文驱动</h3>
                <p className="text-slate-400 leading-relaxed mb-6">基于项目背景与业务数据，提供精准信息支持与上下文理解。</p>
                <ul className="space-y-3">
                  {['自动提取关键背景与约束条件', '关联历史资料与相关数据', '识别关键概念与依赖关系'].map((t, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 p-8 rounded-3xl transition-colors group">
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Users size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-emerald-300 transition-colors">多角色协同研讨</h3>
                <p className="text-slate-400 leading-relaxed mb-6">支持多 Agent 与人类专家共同参与，模拟真实评审流程。</p>
                <ul className="space-y-3">
                  {['AI 主持人引导讨论节奏', '多角色观点补充与交叉质询', '分工明确，聚焦高效决策'].map((t, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 p-8 rounded-3xl transition-colors group">
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/20">
                <Zap size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-amber-300 transition-colors">争议识别与辩论</h3>
                <p className="text-slate-400 leading-relaxed mb-6">自动识别观点冲突与分歧点，展开结构化辩论，确保问题被充分讨论。</p>
                <ul className="space-y-3">
                  {['自动发现分歧与风险点', '多方论证与反驳', '形成可追溯的决策依据'].map((t, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 p-8 rounded-3xl transition-colors group">
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center shrink-0 border border-purple-500/20">
                <CheckSquare size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-purple-300 transition-colors">结构化交付物</h3>
                <p className="text-slate-400 leading-relaxed mb-6">研讨结束自动整理为结构化交付物，便于落地与跟踪。</p>
                <ul className="space-y-3">
                  {['自动生成结论与行动项', '责任人、优先级与时间清晰', '支持导出与集成到工作流'].map((t, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Bottom Bar */}
        <div className="mt-8 flex flex-wrap gap-4 *:flex-1 *:min-w-[200px]">
          {[
            { title: '不是单轮问答', desc: '支持深度研讨与多轮追问', icon: MessageSquare },
            { title: '主持机协同', desc: '人类专家与 AI 各司其职', icon: User },
            { title: '沉淀项目记忆', desc: '保留上下文与历史决策', icon: Database },
            { title: '适合真实场景', desc: '贴合企业实际协作流程', icon: LayoutTemplate },
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5 flex flex-col items-center text-center justify-center">
              <item.icon size={24} className="text-slate-400 mb-3" />
              <h4 className="font-bold text-slate-200 mb-1">{item.title}</h4>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Play, ArrowRight, Zap, CheckSquare, User,
  FileText, Layers, Target, Shield, Sparkles,
  Settings, Users, LayoutTemplate,
} from 'lucide-react';

export function CTASection() {
  return (
    <section id="cta" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 relative z-10">
        {/* Left Side: Mockup Card */}
        <div className="flex-1 w-full max-w-xl">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-2xl shadow-blue-900/5 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-100/50 blur-3xl -z-10 rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="flex items-center gap-3 mb-8">
              <FileText className="text-blue-500" size={24} />
              <h3 className="text-xl font-bold text-slate-800">从示例项目开始体验</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-500 flex items-center gap-2"><Layers size={14} /> 项目 / Project</div>
                <div className="font-semibold text-slate-800 pl-6">企业极速差旅报销系统</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-500 flex items-center gap-2"><Target size={14} /> 议题 / Topic</div>
                <div className="font-semibold text-slate-800 pl-6">是否允许 200 元以下打车或餐饮发票自动结算？</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-500 flex items-center gap-2"><LayoutTemplate size={14} /> 推荐场景 / Scenario</div>
                <div className="font-semibold text-slate-800 pl-6">需求澄清</div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-sm font-medium text-slate-500 flex items-center gap-2"><Users size={14} /> 默认角色 / Roles</div>
                <div className="flex flex-wrap gap-2 pl-6">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm border border-blue-100 flex items-center gap-1.5"><Settings size={14} /> AI 主持人</span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100 flex items-center gap-1.5"><User size={14} /> 产品经理</span>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-sm border border-indigo-100 flex items-center gap-1.5"><Layers size={14} /> 后端架构师</span>
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-sm border border-amber-100 flex items-center gap-1.5"><Shield size={14} /> 测试工程师</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-6">
                <div className="text-sm font-bold text-slate-800 mb-2">场景背景</div>
                <p className="text-xs text-slate-600 leading-relaxed">公司当前差旅报销流程中，200 元以下的打车或餐饮发票需人工审核，影响效率，希望通过自动结算提升报销体验。但需平衡合规风险与财务管控要求，明确可行方案与边界条件。</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Text & Actions */}
        <div className="flex-1">
          <h2 className="text-4xl lg:text-[48px] font-extrabold text-slate-900 leading-tight mb-6">
            立即发起一次<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">高质量研讨</span>
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed mb-10 max-w-md">
            Astra AI 帮助多 Agent 在线协作深度协同研讨，识别冲突，提炼共识，让复杂问题的决策更清晰、更可靠。
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-12">
            <Link to="/dashboard" className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-500/25 transition-all">
              <Play fill="currentColor" size={20} />
              使用示例启动研讨
            </Link>
            <Link to="/dashboard" className="flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-bold text-lg border border-slate-200 shadow-sm transition-all min-w-[200px]">
              进入工作台 <ArrowRight size={20} className="text-slate-400" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><Zap size={24} /></div>
              <div className="font-bold text-slate-800 text-sm mt-3">自动识别争议</div>
              <div className="text-xs text-slate-500 leading-relaxed">快速定位观点分歧<br />聚焦核心问题</div>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><CheckSquare size={24} /></div>
              <div className="font-bold text-slate-800 text-sm mt-3">生成结构化结论</div>
              <div className="text-xs text-slate-500 leading-relaxed">提炼共识与行动清单<br />输出可执行结果</div>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600"><User size={24} /></div>
              <div className="font-bold text-slate-800 text-sm mt-3">支持人工介入</div>
              <div className="text-xs text-slate-500 leading-relaxed">关键节点可人工参与<br />确保决策可控可靠</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

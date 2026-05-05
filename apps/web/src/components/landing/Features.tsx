import React from 'react';
import { Network, Brain, Zap, Shield } from 'lucide-react';

export function Features() {
  const features = [
    {
      title: "智能上下文分析",
      description: "自动提取会议和文档中的关键信息，形成结构化上下文关联，消除信息孤岛。",
      icon: Network,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "AI 决策助手",
      description: "基于企业历史数据与实时研讨，提供数据驱动的决策建议与风险提示。",
      icon: Brain,
      color: "text-teal-600",
      bg: "bg-teal-50"
    },
    {
      title: "自动化行动项提取",
      description: "精准识别讨论中的待办事项、负责人与时间节点，自动同步至项目看板。",
      icon: Zap,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      title: "企业级数据安全",
      description: "提供私有化部署选项，数据加密存储，完善的权限划分机制保障资产安全。",
      icon: Shield,
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    }
  ];

  return (
    <div id="features" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">重塑知识工作者的生产力</h2>
          <p className="text-lg text-slate-500">将零散的沟通转化为系统的知识体系，不仅提升当前效率，更在不断积累中形成企业的数字大脑。</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 \${feature.bg} \${feature.color}`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

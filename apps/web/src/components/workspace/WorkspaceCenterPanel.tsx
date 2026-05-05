import React from 'react';
import { 
  Bot, 
  User, 
  Code2, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Paperclip, 
  AtSign, 
  Smile, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

const roles = [
  { id: 'ai', name: 'AI 主持人', status: '在线', desc: '引导讨论，识别关键议点，推动达成共识', icon: Bot, iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
  { id: 'pm', name: '产品经理', status: '在线', desc: '聚焦用户体验与需求价值，提出产品视角的建议', icon: User, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { id: 'be', name: '后端架构师', status: '在线', desc: '评估技术可行性与成本，关注系统设计与集成实现', icon: Code2, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
  { id: 'qa', name: '测试工程师', status: '在线', desc: '识别测试风险与覆盖点，设计验证策略与标准', icon: ShieldCheck, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
];

const messages = [
  {
    type: 'message',
    id: 1,
    role: 'AI 主持人',
    badge: '主持中',
    time: '14:32',
    content: '我们已完成议题定义与信息澄清，进入多 Agent 分析与辩论阶段。请各位从各自专业视角发表初步观点，尤其关注合规风险、用户价值、技术实现与测试可行性。',
    avatar: Bot,
    avatarBg: 'bg-teal-100',
    avatarColor: 'text-teal-600'
  },
  {
    type: 'message',
    id: 2,
    role: '产品经理',
    time: '14:33',
    content: '从用户体验看，200 元以下消费场景频繁、金额小，要求手动提交发票会显著增加用户负担，影响报销效率与满意度。建议优先支持自动结算，并可结合风控策略控制边界。',
    avatarImageUrl: 'https://i.pravatar.cc/150?img=47' // Female avatar placeholder similar to mockup
  },
  {
    type: 'message',
    id: 3,
    role: '后端架构师',
    time: '14:34',
    content: '技术上可通过金额阈值 + 场景白名单 + 风控规则组合实现。需接入发票平台进行真伪校验与去重，同时对接财务系统生成凭证。初步评估复杂度中等，2-3 周可交付 MVP。',
    avatar: Code2,
    avatarBg: 'bg-indigo-100',
    avatarColor: 'text-indigo-600'
  },
  {
    type: 'message',
    id: 4,
    role: '测试工程师',
    time: '14:36',
    content: '主要风险在发票真伪、重复报销、金额拆分规避等场景。建议覆盖：边界金额（199/200）、异常发票样本、并发提交、补贴/优惠后金额计算等。需与风控规则联动验证。',
    avatar: ShieldCheck,
    avatarBg: 'bg-purple-100',
    avatarColor: 'text-purple-600'
  },
  {
    type: 'tool',
    id: 5,
    role: '系统工具调用',
    time: '14:36',
    toolName: '合规政策检索',
    toolStatus: '完成',
    summary: '结果摘要：未检索到明确禁⽌ 200 元以下发票自动结算的法规条款。多数企业实践以风险可控为前提，采用阈值与风控策略。',
    avatarIcon: <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div>
  },
  {
    type: 'summary',
    id: 6,
    role: '关键争议识别',
    time: '14:36',
    points: [
      '风险边界如何界定？（金额阈值、场景范围、发票类型）',
      '风控策略强度与用户体验的平衡点？',
      '异常识别与拦截覆盖是否足够？',
      '责任归属与审计追溯如何设计？'
    ],
    avatarIcon: <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg></div>
  }
];

export function WorkspaceCenterPanel() {
  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      {/* Roles Status Banner */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <h3 className="font-semibold text-slate-900">参与角色状态</h3>
          </div>
          <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium">
            收起 <ChevronUp className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {roles.map(role => (
            <div key={role.id} className="min-w-[200px] max-w-[240px] flex-1 border border-slate-100 rounded-xl p-3 bg-white hover:border-slate-200 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", role.iconBg, role.iconColor)}>
                    <role.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-slate-800 text-sm">{role.name}</span>
                </div>
                <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-medium border border-green-100/50">
                  {role.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                {role.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-y-auto p-6 scroll-smooth space-y-6 relative">
        {messages.map((msg) => (
          <div key={msg.id} className="">
            {msg.type === 'message' && (
              <div className="flex gap-4">
                <div className="shrink-0 mt-0.5">
                  {msg.avatarImageUrl ? (
                    <img src={msg.avatarImageUrl} alt={msg.role} className="w-9 h-9 rounded-full object-cover border border-slate-100 bg-slate-50" />
                  ) : (
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", msg.avatarBg, msg.avatarColor)}>
                      {msg.avatar ? <msg.avatar className="w-5 h-5" /> : null}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{msg.role}</span>
                    {msg.badge && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-medium">
                        {msg.badge}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-medium ml-1">{msg.time}</span>
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed max-w-[90%]">
                    {msg.content}
                  </div>
                </div>
              </div>
            )}

            {msg.type === 'tool' && (
              <div className="flex gap-4 items-start pt-2">
                <div className="shrink-0 mt-0.5">
                  {msg.avatarIcon}
                </div>
                <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{msg.role}</span>
                      <span className="text-xs text-slate-400 font-medium">{msg.time}</span>
                    </div>
                    <button className="flex items-center gap-1.5 text-[13px] text-blue-600 font-medium hover:text-blue-700 bg-blue-50/50 px-2.5 py-1 rounded-md transition-colors">
                      查看详情 <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-slate-600">调用工具：</span>
                    <span className="text-sm font-medium text-slate-800">{msg.toolName}</span>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-medium">
                      <CheckCircle2 className="w-3 h-3" /> {msg.toolStatus}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                    {msg.summary}
                  </div>
                </div>
              </div>
            )}

            {msg.type === 'summary' && (
              <div className="flex gap-4 items-start pt-2">
                 <div className="shrink-0 mt-0.5">
                  {msg.avatarIcon}
                </div>
                <div className="flex-1 bg-amber-50/40 border border-amber-100/60 rounded-2xl p-4">
                   <div className="flex items-baseline gap-2 mb-3">
                      <span className="font-semibold text-slate-900 text-sm">{msg.role}</span>
                      <span className="text-xs text-slate-400 font-medium">{msg.time}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
                      {msg.points?.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="font-medium text-slate-400 shrink-0">{idx + 1}.</span>
                          <span className="leading-snug">{point}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button className="flex items-center gap-1 text-[13px] text-amber-700 font-medium bg-amber-100/50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors border border-amber-200/50">
                        展开讨论要点 <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col shrink-0 relative">
        <textarea 
          placeholder="作为人工观察者介入，补充约束或修正方向..."
          className="w-full h-16 resize-none border-none outline-none text-sm placeholder:text-slate-400 bg-transparent px-2 pt-2"
        />
        <div className="flex items-center justify-between mt-2 pl-2">
          <div className="flex items-center gap-4 text-slate-400">
            <button className="hover:text-slate-600 transition-colors tooltip-wrapper">
              <Paperclip className="w-5 h-5" />
            </button>
            <button className="hover:text-slate-600 transition-colors">
              <AtSign className="w-5 h-5" />
            </button>
            <button className="hover:text-slate-600 transition-colors">
              <Smile className="w-5 h-5" />
            </button>
          </div>
          <div className="flex shadow-sm rounded-xl overflow-hidden">
             <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-medium flex items-center gap-2 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>
              人工介入
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 border-l border-blue-500/30 text-white px-2 py-2 flex items-center justify-center transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

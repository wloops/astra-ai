import React, { useState } from 'react';
import { Navbar } from '../components/dashboard/Navbar';
import { 
  RefreshCcw, 
  Download, 
  ChevronDown, 
  Calendar, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  FileText,
  Play,
  MoreHorizontal,
  Bot,
  User,
  Users
} from 'lucide-react';
import { cn } from '../lib/utils';

// --- Mock Data ---
const mockList = [
  {
    id: 'MTG-2024-0515-0012',
    title: '智能文档处理流程优化研讨',
    project: '企业极速差旅报销系统',
    scenario: '需求澄清',
    time: '2024-05-15 14:30',
    duration: '45 分钟',
    conclusion: '已达共识',
    status: '已完成'
  },
  {
    id: 'MTG-2024-0514-0008',
    title: 'OCR 引擎选型与评估',
    project: '智能文档处理平台',
    scenario: '技术方案评估',
    time: '2024-05-14 10:15',
    duration: '60 分钟',
    conclusion: '部分共识',
    status: '已完成'
  },
  {
    id: 'MTG-2024-0512-0005',
    title: '权限模型与数据安全方案评审',
    project: '数据中台权限系统',
    scenario: '方案设计评审',
    time: '2024-05-12 16:00',
    duration: '55 分钟',
    conclusion: '存在分歧',
    status: '已完成'
  },
  {
    id: 'MTG-2024-0510-0011',
    title: '发票信息结构化抽取规则研讨',
    project: '智能文档处理平台',
    scenario: '规则设计',
    time: '2024-05-10 11:20',
    duration: '40 分钟',
    conclusion: '已达共识',
    status: '已完成'
  },
  {
    id: 'MTG-2024-0509-0009',
    title: '报销审批流程与风控策略对齐',
    project: '企业极速差旅报销系统',
    scenario: '流程与风控',
    time: '2024-05-09 09:45',
    duration: '50 分钟',
    conclusion: '部分共识',
    status: '已完成'
  },
  {
    id: 'MTG-2024-0508-0007',
    title: '多模态票据识别能力可行性验证',
    project: '智能文档处理平台',
    scenario: '需求探索',
    time: '2024-05-08 15:30',
    duration: '35 分钟',
    conclusion: '待定',
    status: '已完成'
  },
  {
    id: 'MTG-2024-0507-0004',
    title: '费用分类标准与科目映射讨论',
    project: '企业极速差旅报销系统',
    scenario: '业务规则梳理',
    time: '2024-05-07 10:00',
    duration: '45 分钟',
    conclusion: '已达共识',
    status: '已完成'
  }
];

// --- Helpers ---
const getConclusionBadgeClass = (status: string) => {
  switch (status) {
    case '已达共识': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case '部分共识': return 'text-amber-600 bg-amber-50 border-amber-100';
    case '存在分歧': return 'text-rose-600 bg-rose-50 border-rose-100';
    case '待定': return 'text-slate-500 bg-slate-100 border-slate-200';
    default: return 'text-slate-500 bg-slate-100 border-slate-200';
  }
};

const getStatusBadge = (status: string) => {
  return (
    <div className="flex items-center gap-1.5 text-slate-600">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
      <span className="text-sm">{status}</span>
    </div>
  );
};


export function SessionHistory() {
  const [activeId, setActiveId] = useState(mockList[0].id);

  const activeItem = mockList.find(item => item.id === activeId) || mockList[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar activePage="会议历史" />

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-8 flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">会议历史</h1>
            <p className="text-sm text-slate-500">查看和管理所有发起的高质量多 Agent 研讨会议</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
              <RefreshCcw className="w-4 h-4" />
              <span>刷新</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              <span>导出记录</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-wrap lg:flex-nowrap items-end gap-4 w-full">
          <div className="flex flex-col gap-1.5 w-full sm:w-[calc(50%-8px)] lg:w-48 xl:w-56 flex-shrink-0">
            <label className="text-xs font-medium text-slate-600">项目</label>
            <div className="relative">
              <select className="w-full h-10 px-3 pr-10 appearance-none bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all hover:border-slate-300">
                <option>全部项目</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-[calc(50%-8px)] lg:w-48 xl:w-56 flex-shrink-0">
            <label className="text-xs font-medium text-slate-600">场景</label>
            <div className="relative">
              <select className="w-full h-10 px-3 pr-10 appearance-none bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all hover:border-slate-300">
                <option>全部场景</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 w-full lg:w-72 xl:w-80 flex-shrink-0">
            <label className="text-xs font-medium text-slate-600">日期范围</label>
            <div className="flex items-center shadow-sm rounded-lg hover:border-slate-300 transition-all border border-slate-200 bg-white">
              <input type="text" placeholder="开始日期" className="w-full h-9 px-3 bg-transparent text-sm text-slate-700 focus:outline-none placeholder:text-slate-400" />
              <div className="h-9 flex items-center justify-center text-slate-300 px-1">
                →
              </div>
              <div className="relative flex-1 flex items-center">
                <input type="text" placeholder="结束日期" className="w-full h-9 px-3 pr-8 bg-transparent text-sm text-slate-700 focus:outline-none placeholder:text-slate-400" />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-[calc(50%-8px)] lg:w-40 xl:w-48 flex-shrink-0">
            <label className="text-xs font-medium text-slate-600">结论状态</label>
            <div className="relative">
              <select className="w-full h-10 px-3 pr-10 appearance-none bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all hover:border-slate-300">
                <option>全部状态</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-[calc(50%-8px)] lg:w-40 xl:w-48 flex-shrink-0">
            <label className="text-xs font-medium text-slate-600">状态</label>
            <div className="relative">
              <select className="w-full h-10 px-3 pr-10 appearance-none bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all hover:border-slate-300">
                <option>全部状态</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <div className="w-full lg:flex-1 lg:ml-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input type="text" placeholder="搜索会议标题或关键词" className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all hover:border-slate-300 placeholder:text-slate-400" />
            </div>
          </div>
        </div>

        {/* Main Content Area: Left List + Right Detail */}
        <div className="flex flex-col xl:flex-row gap-6 min-h-[600px]">
          {/* Left List */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse whitespace-nowrap">
                 <thead>
                   <tr className="border-b border-slate-100 text-sm font-medium text-slate-600 bg-white">
                     <th className="py-4 pl-6 pr-4 font-semibold w-[28%]">会议标题</th>
                     <th className="py-4 px-4 font-semibold w-[15%]">项目</th>
                     <th className="py-4 px-4 font-semibold w-[15%]">场景</th>
                     <th className="py-4 px-4 font-semibold w-[15%]">时间</th>
                     <th className="py-4 px-4 font-semibold w-[12%]">参与角色</th>
                     <th className="py-4 px-4 font-semibold w-[10%]">结论状态</th>
                     <th className="py-4 px-4 font-semibold w-[5%] text-right pr-6">状态</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm">
                   {mockList.map((item, idx) => {
                     const isActive = item.id === activeId;
                     return (
                       <tr 
                         key={item.id} 
                         onClick={() => setActiveId(item.id)}
                         className={cn(
                           "border-b border-slate-100 last:border-none cursor-pointer transition-colors group relative",
                           isActive ? "bg-blue-50/50" : "hover:bg-slate-50"
                         )}
                       >
                         {/* Active left border indicator marker */}
                         <td className="py-4 pl-6 pr-4 relative w-[28%]">
                           {isActive && (
                             <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 z-10" />
                           )}
                           <div className="flex flex-col gap-1">
                             <span className={cn("font-medium", isActive ? "text-blue-700" : "text-slate-900 group-hover:text-blue-600")}>
                               {item.title}
                             </span>
                             <span className="text-xs text-slate-400">ID: {item.id}</span>
                           </div>
                         </td>
                         <td className="py-4 px-4 text-slate-600 w-[15%]">
                           <div className="w-full truncate">{item.project}</div>
                         </td>
                         <td className="py-4 px-4 text-slate-600 w-[15%]">
                           <div className="w-full truncate">{item.scenario}</div>
                         </td>
                         <td className="py-4 px-4 text-slate-600 w-[15%]">
                           <div className="flex flex-col gap-0.5">
                             <span>{item.time.split(' ')[0]} {item.time.split(' ')[1]}</span>
                             <span className="text-xs text-slate-400">({item.duration})</span>
                           </div>
                         </td>
                         <td className="py-4 px-4 w-[12%]">
                           <div className="flex items-center -space-x-1.5">
                             {/* Mock Avatars */}
                             <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-white z-30">
                               <Bot className="w-3.5 h-3.5" />
                             </div>
                             <div className="w-6 h-6 rounded-full border border-white z-20 overflow-hidden">
                               <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0" alt="avatar" />
                             </div>
                             <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border border-white z-10">
                               <span className="text-[10px] font-bold">★</span>
                             </div>
                             <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-white text-[10px] font-medium pl-1">
                               +2
                             </div>
                           </div>
                         </td>
                         <td className="py-4 px-4">
                           <span className={cn(
                             "inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium",
                             getConclusionBadgeClass(item.conclusion)
                           )}>
                             {item.conclusion}
                           </span>
                         </td>
                         <td className="py-4 pl-4 pr-6 text-right">
                           <div className="flex items-center justify-end gap-4">
                             {getStatusBadge(item.status)}
                             <ChevronRight className={cn(
                               "w-4 h-4 transition-colors", 
                               isActive ? "text-blue-500" : "text-slate-300 group-hover:text-slate-500"
                             )} />
                           </div>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
             
             {/* Pagination */}
             <div className="mt-auto p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
               <div>共 <span className="font-medium text-slate-900">27</span> 条</div>
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1">
                   <button className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                   <button className="w-8 h-8 flex items-center justify-center rounded bg-blue-50 text-blue-600 font-medium">
                     1
                   </button>
                   <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-50 text-slate-700">
                     2
                   </button>
                   <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-50 text-slate-700">
                     3
                   </button>
                   <button className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                     <ChevronRight className="w-4 h-4" />
                   </button>
                 </div>
                 <div className="relative">
                   <select className="appearance-none bg-white border border-slate-200 rounded py-1 pl-3 pr-8 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer">
                     <option>10 条/页</option>
                     <option>20 条/页</option>
                     <option>50 条/页</option>
                   </select>
                   <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1.5 pointer-events-none" />
                 </div>
               </div>
             </div>
          </div>

          {/* Right Detail */}
          <div className="w-full xl:w-[480px] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full flex-shrink-0">
             <div className="flex-1 p-6 overflow-y-auto">
               
               {/* Header */}
               <div className="flex items-start gap-3 mb-6">
                 <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-medium whitespace-nowrap mt-0.5">
                   {activeItem.status}
                 </span>
                 <h2 className="text-xl font-bold text-slate-900 leading-tight">
                   {activeItem.title}
                 </h2>
               </div>

               {/* Meta info */}
               <div className="grid grid-cols-2 gap-4 mb-8">
                 <div>
                   <div className="text-xs text-slate-500 mb-1">会议时间</div>
                   <div className="text-sm text-slate-700">
                     {activeItem.time} - {parseInt(activeItem.time.split(' ')[1].split(':')[0]) + Math.floor((parseInt(activeItem.time.split(' ')[1].split(':')[1]) + parseInt(activeItem.duration))/60)}:{((parseInt(activeItem.time.split(' ')[1].split(':')[1]) + parseInt(activeItem.duration))%60).toString().padStart(2, '0')} ({activeItem.duration})
                   </div>
                 </div>
                 <div>
                   <div className="text-xs text-slate-500 mb-1">会议 ID</div>
                   <div className="text-sm text-slate-700">{activeItem.id}</div>
                 </div>
               </div>

               {/* Sections */}
               <div className="space-y-6">
                 
                 <section>
                   <h3 className="text-[15px] font-bold text-slate-900 mb-2">会议摘要</h3>
                   <p className="text-sm text-slate-600 leading-relaxed">
                     围绕智能文档处理从上传到归档的全流程进行研讨，聚焦 OCR 识别、信息提取、校验、分类、归档等关键环节的优化方案与实施优先级。
                   </p>
                 </section>

                 <section>
                   <h3 className="text-[15px] font-bold text-slate-900 mb-2">关键结论</h3>
                   <ul className="space-y-2">
                     <li className="flex items-start gap-2 text-sm text-slate-600">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                       <span>确定采用分阶段优化策略，优先提升 OCR 准确率与抽取召回率。</span>
                     </li>
                     <li className="flex items-start gap-2 text-sm text-slate-600">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                       <span>建立统一的字段标准与校验规则，减少人工复核成本。</span>
                     </li>
                     <li className="flex items-start gap-2 text-sm text-slate-600">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                       <span>引入置信度分级机制，优化异常文档处理流程。</span>
                     </li>
                   </ul>
                 </section>

                 <section>
                   <h3 className="text-[15px] font-bold text-slate-900 mb-2">主要分歧</h3>
                   <ul className="space-y-2">
                     <li className="flex items-start gap-2 text-sm text-slate-600">
                       <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                       <span>是否在第一阶段引入多模态大模型做端到端抽取 (支持：产品经理；反对：后端架构师)</span>
                     </li>
                     <li className="flex items-start gap-2 text-sm text-slate-600">
                       <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                       <span>异常文档的人工复核阈值设定 (0.6 vs 0.75)</span>
                     </li>
                   </ul>
                 </section>

                 <section>
                   <h3 className="text-[15px] font-bold text-slate-900 mb-3">参与角色</h3>
                   <div className="grid grid-cols-2 gap-3">
                     
                     <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                       <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                         <Bot className="w-4 h-4" />
                       </div>
                       <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-medium text-slate-900 truncate">AI 主持人</span>
                         <span className="text-[10px] text-slate-500 truncate">会议组织与节奏把控</span>
                       </div>
                     </div>

                     <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                       <div className="w-8 h-8 rounded bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                         <User className="w-4 h-4" />
                       </div>
                       <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-medium text-slate-900 truncate">产品经理</span>
                         <span className="text-[10px] text-slate-500 truncate">需求与优先级评估</span>
                       </div>
                     </div>

                     <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                       <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                         <div className="font-bold text-xs">{"</>"}</div>
                       </div>
                       <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-medium text-slate-900 truncate">后端架构师</span>
                         <span className="text-[10px] text-slate-500 truncate">方案与成本评估</span>
                       </div>
                     </div>

                     <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                       <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                         <div className="w-4 h-4 flex items-center justify-center border-2 border-current rounded-[4px]"><div className="w-1.5 h-1.5 bg-current rounded-sm"></div></div>
                       </div>
                       <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-medium text-slate-900 truncate">测试工程师</span>
                         <span className="text-[10px] text-slate-500 truncate">质量与测试策略</span>
                       </div>
                     </div>

                     <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                       <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                         </svg>
                       </div>
                       <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-medium text-slate-900 truncate">数据分析师</span>
                         <span className="text-[10px] text-slate-500 truncate">数据指标与评估</span>
                       </div>
                     </div>

                     <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                       <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                         <Users className="w-4 h-4" />
                       </div>
                       <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-medium text-slate-900 truncate">+2 其他参与者</span>
                         <span className="text-[10px] text-slate-500 truncate">测试工程师、运维工程师</span>
                       </div>
                     </div>

                   </div>
                 </section>

               </div>
               
             </div>

             {/* Footer Actions */}
             <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-b-xl gap-3">
               <button className="flex-1 flex items-center justify-center gap-2 px-4 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm">
                 <FileText className="w-4 h-4 text-blue-500" />
                 <span>查看纪要</span>
               </button>
               <button className="flex-1 flex items-center justify-center gap-2 px-4 h-10 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm">
                 <Play className="w-4 h-4 fill-white" />
                 <span>再次发起</span>
               </button>
               <button className="flex-1 flex items-center justify-center px-4 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm">
                 <Copy className="w-4 h-4 text-blue-500 mr-2" />
                 <span>复制配置</span>
               </button>
               <button className="w-10 h-10 flex border shrink-0 items-center justify-center bg-white border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm">
                 <MoreHorizontal className="w-4 h-4" />
               </button>
             </div>
          </div>
        </div>

      </main>
    </div>
  );
}

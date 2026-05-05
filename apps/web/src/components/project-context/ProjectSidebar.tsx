import React from "react";
import { Folder, User, Users, Archive, Plus } from "lucide-react";
import { cn } from "../../lib/utils";

export function ProjectSidebar() {
  return (
    <div className="w-[280px] shrink-0 flex flex-col gap-6">
      {/* 项目列表 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 px-3">项目列表</h3>
        <nav className="flex flex-col gap-1">
          <NavItem icon={<Folder className="w-4 h-4" />} label="全部项目" count={12} active />
          <NavItem icon={<User className="w-4 h-4" />} label="我创建的" count={8} />
          <NavItem icon={<Users className="w-4 h-4" />} label="我参与的" count={6} />
          <NavItem icon={<Archive className="w-4 h-4" />} label="已归档" count={3} />
        </nav>
      </div>

      {/* 标签分类 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3 px-3">
            <h3 className="text-sm font-semibold text-slate-800">标签分类</h3>
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus className="w-4 h-4" />
            </button>
        </div>
        <nav className="flex flex-col gap-1">
          <TagItem color="bg-blue-500" label="产品研发" count={5} />
          <TagItem color="bg-emerald-500" label="市场分析" count={3} />
          <TagItem color="bg-lime-500" label="技术方案" count={2} />
          <TagItem color="bg-amber-500" label="运营策略" count={1} />
          <TagItem color="bg-rose-500" label="测试评估" count={1} />
        </nav>
      </div>

      {/* 上下文完整度 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-6">上下文完整度总览</h3>
        
        <div className="flex items-center justify-between">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            {/* Simple CSS Donut Chart */}
            <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
              {/* Background Circular path */}
              <path
                className="text-slate-100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              {/* Foreground stroke */}
              <path
                className="text-teal-500"
                strokeDasharray="68, 100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-xl font-bold text-slate-800">68%</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <LegendItem color="bg-teal-500" label="完整" count={8} />
            <LegendItem color="bg-amber-400" label="一般" count={3} />
            <LegendItem color="bg-rose-500" label="不足" count={1} />
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, count, active }: { icon: React.ReactNode, label: string, count: number, active?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors",
        active ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(active ? "text-blue-600" : "text-slate-400")}>{icon}</div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={cn(
        "text-xs px-2 py-0.5 rounded-full",
        active ? "bg-blue-100 text-blue-700" : "text-slate-400"
      )}>
        {count}
      </span>
    </div>
  );
}

function TagItem({ color, label, count }: { color: string, label: string, count: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900">
      <div className="flex items-center gap-3">
        <div className={cn("w-2 h-2 rounded-full", color)} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-xs text-slate-400">{count}</span>
    </div>
  );
}

function LegendItem({ color, label, count }: { color: string, label: string, count: number }) {
  return (
    <div className="flex items-center gap-4 text-sm max-w-[100px] w-full justify-between">
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", color)} />
        <span className="text-slate-600">{label}</span>
      </div>
      <span className="text-slate-900 font-medium">{count}</span>
    </div>
  );
}

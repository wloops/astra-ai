import React from "react";
import { Search, ChevronDown, List, LayoutGrid } from "lucide-react";

export function ProjectFilters() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索项目名称或关键词"
            className="w-full h-9 pl-9 pr-4 text-sm rounded-lg bg-white border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filters */}
        <div className="hidden md:flex items-center gap-2">
          <FilterDropdown label="全部标签" />
          <FilterDropdown label="上下文状态" />
          <FilterDropdown label="更新时间" />
        </div>
      </div>

      {/* View Toggles */}
      <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shrink-0">
        <button className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded">
          <List className="w-4 h-4" />
        </button>
        <button className="p-1.5 bg-slate-100 text-slate-700 transition-colors rounded shadow-sm">
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function FilterDropdown({ label }: { label: string }) {
  return (
    <button className="h-9 px-3 flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
      <span>{label}</span>
      <ChevronDown className="w-4 h-4 text-slate-400" />
    </button>
  );
}

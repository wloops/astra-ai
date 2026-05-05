import React from "react";
import { CalendarDays } from "lucide-react";

export function Header() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          欢迎回来，开始今天的智能研讨
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          汇聚知识，协同思考，让每一次研讨都更高效，更有价值。
        </p>
      </div>

      <button className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
        <span>2024年5月20日 星期一</span>
        <CalendarDays className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}

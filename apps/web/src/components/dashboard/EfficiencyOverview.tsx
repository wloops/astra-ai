import React from "react";
import { Info } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DiscussionSession, Project } from "../../api/types";

interface EfficiencyOverviewProps {
  sessions?: DiscussionSession[];
  projects?: Project[];
}

export function EfficiencyOverview({ sessions: externalSessions, projects: externalProjects }: EfficiencyOverviewProps) {
  const sessions = externalSessions ?? [];
  const projects = externalProjects ?? [];

  // 聚合近 7 天 session 创建趋势
  const days: { name: string; value: number }[] = [];
  const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = sessions.filter((s) => s.created_at.slice(0, 10) === dateStr).length;
    days.push({ name: DAY_NAMES[d.getDay()], value: count });
  }

  // 上下文复用率：projects completeness 平均值
  const avgCompleteness = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + (p.completeness ?? 0), 0) / projects.length)
    : 0;

  // 平均结论转化时长（简单估算：完成的 session 时间跨度平均值）
  let avgDurationDays = 0;
  const completedSessions = sessions.filter((s) => s.status === "completed" && s.completed_at);
  if (completedSessions.length > 0) {
    const totalMs = completedSessions.reduce((sum, s) => {
      const created = new Date(s.created_at).getTime();
      const completed = new Date(s.completed_at!).getTime();
      return sum + (completed - created);
    }, 0);
    avgDurationDays = Math.round((totalMs / completedSessions.length / 86400000) * 10) / 10;
  }

  const maxValue = Math.max(...days.map((d) => d.value), 1);

  const CustomActiveDot = (props: any) => {
    const { cx, cy, value } = props;
    if (value === undefined) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill="#2563EB" stroke="#fff" strokeWidth={2} />
        <rect x={cx - 14} y={cy - 30} width="28" height="20" rx="10" fill="#2563EB" />
        <text x={cx} y={cy - 19} fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
          {value}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm flex flex-col pt-6">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-base font-semibold text-slate-900">效率概览</h2>
        <Info className="w-4 h-4 text-slate-300" />
      </div>

      {/* Chart container */}
      <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 mb-4">
        <div className="text-xs text-slate-500 mb-2">研讨趋势 (次)</div>
        <div className="h-[140px] w-full">
          {days.every((d) => d.value === 0) ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickCount={5} domain={[0, Math.max(maxValue + 2, 5)]} />
                <Tooltip
                  cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "4 4" }}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  labelStyle={{ color: "#64748b", fontSize: "12px" }}
                  itemStyle={{ color: "#0f172a", fontWeight: "bold", fontSize: "14px" }}
                />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" activeDot={<CustomActiveDot />} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-slate-100 rounded-xl p-4 flex flex-col justify-center bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-blue-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path
                  className="text-blue-600 drop-shadow-sm"
                  strokeDasharray={`${avgCompleteness}, 100`}
                  strokeLinecap="round"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[13px] font-semibold text-slate-900">{avgCompleteness}%</span>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">上下文完整度均值</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">{projects.length} 个项目</div>
            </div>
          </div>
        </div>

        <div className="border border-slate-100 rounded-xl p-4 flex flex-col justify-center bg-slate-50/30">
          <div className="text-xs text-slate-500 font-medium">平均研讨时长</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-semibold text-slate-900 leading-none">{avgDurationDays}</span>
            <span className="text-xs text-slate-500 font-medium">天</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">{completedSessions.length} 次完成</div>
        </div>
      </div>
    </div>
  );
}

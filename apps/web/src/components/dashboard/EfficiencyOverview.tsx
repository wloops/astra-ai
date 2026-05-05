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

export function EfficiencyOverview() {
  const data = [
    { name: "周一", value: 6.5 },
    { name: "周二", value: 6.5 },
    { name: "周三", value: 11.5 },
    { name: "周四", value: 9.5 },
    { name: "周五", value: 14.5 },
    { name: "周六", value: 9.5 },
    { name: "周日", value: 12 },
  ];

  const CustomActiveDot = (props: any) => {
    const { cx, cy, payload, value } = props;
    if (payload.name === "周日") {
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={5}
            fill="#2563EB"
            stroke="#fff"
            strokeWidth={2}
          />
          <rect
            x={cx - 14}
            y={cy - 30}
            width="28"
            height="20"
            rx="10"
            fill="#2563EB"
          />
          <text
            x={cx}
            y={cy - 19}
            fill="#fff"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {value}
          </text>
        </g>
      );
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#2563EB"
        stroke="#fff"
        strokeWidth={2}
      />
    );
  };

  return (
    <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm flex flex-col pt-6">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-base font-semibold text-slate-900">本周效率概览</h2>
        <Info className="w-4 h-4 text-slate-300" />
      </div>

      {/* Chart container */}
      <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 mb-4">
        <div className="text-xs text-slate-500 mb-2">研讨趋势 (次)</div>
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickCount={5}
                domain={[0, 20]}
              />
              <Tooltip
                cursor={{
                  stroke: "#cbd5e1",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{ color: "#64748b", fontSize: "12px" }}
                itemStyle={{
                  color: "#0f172a",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorValue)"
                activeDot={<CustomActiveDot />}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-slate-100 rounded-xl p-4 flex flex-col justify-center bg-slate-50/30">
          <div className="flex items-center gap-3">
            {/* Circular Progress */}
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-blue-100"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-600 drop-shadow-sm"
                  strokeDasharray="72, 100"
                  strokeLinecap="round"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[13px] font-semibold text-slate-900">
                72%
              </span>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">
                上下文复用率
              </div>
              <div className="text-[11px] text-green-500 font-medium mt-0.5">
                较上周 ↑ 18%
              </div>
            </div>
          </div>
        </div>

        <div className="border border-slate-100 rounded-xl p-4 flex flex-col justify-center bg-slate-50/30">
          <div className="text-xs text-slate-500 font-medium">
            平均结论转化时长
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-semibold text-slate-900 leading-none">
              1.8
            </span>
            <span className="text-xs text-slate-500 font-medium">天</span>
          </div>
          <div className="text-[11px] text-green-500 font-medium mt-1">
            较上周 ↓ 0.6 天
          </div>
        </div>
      </div>
    </div>
  );
}

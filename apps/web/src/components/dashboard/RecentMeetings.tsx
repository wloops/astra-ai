import React from "react";
import { Clock, MoreHorizontal, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export function RecentMeetings() {
  const meetings = [
    {
      name: "差旅报销自动识别并自动结算方案讨论",
      project: "企业极速差旅报销系统",
      time: "5月20日 10:30",
      status: "已完成",
    },
    {
      name: "合同风险识别模型评估与优化建议",
      project: "智能合同审查平台",
      time: "5月19日 16:45",
      status: "进行中",
    },
    {
      name: "质检指标体系优化与权重设置研讨",
      project: "客服质检优化平台",
      time: "5月18日 09:15",
      status: "已完成",
    },
  ];

  return (
    <div className="w-full mt-2">
      <div className="flex items-center gap-2 mb-4 px-2">
        <Clock className="w-5 h-5 text-slate-400" />
        <h2 className="text-base font-semibold text-slate-900">最近会议</h2>
      </div>

      <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-xs font-medium">
              <th className="px-5 py-4 font-medium w-1/2">会议名称</th>
              <th className="px-5 py-4 font-medium">所属项目</th>
              <th className="px-5 py-4 font-medium">时间</th>
              <th className="px-5 py-4 font-medium">状态</th>
              <th className="px-5 py-4 font-medium w-12 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-0"
              >
                <td className="px-5 py-4 text-slate-900 font-medium overflow-hidden text-ellipsis">
                  {m.name}
                </td>
                <td className="px-5 py-4 text-slate-500 overflow-hidden text-ellipsis">
                  {m.project}
                </td>
                <td className="px-5 py-4 text-slate-500">{m.time}</td>
                <td className="px-5 py-4">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-1 rounded-md",
                      m.status === "已完成"
                        ? "text-teal-600 bg-teal-50"
                        : "text-blue-600 bg-blue-50",
                    )}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="w-full py-3 flex justify-center border-t border-slate-50">
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
            查看全部会议 <ChevronRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Clock, MoreHorizontal, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import type { DiscussionSession, Project } from "../../api/types";

interface MeetingDisplay {
  name: string;
  project: string;
  time: string;
  status: string;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: "待开始",
  running: "进行中",
  completed: "已完成",
  failed: "失败",
  paused: "已暂停",
};

function mapSessionToDisplay(s: DiscussionSession, projects: Project[]): MeetingDisplay {
  const project = projects.find((p) => p.id === s.project_id);
  return {
    name: s.topic,
    project: project?.name ?? s.project_id,
    time: formatTime(s.created_at),
    status: STATUS_LABELS[s.status] ?? s.status,
  };
}

interface RecentMeetingsProps {
  sessions?: DiscussionSession[];
  projects?: Project[];
}

export function RecentMeetings({ sessions: externalSessions, projects = [] }: RecentMeetingsProps) {
  const allSessions = externalSessions ?? [];
  const displayMeetings = allSessions
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)
    .map((s) => mapSessionToDisplay(s, projects));

  if (displayMeetings.length === 0) {
    return (
      <div className="w-full mt-2">
        <div className="flex items-center gap-2 mb-4 px-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900">最近会议</h2>
        </div>
        <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-sm">
          暂无会议记录，请先发起研讨
        </div>
      </div>
    );
  }

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
            {displayMeetings.map((m, idx) => (
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
                        : m.status === "进行中"
                          ? "text-blue-600 bg-blue-50"
                          : "text-slate-600 bg-slate-50",
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

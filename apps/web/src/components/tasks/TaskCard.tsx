import React from "react";
import { CalendarDays, Link2, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { Task, TaskStatus } from "../../api/types";
import { cn } from "../../lib/utils";

const priorityStyle: Record<Task["priority"], string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
};

const statusLabels: Record<TaskStatus, string> = {
  backlog: "待梳理",
  todo: "待办",
  in_progress: "进行中",
  blocked: "受阻",
  done: "完成",
  cancelled: "取消",
};

interface TaskCardProps {
  task: Task;
  onOpen: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

export function TaskCard({ task, onOpen, onStatusChange }: TaskCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <button className="block w-full text-left" onClick={() => onOpen(task)}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-5 text-slate-900">{task.title}</h3>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", priorityStyle[task.priority])}>
            {task.priority}
          </span>
        </div>
        {task.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>}
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {task.assignee_role_code && (
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3.5 w-3.5" />
            {task.assignee_role_code}
          </span>
        )}
        {task.due_date && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
        {task.source_session_id && (
          <Link
            to={`/session-result?sessionId=${encodeURIComponent(task.source_session_id)}`}
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            <Link2 className="h-3.5 w-3.5" />
            来源研讨
          </Link>
        )}
      </div>

      <select
        value={task.status}
        onChange={(event) => onStatusChange(task, event.target.value as TaskStatus)}
        className="mt-3 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 outline-none focus:border-blue-500"
      >
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </article>
  );
}

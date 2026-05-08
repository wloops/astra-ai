import React from "react";
import type { Task, TaskStatus } from "../../api/types";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

export function KanbanColumn({ title, status, tasks, onOpenTask, onStatusChange }: KanbanColumnProps) {
  return (
    <section className="flex min-h-[420px] min-w-[260px] flex-1 flex-col rounded-lg border border-slate-200 bg-slate-50">
      <header className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{status}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">{tasks.length}</span>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {tasks.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-400">
            暂无任务
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id}>
              <TaskCard task={task} onOpen={onOpenTask} onStatusChange={onStatusChange} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

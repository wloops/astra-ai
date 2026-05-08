import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Task, TaskPriority, TaskStatus, TaskUpdatePayload } from "../../api/types";

const statuses: TaskStatus[] = ["backlog", "todo", "in_progress", "blocked", "done", "cancelled"];
const priorities: TaskPriority[] = ["low", "medium", "high", "critical"];

interface TaskDetailProps {
  task: Task | null;
  onClose: () => void;
  onSave: (task: Task, payload: TaskUpdatePayload) => Promise<void>;
}

export function TaskDetail({ task, onClose, onSave }: TaskDetailProps) {
  const [form, setForm] = useState<TaskUpdatePayload>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee_role_code: task.assignee_role_code,
      due_date: task.due_date,
      tags: task.tags,
    });
  }, [task]);

  if (!task) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!task) return;
    setSaving(true);
    try {
      await onSave(task, form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30">
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
        <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">任务详情</h2>
            <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="关闭">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-4 px-6 py-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">标题</span>
              <input
                value={form.title ?? ""}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">描述</span>
              <textarea
                value={form.description ?? ""}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="mt-1 min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">状态</span>
                <select
                  value={form.status ?? "todo"}
                  onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                >
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">优先级</span>
                <select
                  value={form.priority ?? "medium"}
                  onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                >
                  {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">负责人角色</span>
              <input
                value={form.assignee_role_code ?? ""}
                onChange={(event) => setForm({ ...form, assignee_role_code: event.target.value || null })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">截止日期</span>
              <input
                type="date"
                value={form.due_date ? form.due_date.slice(0, 10) : ""}
                onChange={(event) => setForm({ ...form, due_date: event.target.value ? `${event.target.value}T00:00:00Z` : null })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700">
              取消
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {saving ? "保存中" : "保存"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

import React, { useState } from "react";
import { X } from "lucide-react";
import type { Project, TaskCreatePayload, TaskPriority } from "../../api/types";

interface TaskCreateFormProps {
  projects: Project[];
  open: boolean;
  onClose: () => void;
  onCreate: (payload: TaskCreatePayload) => Promise<void>;
}

export function TaskCreateForm({ projects, open, onClose, onCreate }: TaskCreateFormProps) {
  const [payload, setPayload] = useState<TaskCreatePayload>({
    project_id: projects[0]?.id ?? "",
    title: "",
    description: "",
    priority: "medium",
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onCreate(payload);
      setPayload({ project_id: projects[0]?.id ?? "", title: "", description: "", priority: "medium" });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">新建任务</h2>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">项目</span>
            <select
              value={payload.project_id}
              onChange={(event) => setPayload({ ...payload, project_id: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              required
            >
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">标题</span>
            <input
              value={payload.title}
              onChange={(event) => setPayload({ ...payload, title: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">描述</span>
            <textarea
              value={payload.description}
              onChange={(event) => setPayload({ ...payload, description: event.target.value })}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">优先级</span>
              <select
                value={payload.priority}
                onChange={(event) => setPayload({ ...payload, priority: event.target.value as TaskPriority })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              >
                {["low", "medium", "high", "critical"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">负责人角色</span>
              <input
                value={payload.assignee_role_code ?? ""}
                onChange={(event) => setPayload({ ...payload, assignee_role_code: event.target.value || null })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">截止日期</span>
            <input
              type="date"
              onChange={(event) => setPayload({ ...payload, due_date: event.target.value ? `${event.target.value}T00:00:00Z` : null })}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700">
            取消
          </button>
          <button type="submit" disabled={saving || !projects.length} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "创建中" : "创建"}
          </button>
        </footer>
      </form>
    </div>
  );
}

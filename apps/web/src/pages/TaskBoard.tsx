import React, { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { apiClient } from "../api/client";
import type { Project, Task, TaskCreatePayload, TaskPriority, TaskStatus, TaskUpdatePayload } from "../api/types";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Navbar } from "../components/dashboard/Navbar";
import { KanbanColumn } from "../components/tasks/KanbanColumn";
import { TaskCreateForm } from "../components/tasks/TaskCreateForm";
import { TaskDetail } from "../components/tasks/TaskDetail";

const columns: Array<{ status: TaskStatus; title: string }> = [
  { status: "backlog", title: "待梳理" },
  { status: "todo", title: "待办" },
  { status: "in_progress", title: "进行中" },
  { status: "blocked", title: "受阻" },
  { status: "done", title: "完成" },
];

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [taskResponse, projectResponse] = await Promise.all([
        apiClient.listTasks({ limit: 200, project_id: projectId || undefined, priority: priority || undefined }),
        apiClient.listProjects(),
      ]);
      setTasks(taskResponse.items);
      setProjects(projectResponse.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "任务数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [projectId, priority]);

  const visibleColumns = useMemo(() => {
    return showCancelled ? [...columns, { status: "cancelled" as TaskStatus, title: "取消" }] : columns;
  }, [showCancelled]);

  async function handleCreate(payload: TaskCreatePayload) {
    const created = await apiClient.createTask(payload);
    setTasks((current) => [created, ...current]);
  }

  async function handleUpdate(task: Task, payload: TaskUpdatePayload) {
    const updated = await apiClient.updateTask(task.id, payload);
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] font-sans text-slate-900">
      <Navbar activePage="任务看板" />
      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">任务看板</h1>
            <p className="mt-1 text-sm text-slate-500">跟踪研讨行动项和手动创建任务的执行状态。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">全部项目</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority | "")}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">全部优先级</option>
              {["low", "medium", "high", "critical"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <input type="checkbox" checked={showCancelled} onChange={(event) => setShowCancelled(event.target.checked)} />
              显示取消
            </label>
            <button onClick={loadData} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
            <button onClick={() => setCreateOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white">
              <Plus className="h-4 w-4" />
              新建任务
            </button>
          </div>
        </div>

        {error && <div className="mt-4"><ErrorBanner message={error} onRetry={loadData} /></div>}

        <div className="mt-6 overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4">
            {visibleColumns.map((column) => (
              <div key={column.status} className="flex min-w-[260px] flex-1">
                <KanbanColumn
                  title={column.title}
                  status={column.status}
                  tasks={tasks.filter((task) => task.status === column.status)}
                  onOpenTask={setSelectedTask}
                  onStatusChange={(task, status) => handleUpdate(task, { status })}
                />
              </div>
            ))}
          </div>
        </div>
        {loading && <p className="mt-4 text-sm text-slate-500">正在加载任务...</p>}
      </main>

      <TaskCreateForm projects={projects} open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} onSave={handleUpdate} />
    </div>
  );
}

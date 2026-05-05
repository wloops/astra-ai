import React, { useEffect, useState } from "react";
import { Navbar } from "../components/dashboard/Navbar";
import { Upload, Plus, X } from "lucide-react";
import { ProjectSidebar } from "../components/project-context/ProjectSidebar";
import { ProjectsOverview } from "../components/project-context/ProjectsOverview";
import { ProjectFilters } from "../components/project-context/ProjectFilters";
import { ProjectGrid } from "../components/project-context/ProjectGrid";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { apiClient } from "../api/client";
import type { Project } from "../api/types";

export function ProjectContext() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadProjects = () => {
    setLoading(true);
    setLoadError(null);
    apiClient
      .listProjects()
      .then(setProjects)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "加载项目失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // New project form state
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    goal: "",
    background: "",
  });

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;
    setCreateError(null);
    try {
      const created = await apiClient.createProject({
        name: newProject.name,
        description: newProject.description,
        goal: newProject.goal,
        background: newProject.background,
      });
      setProjects((prev) => [created, ...prev]);
      setNewProject({ name: "", description: "", goal: "", background: "" });
      setShowNewDialog(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "创建项目失败，请重试");
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] font-sans text-slate-900 pb-12 select-none">
      <Navbar activePage="项目上下文" />

      <main className="max-w-[1600px] mx-auto px-6 pt-8 pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[28px] leading-tight font-bold text-slate-900 mb-1">项目上下文</h1>
            <p className="text-sm text-slate-500">管理项目相关信息、文档与知识，为多 Agent 研讨提供完整的业务上下文</p>
            {loadError && (
              <div className="mt-3">
                <ErrorBanner message={loadError} onRetry={loadProjects} />
              </div>
            )}
            {createError && (
              <div className="mt-3">
                <ErrorBanner message={createError} onDismiss={() => setCreateError(null)} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
              <Upload className="w-4 h-4" />
              导入项目
            </button>
            <button
              onClick={() => setShowNewDialog(true)}
              className="px-4 py-2 bg-[#00B2D9] text-white rounded-lg text-sm font-medium hover:bg-[#009cbe] hover:shadow-md transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新建项目
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <div className="hidden lg:block">
            <ProjectSidebar projects={projects} />
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <ProjectsOverview projects={projects} />
            <div className="h-px w-full bg-slate-200/60 my-1" />
            <ProjectFilters searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">加载中…</div>
            ) : (
              <ProjectGrid projects={projects} searchQuery={searchQuery} />
            )}
          </div>
        </div>

        {/* New Project Dialog */}
        {showNewDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">新建项目</h2>
                <button onClick={() => setShowNewDialog(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">项目名称 *</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入项目名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">项目描述</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
                    className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="简要描述项目目标与范围"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">目标</label>
                  <input
                    type="text"
                    value={newProject.goal}
                    onChange={(e) => setNewProject((p) => ({ ...p, goal: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="项目核心目标"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">背景</label>
                  <textarea
                    value={newProject.background}
                    onChange={(e) => setNewProject((p) => ({ ...p, background: e.target.value }))}
                    className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="项目背景信息"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewDialog(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateProject}
                  className="px-4 py-2 bg-[#00B2D9] text-white rounded-lg text-sm font-medium hover:bg-[#009cbe]"
                  disabled={!newProject.name.trim()}
                >
                  创建项目
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

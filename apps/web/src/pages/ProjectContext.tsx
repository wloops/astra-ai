import React from "react";
import { Navbar } from "../components/dashboard/Navbar";
import { Upload, Plus } from "lucide-react";
import { ProjectSidebar } from "../components/project-context/ProjectSidebar";
import { ProjectsOverview } from "../components/project-context/ProjectsOverview";
import { ProjectFilters } from "../components/project-context/ProjectFilters";
import { ProjectGrid } from "../components/project-context/ProjectGrid";

export function ProjectContext() {
  return (
    <div className="min-h-screen bg-[#F7FAFC] font-sans text-slate-900 pb-12 select-none">
      <Navbar activePage="项目上下文" />

      <main className="max-w-[1600px] mx-auto px-6 pt-8 pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[28px] leading-tight font-bold text-slate-900 mb-1">项目上下文</h1>
            <p className="text-sm text-slate-500">管理项目相关信息、文档与知识，为多 Agent 研讨提供完整的业务上下文</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
              <Upload className="w-4 h-4" />
              导入项目
            </button>
            <button className="px-4 py-2 bg-[#00B2D9] text-white rounded-lg text-sm font-medium hover:bg-[#009cbe] hover:shadow-md transition-all shadow-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新建项目
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <div className="hidden lg:block">
            <ProjectSidebar />
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <ProjectsOverview />
            <div className="h-px w-full bg-slate-200/60 my-1" />
            <ProjectFilters />
            <ProjectGrid />
          </div>
        </div>
      </main>
    </div>
  );
}

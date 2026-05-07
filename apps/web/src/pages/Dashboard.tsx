import React, { useEffect, useState } from "react";
import { Users, Folder, CheckSquare, ClipboardCheck } from "lucide-react";
import { Navbar } from "../components/dashboard/Navbar";
import { Header } from "../components/dashboard/Header";
import { StatsCards } from "../components/dashboard/StatsCards";
import { QuickStart } from "../components/dashboard/QuickStart";
import { RecentProjects } from "../components/dashboard/RecentProjects";
import { RecentMeetings } from "../components/dashboard/RecentMeetings";
import { EfficiencyOverview } from "../components/dashboard/EfficiencyOverview";
import { RecommendedSteps } from "../components/dashboard/RecommendedSteps";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { apiClient } from "../api/client";
import type { Project, DiscussionSession } from "../api/types";

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<DiscussionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [p, s] = await Promise.all([
        apiClient.listProjects(),
        apiClient.listSessions(),
      ]);
      setProjects(p.items);
      setSessions(s.items);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 聚合统计
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const runningSessions = sessions.filter((s) => s.status === "running").length;
  const totalProjects = projects.length;

  const stats = loading
    ? undefined
    : [
        {
          title: "研讨总数",
          value: String(totalSessions),
          icon: Users,
          iconBg: "bg-blue-50",
          iconColor: "text-blue-500",
        },
        {
          title: "已沉淀项目上下文",
          value: String(totalProjects),
          icon: Folder,
          iconBg: "bg-teal-50",
          iconColor: "text-teal-500",
        },
        {
          title: "已完成研讨",
          value: String(completedSessions),
          icon: CheckSquare,
          iconBg: "bg-indigo-50",
          iconColor: "text-indigo-500",
        },
        {
          title: "进行中研讨",
          value: String(runningSessions),
          icon: ClipboardCheck,
          iconBg: "bg-orange-50",
          iconColor: "text-orange-500",
        },
      ];

  return (
    <div className="min-h-screen bg-[#F7FAFC] font-sans text-slate-900 pb-12">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 pt-8 pb-12">
        <Header />

        {loadError && (
          <div className="mt-4">
            <ErrorBanner message={loadError} onRetry={loadData} />
          </div>
        )}

        <div className="mt-8 flex flex-col xl:flex-row gap-6">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-6 w-full xl:w-0">
            <StatsCards stats={stats} />
            <QuickStart />
            <RecentProjects projects={projects} />
            <RecentMeetings sessions={sessions} projects={projects} />
          </div>

          {/* Right Sidebar */}
          <aside className="w-full xl:w-[380px] shrink-0 flex flex-col gap-6">
            <EfficiencyOverview sessions={sessions} projects={projects} />
            <RecommendedSteps sessions={sessions} projects={projects} />
          </aside>
        </div>
      </main>
    </div>
  );
}

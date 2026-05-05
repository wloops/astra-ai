import React from "react";
import { Navbar } from "../components/dashboard/Navbar";
import { Header } from "../components/dashboard/Header";
import { StatsCards } from "../components/dashboard/StatsCards";
import { QuickStart } from "../components/dashboard/QuickStart";
import { RecentProjects } from "../components/dashboard/RecentProjects";
import { RecentMeetings } from "../components/dashboard/RecentMeetings";
import { EfficiencyOverview } from "../components/dashboard/EfficiencyOverview";
import { RecommendedSteps } from "../components/dashboard/RecommendedSteps";

export function Dashboard() {
  return (
    <div className="min-h-screen bg-[#F7FAFC] font-sans text-slate-900 pb-12">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 pt-8 pb-12">
        <Header />

        <div className="mt-8 flex flex-col xl:flex-row gap-6">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-6 w-full xl:w-0">
            <StatsCards />
            <QuickStart />
            <RecentProjects />
            <RecentMeetings />
          </div>

          {/* Right Sidebar */}
          <aside className="w-full xl:w-[380px] shrink-0 flex flex-col gap-6">
            <EfficiencyOverview />
            <RecommendedSteps />
          </aside>
        </div>
      </main>
    </div>
  );
}

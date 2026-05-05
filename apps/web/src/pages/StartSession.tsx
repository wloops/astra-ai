import React from "react";
import { Navbar } from "../components/dashboard/Navbar";
import { StartSessionLeft } from "../components/session/StartSessionLeft";
import { StartSessionForm } from "../components/session/StartSessionForm";

export function StartSession() {
  return (
    <div className="min-h-screen bg-[#F7FAFC] font-sans text-slate-900 pb-12 overflow-x-hidden flex flex-col relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[70%] rounded-full bg-blue-100/30 blur-[100px] mix-blend-multiply opacity-50"></div>
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[80%] rounded-full bg-teal-50/40 blur-[120px] mix-blend-multiply opacity-40"></div>
      </div>

      <Navbar />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 pt-10 pb-12 relative z-10 flex flex-col xl:flex-row gap-8">
        {/* Left Informational Area */}
        <div className="w-full xl:w-[45%] flex-shrink-0">
          <StartSessionLeft />
        </div>

        {/* Right Form Area */}
        <div className="w-full xl:w-[55%] flex-shrink-0 min-h-[600px] xl:h-[calc(100vh-140px)]">
          <StartSessionForm />
        </div>
      </main>
    </div>
  );
}

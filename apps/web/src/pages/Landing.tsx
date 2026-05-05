import React from "react";
import { Navbar } from "../components/landing/Navbar";
import { Hero } from "../components/landing/Hero";
import { Features } from "../components/landing/Features";

export function Landing() {
  return (
    <div className="min-h-screen bg-[#F8FAFF] overflow-x-hidden relative font-sans">
      {/* Abstract Background Splashes */}
      <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[80%] rounded-full bg-blue-100/40 blur-[120px] mix-blend-multiply opacity-70"></div>
        <div className="absolute top-[10%] right-[10%] w-[40%] h-[70%] rounded-full bg-teal-50/50 blur-[120px] mix-blend-multiply opacity-60"></div>
      </div>

      <Navbar />
      <div className="relative z-10">
        <Hero />
        <Features />
      </div>
    </div>
  );
}

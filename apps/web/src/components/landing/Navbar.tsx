import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRightCircle } from 'lucide-react';

export function Navbar() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/astra-logo.png" alt="Astra AI" className="w-10 h-10" />
          <span className="text-xl font-bold text-slate-900 tracking-tight">Astra AI</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          {[
            ['features', '产品能力'],
            ['use-cases', '适用场景'],
            ['workflow', '工作流'],
            ['cta', '演示案例'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors border border-slate-200">
            <Clock size={16} />
            会议历史
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 rounded-full shadow-md shadow-blue-500/20 transition-all">
            <ArrowRightCircle size={16} />
            进入工作台
          </Link>
        </div>
      </div>
    </nav>
  );
}

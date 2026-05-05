import React from 'react';
import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-lg border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M12 4L4 20H8L12 12L16 20H20L12 4Z" fill="currentColor" />
            </svg>
          </div>
          <span className="font-bold text-2xl tracking-tight text-slate-900">Agora AI</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors">功能特性</a>
          <a href="#solutions" className="hover:text-slate-900 transition-colors">解决方案</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">价格</a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            登录
          </Link>
          <Link to="/dashboard" className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            免费开始使用
          </Link>
        </div>
      </div>
    </nav>
  );
}

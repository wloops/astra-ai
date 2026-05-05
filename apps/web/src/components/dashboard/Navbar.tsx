import React from "react";
import { Link } from "react-router-dom";
import { Search, Bell, ChevronDown, LayoutGrid, FileText, History, Users } from "lucide-react";
import { cn } from "../../lib/utils";

interface NavbarProps {
  activePage?: string;
}

export function Navbar({ activePage = "工作台" }: NavbarProps) {
  const navItems = [
    { name: "工作台", icon: LayoutGrid, path: "/dashboard" },
    { name: "项目上下文", icon: FileText, path: "/project-context" },
    { name: "会议历史", icon: History, path: "/session-history" },
    { name: "角色配置", icon: Users, path: "/role-config" },
  ];

  return (
    <nav className="h-16 bg-white flex items-center justify-between px-6 border-b border-slate-200 sticky top-0 z-50">
      <div className="flex items-center gap-12">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white relative overflow-hidden">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 absolute"
            >
              <path d="M12 4L4 20H8L12 12L16 20H20L12 4Z" fill="currentColor" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Agora <span className="font-semibold">AI</span></span>
        </Link>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-4 h-full">
          {navItems.map((item) => {
            const isActive = activePage === item.name;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "px-4 py-2 flex items-center gap-2 text-sm font-medium transition-all rounded-full outline outline-1",
                  isActive
                    ? "text-blue-600 bg-white outline-blue-500 shadow-sm"
                    : "text-slate-600 outline-transparent hover:text-slate-900 hover:bg-slate-50",
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-slate-500")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative hidden md:block w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="搜索项目、文档或关键词"
            className="w-full h-9 pl-9 pr-12 text-sm rounded-full bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] text-slate-400 font-medium">
            ⌘K
          </div>
        </div>
        <button className="text-slate-500 hover:text-slate-900 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-[10px] text-white flex items-center justify-center rounded-full border-2 border-white font-medium">
            3
          </span>
        </button>
        <div className="flex items-center gap-2 cursor-pointer ml-2 hover:bg-slate-50 py-1 pl-1 pr-2 rounded-full transition-colors border border-transparent hover:border-slate-200">
          <img
            src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0"
            alt="User"
            className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100"
          />
          <span className="text-sm font-medium text-slate-700">张敏</span>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </nav>
  );
}

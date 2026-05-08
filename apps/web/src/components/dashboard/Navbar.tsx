import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Bell, ChevronDown, LayoutGrid, FileText, History, Users, Menu, X, KanbanSquare } from 'lucide-react'
import { cn } from '../../lib/utils'

interface NavbarProps {
  activePage?: string
}

export function Navbar({ activePage = '工作台' }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { name: '工作台', icon: LayoutGrid, path: '/dashboard' },
    { name: '项目上下文', icon: FileText, path: '/project-context' },
    { name: '任务看板', icon: KanbanSquare, path: '/task-board' },
    { name: '会议历史', icon: History, path: '/session-history' },
    { name: '角色配置', icon: Users, path: '/role-config' },
  ]

  return (
    <nav className="h-16 bg-white flex items-center justify-between px-4 md:px-6 border-b border-slate-200 sticky top-0 z-50" role="navigation" aria-label="主导航">
      <div className="flex items-center gap-6 md:gap-12">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/astra-logo.png" alt="Astra AI" className="w-8 h-8 md:w-10 md:h-10" />
          <span className="font-bold text-lg md:text-xl tracking-tight text-slate-900">Astra AI</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 h-full">
          {navItems.map((item) => {
            const isActive = activePage === item.name
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  'px-4 py-2 flex items-center gap-2 text-sm font-medium transition-all rounded-full outline outline-1',
                  isActive ? 'text-blue-600 bg-white outline-blue-500 shadow-sm' : 'text-slate-600 outline-transparent hover:text-slate-900 hover:bg-slate-50',
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-blue-600' : 'text-slate-500')} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop right section */}
      <div className="hidden md:flex items-center gap-5">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索项目、文档或关键词"
            className="w-full h-9 pl-9 pr-12 text-sm rounded-full bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] text-slate-400 font-medium">⌘K</div>
        </div>
        <button className="text-slate-500 hover:text-slate-900 transition-colors relative" aria-label="通知">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-[10px] text-white flex items-center justify-center rounded-full border-2 border-white font-medium">3</span>
        </button>
        <div className="flex items-center gap-2 cursor-pointer ml-2 hover:bg-slate-50 py-1 pl-1 pr-2 rounded-full transition-colors border border-transparent hover:border-slate-200">
          <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0" alt="User" className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100" />
          <span className="text-sm font-medium text-slate-700">wlait</span>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
      </div>

      {/* Mobile hamburger + notifications */}
      <div className="flex md:hidden items-center gap-3">
        <button className="text-slate-500 hover:text-slate-900 transition-colors relative" aria-label="通知">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 text-[10px] text-white flex items-center justify-center rounded-full border-2 border-white font-medium">3</span>
        </button>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="text-slate-700 hover:text-slate-900 transition-colors p-1"
          aria-label="打开菜单"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <span className="font-bold text-lg text-slate-900">导航</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500 hover:text-slate-900" aria-label="关闭菜单">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activePage === item.name
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                        isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      <Icon className={cn('w-5 h-5', isActive ? 'text-blue-600' : 'text-slate-500')} />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜索…"
                    className="w-full h-9 pl-9 pr-4 text-sm rounded-full bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

import React from 'react';
export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-12 px-6">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <img src="/astra-logo-text.png" alt="Astra AI" className="h-10" />

        <div className="flex flex-wrap justify-center items-center gap-8 text-sm font-medium text-slate-600">
          {['产品能力', '适用场景', '工作流', '演示案例', '定价', '帮助中心'].map((link) => (
            <a key={link} href="#" className="hover:text-blue-600 transition-colors">
              {link}
            </a>
          ))}
        </div>

        <div className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Astra AI. 保留所有权利。
        </div>
      </div>
    </footer>
  );
}

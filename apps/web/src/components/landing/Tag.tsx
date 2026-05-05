import React from 'react';

interface TagProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'blue' | 'gray' | 'green';
}

export function Tag({ children, className = '', variant = 'blue' }: TagProps) {
  const variants = {
    blue: 'bg-blue-50 text-blue-600 border border-blue-100',
    gray: 'bg-slate-100 text-slate-600 border border-slate-200',
    green: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  };
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

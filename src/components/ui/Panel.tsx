import React from 'react';

interface PanelProps {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  actions,
  className = '',
  bodyClassName = '',
  children,
}) => (
  <section className={`bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden ${className}`}>
    {(title || actions) && (
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
        <div className="min-w-0">{title}</div>
        {actions}
      </header>
    )}
    <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
  </section>
);

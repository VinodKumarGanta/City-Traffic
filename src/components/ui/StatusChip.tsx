import React from 'react';

const TONES: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 border-red-500/30',
  info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  muted: 'bg-slate-800 text-slate-400 border-slate-700',
};

export const StatusChip: React.FC<{
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}> = ({ children, tone = 'muted' }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${TONES[tone]}`}>
    {children}
  </span>
);

import React from 'react';

const ICON_WRAP: Record<string, string> = {
  cyan: 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400',
  emerald: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400',
  red: 'bg-red-950/80 border-red-500/30 text-red-400',
  amber: 'bg-amber-950/80 border-amber-500/30 text-amber-400',
  blue: 'bg-blue-950/80 border-blue-500/30 text-blue-400',
};

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: keyof typeof ICON_WRAP;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  hint,
  icon,
  accent = 'cyan',
  onClick,
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between shadow-xl text-left w-full"
    >
      <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
        <span>{label}</span>
        {icon && (
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${ICON_WRAP[accent]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold font-mono text-white tracking-tight">{value}</span>
        {hint && <span className="text-[10px] font-mono text-slate-400">{hint}</span>}
      </div>
    </Tag>
  );
};

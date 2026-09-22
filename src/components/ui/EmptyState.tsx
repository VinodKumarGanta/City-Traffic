import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  detail?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, detail, icon }) => (
  <div className="p-12 text-center space-y-2">
    <div className="mx-auto w-10 h-10 text-slate-500 flex items-center justify-center">
      {icon || <Inbox className="w-8 h-8" />}
    </div>
    <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    {detail && <p className="text-xs text-slate-400 max-w-md mx-auto">{detail}</p>}
  </div>
);

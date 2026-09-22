import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load data',
  detail,
  onRetry,
}) => (
  <div className="p-12 text-center space-y-3">
    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
    <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    {detail && <p className="text-xs text-slate-400 max-w-md mx-auto">{detail}</p>}
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-100"
      >
        Retry
      </button>
    )}
  </div>
);

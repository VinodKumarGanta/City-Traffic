import React from 'react';
import {
  LayoutDashboard,
  Search,
  TrendingUp,
  Video,
  BarChart3,
  Bell,
  FileText,
  Settings,
  Smartphone,
  Compass,
  Receipt,
  Siren,
  Atom,
} from 'lucide-react';

export type ViewId =
  | 'overview'
  | 'anpr'
  | 'predictive'
  | 'quantum'
  | 'cameras'
  | 'analytics'
  | 'alerts'
  | 'reports'
  | 'settings'
  | 'mobile'
  | 'citizen'
  | 'challan'
  | 'greencorridor';

interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  alert?: boolean;
}

interface SidebarProps {
  currentView: ViewId;
  onSelectView: (view: ViewId) => void;
  activeAlertsCount: number;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  activeAlertsCount,
}) => {
  const ops: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'anpr', label: 'ANPR', icon: Search },
    { id: 'predictive', label: 'Forecasts', icon: TrendingUp },
    { id: 'quantum', label: 'Quantum QIO', icon: Atom },
    { id: 'cameras', label: 'Cameras', icon: Video },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts', icon: Bell, alert: activeAlertsCount > 0 },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const publicItems: NavItem[] = [
    { id: 'citizen', label: 'Commuter', icon: Compass },
    { id: 'challan', label: 'E-Challan', icon: Receipt },
    { id: 'greencorridor', label: 'Green corridor', icon: Siren },
    { id: 'mobile', label: 'Field', icon: Smartphone },
  ];

  const admin: NavItem[] = [{ id: 'settings', label: 'Settings', icon: Settings }];

  const renderGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-0.5">
      <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
        {title}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectView(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
              isActive
                ? 'bg-cyan-950/70 border border-cyan-500/30 text-cyan-200'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.id === 'alerts' && activeAlertsCount > 0 && (
              <span className="text-[10px] font-mono text-red-400">{activeAlertsCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-52 bg-slate-950 border-r border-slate-800 flex-col z-20 overflow-y-auto">
        <nav className="p-2 space-y-3 flex-1">
          {renderGroup('Ops', ops)}
          {renderGroup('Public', publicItems)}
          {renderGroup('Admin', admin)}
        </nav>
      </aside>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 border-t border-slate-800 flex justify-around py-1">
        {ops.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
                isActive ? 'text-cyan-400' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
};

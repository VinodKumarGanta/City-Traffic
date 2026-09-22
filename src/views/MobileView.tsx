import React, { useState } from 'react';
import { CameraNode, VehicleTrajectory, TrafficAlert, SystemKPIs } from '../types/traffic';
import { CityMap } from '../components/gis/CityMap';
import { Smartphone, ShieldAlert, Search, MapPin, Activity, Bell } from 'lucide-react';

interface MobileViewProps {
  cameras: CameraNode[];
  alerts: TrafficAlert[];
  kpis: SystemKPIs;
  privacyMaskEnabled: boolean;
}

export const MobileView: React.FC<MobileViewProps> = ({
  cameras,
  alerts,
  kpis,
  privacyMaskEnabled
}) => {
  const [activeTab, setActiveTab] = useState<'map' | 'alerts' | 'search'>('map');
  const [searchPlate, setSearchPlate] = useState('');

  return (
    <div className="p-3 space-y-3 max-w-md mx-auto min-h-screen pb-16">
      {/* Mobile Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-xs font-bold text-slate-100">FIELD OPERATOR MOBILE COMMAND</h2>
            <div className="text-[10px] text-slate-400 font-mono">Smart City Traffic Officer Console</div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold">
          LIVE FIELD
        </span>
      </div>

      {/* Quick Mobile KPI Row */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
          <div className="text-slate-400 text-[10px]">Active Alerts</div>
          <div className="text-lg font-bold text-red-400">{kpis.activeAlertsCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
          <div className="text-slate-400 text-[10px]">ANPR Accuracy</div>
          <div className="text-lg font-bold text-emerald-400">{kpis.anprAccuracyPercent}%</div>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
            activeTab === 'map' ? 'bg-cyan-600 text-white' : 'text-slate-400'
          }`}
        >
          GIS Map
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
            activeTab === 'alerts' ? 'bg-red-600 text-white' : 'text-slate-400'
          }`}
        >
          Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
            activeTab === 'search' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Plate Lookup
        </button>
      </div>

      {/* Tab 1: GIS Map */}
      {activeTab === 'map' && (
        <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <CityMap cameras={cameras} alerts={alerts} zoom={12} />
        </div>
      )}

      {/* Tab 2: Alerts Queue */}
      {activeTab === 'alerts' && (
        <div className="space-y-2">
          {alerts.map(alt => (
            <div key={alt.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between font-mono font-bold">
                <span className="text-red-400">{alt.title}</span>
                <span className="text-[10px] text-slate-400">{alt.timestamp}</span>
              </div>
              <p className="text-[11px] text-slate-300">{alt.details}</p>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800 font-mono text-[10px]">
                <span className="text-slate-400">{alt.locationName}</span>
                <button className="px-2 py-1 bg-red-600 text-white rounded font-bold">Dispatch Unit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Plate Search */}
      {activeTab === 'search' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Enter plate number..."
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono space-y-1 text-slate-300">
            <div>Target: <strong className="text-cyan-400">{searchPlate || 'TS07JH4821'}</strong></div>
            <div>Status: <strong className="text-emerald-400">Tracked across 5 Nodes</strong></div>
            <div>Last Observed: <strong className="text-white">Panjagutta Flyover (10:42 AM)</strong></div>
          </div>
        </div>
      )}
    </div>
  );
};

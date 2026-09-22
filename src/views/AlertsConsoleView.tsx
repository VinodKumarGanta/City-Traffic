import React, { useState } from 'react';
import { TrafficAlert, AlertType } from '../types/traffic';
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search, 
  Navigation,
  Car,
  UserCheck
} from 'lucide-react';

interface AlertsConsoleViewProps {
  alerts: TrafficAlert[];
  privacyMaskEnabled: boolean;
  onUpdateAlertStatus: (alertId: string, newStatus: TrafficAlert['status']) => void;
}

export const AlertsConsoleView: React.FC<AlertsConsoleViewProps> = ({
  alerts,
  privacyMaskEnabled,
  onUpdateAlertStatus
}) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedAlertId, setSelectedAlertId] = useState<string>(alerts[0]?.id || '');

  const filteredAlerts = alerts.filter(alt => {
    const matchesType = selectedType === 'ALL' || alt.type === selectedType;
    const matchesSev = selectedSeverity === 'ALL' || alt.severity === selectedSeverity;
    return matchesType && matchesSev;
  });

  const activeAlert = alerts.find(a => a.id === selectedAlertId) || alerts[0];

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-500/40 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Sub-Millisecond Watchlist Alerting & Anomaly Engine</h2>
            <p className="text-[11px] text-slate-400 font-mono">Redis Bloom Filter (&lt;1.8ms) & Teleportation Anomaly Engine</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Alert Types</option>
              <option value="teleportation">Cloned Plate (Teleportation)</option>
              <option value="blacklist">Blacklist Match</option>
              <option value="looping">Surveillance Looping</option>
              <option value="speeding">Speeding Violation</option>
              <option value="predictive">Predictive Alert</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Filterable Alert Queue (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col h-[650px] shadow-2xl">
          <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>Operational Alert Queue ({filteredAlerts.length})</span>
            <span className="text-[10px] font-mono text-red-400 uppercase">Live Stream</span>
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center h-48 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-60" />
                <span>No active traffic alerts or anomalies reported.</span>
              </div>
            ) : (
              filteredAlerts.map(alt => (
                <div
                  key={alt.id}
                  onClick={() => setSelectedAlertId(alt.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-1.5 ${
                    selectedAlertId === alt.id
                      ? 'bg-slate-800/90 border-cyan-500 text-slate-100 shadow-lg ring-1 ring-cyan-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono font-bold">
                    <span className={alt.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}>
                      {alt.id} - {alt.title}
                    </span>
                    <span className="text-[10px] text-slate-400">{alt.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-2">{alt.details}</p>
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400">{alt.locationName}</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                      alt.status === 'active' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      alt.status === 'investigating' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {alt.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Detailed Alert Inspection & Workflow (7 Cols) */}
        {activeAlert ? (
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-2xl space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    activeAlert.severity === 'critical' ? 'bg-red-500 animate-ping' : 'bg-amber-500'
                  }`}></span>
                  <h3 className="text-base font-black text-white font-mono">{activeAlert.id}: {activeAlert.title}</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">{activeAlert.timestamp}</span>
              </div>

              {/* Alert Details Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
                <div className="text-xs text-slate-300 leading-relaxed font-sans">
                  {activeAlert.details}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/80">
                  <div>Target Plate: <strong className="text-cyan-400 font-bold">{privacyMaskEnabled ? '••••••••••' : activeAlert.plateNumber}</strong></div>
                  <div>Camera Node: <strong className="text-white">{activeAlert.cameraId}</strong></div>
                  <div>Location: <strong className="text-slate-200">{activeAlert.locationName}</strong></div>
                  <div>Assigned Operator: <strong className="text-emerald-400">{activeAlert.assignedOperator || 'Unassigned'}</strong></div>
                </div>

                {/* Teleportation Anomaly Calculation Physics Breakdown */}
                {activeAlert.teleportSpeedKmh && (
                  <div className="bg-red-950/40 p-3 rounded-lg border border-red-500/40 space-y-1">
                    <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      Spatial Teleportation Physics Equation: S = Δd / Δt
                    </div>
                    <div className="text-[11px] text-slate-300 grid grid-cols-3 gap-1 pt-1">
                      <div>Distance (Δd): <strong className="text-white">{activeAlert.distanceKm} km</strong></div>
                      <div>Time Gap (Δt): <strong className="text-white">{activeAlert.timeDiffSec} s</strong></div>
                      <div>Calculated Speed: <strong className="text-red-400 font-bold">{activeAlert.teleportSpeedKmh} km/h</strong></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Operator Actions Workflow */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 font-mono">Operator Workflow Actions:</span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onUpdateAlertStatus(activeAlert.id, 'investigating')}
                  className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md"
                >
                  <UserCheck className="w-4 h-4" /> Start Investigation
                </button>

                <button
                  onClick={() => onUpdateAlertStatus(activeAlert.id, 'resolved')}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" /> Resolve & Close Alert
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-2xl space-y-3">
            <ShieldAlert className="w-12 h-12 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-300">No Alert Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Select an operational alert from the queue to inspect surveillance evidence, telemetry logs, and dispatch enforcement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

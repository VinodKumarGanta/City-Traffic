import React, { useState } from 'react';
import type { CameraNode, VehicleTrajectory, TrafficAlert, SystemKPIs, ANPRDetection } from '../types/traffic';
import { CityMap } from '../components/gis/CityMap';
import { CameraFeedCanvas } from '../components/camera/CameraFeedCanvas';
import { CameraInspectModal } from '../components/camera/CameraInspectModal';
import { 
  Car, 
  CheckCircle2, 
  AlertOctagon, 
  Clock, 
  Activity, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldAlert,
  Eye,
  Radio,
  Maximize2
} from 'lucide-react';

interface OverviewDashboardProps {
  cameras: CameraNode[];
  selectedCamera: CameraNode;
  onSelectCamera: (id: string) => void;
  activeTrajectory: VehicleTrajectory | null;
  alerts: TrafficAlert[];
  kpis: SystemKPIs;
  latestDetection: ANPRDetection | null;
  privacyMaskEnabled: boolean;
  onNavigateToView: (viewId: any) => void;
  currentCity?: string;
}

const CITY_COORDINATES: Record<string, { center: [number, number]; zoom: number }> = {
  'Vijayawada Smart Transit Hub': { center: [16.5062, 80.6480], zoom: 13 },
  'Eluru Traffic Center': { center: [16.7107, 81.0952], zoom: 14 },
  'Rajahmundry Godavari Sector': { center: [17.0005, 81.7750], zoom: 13 },
  'Visakhapatnam Metro Command': { center: [17.6868, 83.2185], zoom: 13 },
  'Guntur Urban Transit': { center: [16.3067, 80.4365], zoom: 13 },
  'Tirupati Temple Corridor': { center: [13.6288, 79.4192], zoom: 13 },
  'Hyderabad Command Center': { center: [17.4300, 78.4100], zoom: 13 },
  'Cyberabad IT Zone': { center: [17.4435, 78.3772], zoom: 14 },
  'Secunderabad North Sector': { center: [17.4412, 78.4870], zoom: 14 },
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  cameras,
  selectedCamera,
  onSelectCamera,
  activeTrajectory,
  alerts,
  kpis,
  latestDetection,
  privacyMaskEnabled,
  onNavigateToView,
  currentCity
}) => {
  const cityConfig = currentCity && CITY_COORDINATES[currentCity]
    ? CITY_COORDINATES[currentCity]
    : { center: [17.4300, 78.4100] as [number, number], zoom: 13 };

  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'all' | 'critical' | 'medium'>('all');

  const filteredAlerts = alerts.filter(a => {
    if (alertSeverityFilter === 'critical') return a.severity === 'critical';
    if (alertSeverityFilter === 'medium') return a.severity === 'medium';
    return true;
  });

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto">
      {/* Top System KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Card 1: Total Vehicles */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col justify-between shadow-xl transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Vehicles Today</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center">
              <Car className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-white tracking-tight">
              {kpis.totalVehiclesToday.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +12%
            </span>
          </div>
        </div>

        {/* Card 2: ANPR Accuracy */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col justify-between shadow-xl transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>ANPR Character Accuracy</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
              {kpis.anprAccuracyPercent}%
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3 h-3" /> Target Met
            </span>
          </div>
        </div>

        {/* Card 3: Active Alerts */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col justify-between shadow-xl transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Watchlist Alerts</span>
            <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-500/30 flex items-center justify-center">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-red-400 tracking-tight">
              {kpis.activeAlertsCount}
            </span>
            <span className="text-[10px] font-mono font-bold text-red-400 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping mr-1"></span> Live Hotlist
            </span>
          </div>
        </div>

        {/* Card 4: Avg Travel Time */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col justify-between shadow-xl transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Avg Travel Time</span>
            <div className="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-500/30 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-white tracking-tight">
              {kpis.avgCityTravelTimeMin} <span className="text-xs font-normal text-slate-400">min</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center">
              <ArrowDownRight className="w-3 h-3" /> -31% peak
            </span>
          </div>
        </div>

        {/* Card 5: Congestion Level */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col justify-between shadow-xl transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Congestion Index</span>
            <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-500/30 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-400 tracking-tight">
              {kpis.congestionLevel}
            </span>
            <span className="text-[10px] font-mono text-slate-400">Idx: 0.68</span>
          </div>
        </div>

        {/* Card 6: Predicted Congestion Risk */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col justify-between shadow-xl bg-gradient-to-b from-amber-950/20 to-slate-900 transition-all">
          <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
            <span>Predicted (10m)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-amber-400 tracking-tight">
              {kpis.predictedProbability}% Risk
            </span>
            <button 
              onClick={() => onNavigateToView('predictive')}
              className="text-[10px] font-bold text-cyan-400 hover:underline"
            >
              Forecast →
            </button>
          </div>
        </div>
      </div>

      {/* Main Command Grid: GIS Map (8 Cols) & Right Control Sidebars (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[calc(100vh-220px)] lg:min-h-[640px] items-stretch">
        {/* Left GIS City Map Panel (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[500px] lg:min-h-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-2xl relative">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="font-bold text-white tracking-wide">Live City Spatial Trajectory & Camera GIS Map</span>
              <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Full 360° Pan & Tilt
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span>{cityConfig.center[0].toFixed(2)}° N, {cityConfig.center[1].toFixed(2)}° E</span>
              <span className="text-cyan-400 font-bold">{cameras.length} Cameras Active</span>
            </div>
          </div>
          <div className="flex-1 mt-2 min-h-0 relative rounded-xl overflow-hidden">
            <CityMap
              cameras={cameras}
              selectedCameraId={selectedCamera.id}
              onSelectCamera={onSelectCamera}
              activeTrajectory={activeTrajectory}
              alerts={alerts}
              showHeatmap={true}
              center={cityConfig.center}
              zoom={cityConfig.zoom}
            />
          </div>
        </div>

        {/* Right Panel: Live Camera & Anomaly Feed (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3.5 h-full min-h-0">
          {/* Active Inspection Camera Feed Card */}
          <div className="h-[310px] shrink-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-mono font-bold text-white text-xs">{selectedCamera.id}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5 font-mono truncate max-w-[120px] inline-block align-bottom">
                    {selectedCamera.locationName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsInspectOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-mono font-bold flex items-center gap-1 transition-colors shadow-md shadow-cyan-950"
                  title="Open Live Inspection Studio & Enter Camera Feed"
                >
                  <Maximize2 className="w-3 h-3" /> Inspect Studio
                </button>
                <button
                  onClick={() => onNavigateToView('cameras')}
                  className="text-[10px] text-slate-400 hover:text-cyan-300 font-mono px-1.5 py-1"
                >
                  All ({cameras.length}) →
                </button>
              </div>
            </div>

            {/* Video Canvas */}
            <div className="flex-1 mt-2 min-h-0 rounded-xl overflow-hidden border border-slate-800/80 relative">
              {cameras.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 font-mono text-xs p-4 text-center">
                  <Eye className="w-6 h-6 mb-2 opacity-50" />
                  <span>No surveillance cameras online in database.</span>
                </div>
              ) : (
                <CameraFeedCanvas
                  camera={selectedCamera}
                  latestDetection={latestDetection}
                  privacyMaskEnabled={privacyMaskEnabled}
                />
              )}
            </div>

            {/* Quick Camera Selector Switcher Strip */}
            <div className="pt-2 flex items-center gap-1.5 overflow-x-auto select-none pr-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Nodes:</span>
              {cameras.length === 0 ? (
                <span className="text-[10px] font-mono text-slate-600 italic">None</span>
              ) : (
                cameras.map((cam) => {
                  const isSelected = selectedCamera.id === cam.id;
                  return (
                    <button
                      key={cam.id}
                      onClick={() => onSelectCamera(cam.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 transition-all border ${
                        isSelected
                          ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-950'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                      }`}
                      title={`${cam.id}: ${cam.locationName}`}
                    >
                      {cam.id.replace('CAM-', '#')}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Real-time Alerts Ticker Panel Card */}
          <div className="flex-1 min-h-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-950 border border-red-500/40 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <span>Watchlist Anomaly Stream</span>
              </div>
              <button
                onClick={() => onNavigateToView('alerts')}
                className="text-[10px] text-cyan-400 hover:underline font-mono"
              >
                Alert Console ({alerts.length}) →
              </button>
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-1.5 pt-2 pb-1 text-[10px] font-mono border-b border-slate-800/60">
              <button
                onClick={() => setAlertSeverityFilter('all')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  alertSeverityFilter === 'all'
                    ? 'bg-slate-800 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({alerts.length})
              </button>
              <button
                onClick={() => setAlertSeverityFilter('critical')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  alertSeverityFilter === 'critical'
                    ? 'bg-red-500/20 text-red-400 font-bold border border-red-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Critical ({alerts.filter(a => a.severity === 'critical').length})
              </button>
              <button
                onClick={() => setAlertSeverityFilter('medium')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  alertSeverityFilter === 'medium'
                    ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Medium ({alerts.filter(a => a.severity === 'medium').length})
              </button>
            </div>

            {/* Scrollable Alerts List */}
            <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
              {filteredAlerts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                  No alerts matching selected filter.
                </div>
              ) : (
                filteredAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                      alt.severity === 'critical'
                        ? 'bg-red-950/40 border-red-500/40 text-slate-200'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className={alt.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}>
                        {alt.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">{alt.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">{alt.details}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono">
                      <span className="text-slate-400 truncate max-w-[150px]">{alt.locationName}</span>
                      {alt.plateNumber !== 'N/A' && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                          {privacyMaskEnabled ? '••••••••' : alt.plateNumber}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Inspection Studio Modal */}
      <CameraInspectModal
        camera={selectedCamera}
        isOpen={isInspectOpen}
        onClose={() => setIsInspectOpen(false)}
        latestDetection={latestDetection}
        privacyMaskEnabled={privacyMaskEnabled}
      />
    </div>
  );
};

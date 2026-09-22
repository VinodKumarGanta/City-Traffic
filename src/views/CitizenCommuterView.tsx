import React, { useState } from 'react';
import { 
  Navigation, 
  MapPin, 
  Gauge, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Compass, 
  ArrowRight, 
  CloudRain, 
  Wind, 
  Eye, 
  ShieldCheck, 
  ThumbsUp, 
  Share2, 
  PlusCircle, 
  Search,
  ChevronRight,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { CorridorRoadInfo, CitizenReport } from '../types/traffic';
import { CitizenIncidentReportModal } from '../components/citizen/CitizenIncidentReportModal';

interface CitizenCommuterViewProps {
  corridors: CorridorRoadInfo[];
  citizenReports: CitizenReport[];
  onAddCitizenReport: (report: CitizenReport) => void;
  onUpvoteReport: (reportId: string) => void;
}

export const CitizenCommuterView: React.FC<CitizenCommuterViewProps> = ({
  corridors,
  citizenReports,
  onAddCitizenReport,
  onUpvoteReport
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Route planner state
  const [origin, setOrigin] = useState('Benz Circle, Vijayawada');
  const [destination, setDestination] = useState('Gannavaram Airport, Vijayawada');
  const [plannedRoute, setPlannedRoute] = useState<{
    primaryEta: number;
    primaryDist: string;
    primarySpeed: number;
    bypassEta: number;
    bypassDist: string;
    savingsMin: number;
    advice: string;
  } | null>({
    primaryEta: 18,
    primaryDist: '16.4 km',
    primarySpeed: 52,
    bypassEta: 28,
    bypassDist: '19.2 km',
    savingsMin: 10,
    advice: 'NH-16 Express Arterial is flowing smoothly. Benz Circle flyover cleared.'
  });

  const cities = ['All', 'Vijayawada', 'Eluru', 'Rajahmundry', 'Visakhapatnam', 'Guntur', 'Tirupati', 'Hyderabad'];

  const filteredCorridors = selectedCity === 'All' 
    ? corridors 
    : corridors.filter(c => c.city.toLowerCase() === selectedCity.toLowerCase());

  const handleCalculateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    // Deterministic simulation based on chosen endpoints
    const isAP = origin.includes('Vijayawada') || origin.includes('Eluru') || origin.includes('Rajahmundry');
    if (isAP) {
      setPlannedRoute({
        primaryEta: 19,
        primaryDist: '14.8 km',
        primarySpeed: 48,
        bypassEta: 31,
        bypassDist: '18.1 km',
        savingsMin: 12,
        advice: 'Recommended route via NH-16 bypass avoids urban market slowdowns.'
      });
    } else {
      setPlannedRoute({
        primaryEta: 22,
        primaryDist: '12.6 km',
        primarySpeed: 42,
        bypassEta: 34,
        bypassDist: '15.0 km',
        savingsMin: 12,
        advice: 'Avoid Panjagutta bottleneck by taking the Outer Ring Road feeder.'
      });
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-[1920px] mx-auto text-slate-100 font-sans">
      {/* Top Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 p-5 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold tracking-wider uppercase">
                Public Commuter Portal
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Live Sensors Active
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Smart City Commuter & Travel Hub
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Check real-time arterial road speeds, travel delays, and AI congestion bypass routes across Andhra Pradesh & Metropolitan sectors before you drive.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Road Hazard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 1: AI Journey Planner & Weather Safety */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* AI Route & Delay Estimator (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Live Journey & Delay Estimator</h3>
                <p className="text-[11px] text-slate-400">Predictive congestion avoidance for public commuters</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
              XGBoost Powered
            </span>
          </div>

          <form onSubmit={handleCalculateRoute} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Trip Origin</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="md:col-span-5">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Destination</label>
              <div className="relative">
                <Compass className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors shadow-lg shadow-cyan-950/50"
              >
                <span>Find</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {plannedRoute && (
            <div className="p-4 bg-slate-950/80 border border-cyan-500/30 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-xs text-slate-200">Recommended Fast Corridor</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded font-bold">
                    Fastest
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-cyan-400 font-mono">{plannedRoute.primaryEta} min</span>
                  <span className="text-[11px] text-slate-400 ml-2 font-mono">({plannedRoute.primaryDist})</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-500">Average Speed</div>
                  <div className="text-sm font-bold text-emerald-400">{plannedRoute.primarySpeed} km/h</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-500">Standard Delay</div>
                  <div className="text-sm font-bold text-slate-200">+3 mins</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-500">Time Saved</div>
                  <div className="text-sm font-bold text-cyan-300">-{plannedRoute.savingsMin} min</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 flex items-start gap-1.5 bg-cyan-950/30 border border-cyan-500/20 p-2.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>AI Traffic Advisory:</strong> {plannedRoute.advice}</span>
              </div>
            </div>
          )}
        </div>

        {/* Environmental & Road Safety Telemetry (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <CloudRain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Weather & Driving Safety Index</h3>
                <p className="text-[11px] text-slate-400">Real-time friction and hazard sensor alerts</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
              Safe Driving
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                <span>Precipitation</span>
              </div>
              <div className="text-base font-bold text-white">0.0 mm/h</div>
              <div className="text-[10px] text-emerald-400 font-sans">Dry Pavement</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Braking Distance</span>
              </div>
              <div className="text-base font-bold text-emerald-400">1.0x (Optimal)</div>
              <div className="text-[10px] text-slate-400 font-sans">Standard safe gap</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Road Visibility</span>
              </div>
              <div className="text-base font-bold text-white">9.8 km</div>
              <div className="text-[10px] text-emerald-400 font-sans">Clear daylight</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Wind className="w-3.5 h-3.5 text-purple-400" />
                <span>Air Quality Index</span>
              </div>
              <div className="text-base font-bold text-cyan-400">AQI 68</div>
              <div className="text-[10px] text-cyan-400 font-sans">Moderate Urban</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Emergency Services 108 & 112 Active on all major corridors.</span>
          </div>
        </div>
      </div>

      {/* Row 2: Live Arterial Corridors & Speed Board */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Arterial Corridors Live Speed & Delay Monitor</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                {filteredCorridors.length} Corridors
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Updated every 5 seconds from edge speed loop sensors</p>
          </div>

          {/* City Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {cities.map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all whitespace-nowrap ${
                  selectedCity === city
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Corridor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCorridors.map((corridor) => {
            const isClear = corridor.status === 'clear';
            const isModerate = corridor.status === 'moderate';
            const isCongested = corridor.status === 'congested';
            const isGridlock = corridor.status === 'gridlock';

            const statusBadge = isClear 
              ? { text: 'Smooth Flow', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
              : isModerate 
              ? { text: 'Moderate Traffic', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
              : isCongested 
              ? { text: 'Heavy Delay', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
              : { text: 'Gridlock Warning', color: 'bg-red-500/20 text-red-400 border-red-500/30' };

            const speedColor = isClear ? 'text-emerald-400' : isModerate ? 'text-yellow-400' : 'text-red-400';
            const delayMin = Math.max(0, corridor.travelTimeMin - corridor.normalTravelTimeMin);

            return (
              <div 
                key={corridor.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-3 shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                      {corridor.city}
                    </span>
                    <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{corridor.name}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${statusBadge.color}`}>
                    {statusBadge.text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-500">Live Speed</div>
                    <div className={`text-base font-bold ${speedColor}`}>
                      {corridor.currentSpeedKmh} <span className="text-[10px] font-normal text-slate-400">km/h</span>
                    </div>
                  </div>

                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-500">Transit Time</div>
                    <div className="text-base font-bold text-white">
                      {corridor.travelTimeMin} <span className="text-[10px] font-normal text-slate-400">min</span>
                      {delayMin > 0 && <span className="text-[10px] text-red-400 ml-1">+{delayMin}m</span>}
                    </div>
                  </div>
                </div>

                {/* Congestion Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Congestion Volume</span>
                    <span className="font-bold text-slate-200">{corridor.congestionPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        isClear ? 'bg-emerald-500' : isModerate ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${corridor.congestionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Distance: {corridor.lengthKm} km</span>
                  <span>{corridor.activeIncidents > 0 ? `⚠️ ${corridor.activeIncidents} Active Hazard` : '✓ Clear Road'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Live Citizen Crowdsourced Reports Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Citizen Verified Hazards & Incidents Feed</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                {citizenReports.length} Live Reports
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Crowdsourced reports submitted by commuters on the road</p>
          </div>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Submit New Hazard</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {citizenReports.map((report) => (
            <div 
              key={report.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{report.trackingId}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{report.timestamp}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 mt-0.5">{report.title}</h4>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  report.status === 'dispatched' 
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : report.status === 'investigating'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {report.status}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">{report.description}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-400" />
                  {report.locationName}
                </span>

                <button
                  onClick={() => onUpvoteReport(report.id)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <ThumbsUp className="w-3 h-3 text-cyan-400" />
                  <span>Confirm ({report.votes})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Citizen Report Modal */}
      <CitizenIncidentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={(rep) => {
          onAddCitizenReport(rep);
          setIsReportModalOpen(false);
        }}
        defaultCity={selectedCity === 'All' ? 'Vijayawada' : selectedCity}
      />
    </div>
  );
};

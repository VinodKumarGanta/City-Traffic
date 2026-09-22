import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { ODMatrixItem, SectorSummary } from '../types/traffic';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { BarChart3, TrendingUp, Compass, Activity, Layers, ArrowUpRight, AlertCircle } from 'lucide-react';

export const TrafficAnalyticsView: React.FC = () => {
  const [hourlyData, setHourlyData] = useState<Array<{ time: string; volume: number; speed: number }>>([]);
  const [vehicleClassData, setVehicleClassData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [odMatrix, setOdMatrix] = useState<ODMatrixItem[]>([]);
  const [sectorSummaries, setSectorSummaries] = useState<SectorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        const [hourly, vClasses, od, sectors] = await Promise.all([
          dbService.getHourlyAnalytics(),
          dbService.getVehicleClassDistribution(),
          dbService.getODMatrix(),
          dbService.getSectorSummaries()
        ]);
        if (!isMounted) return;
        setHourlyData(hourly);
        setVehicleClassData(vClasses);
        setOdMatrix(od);
        setSectorSummaries(sectors);
      } catch (err) {
        console.error('Failed to load traffic analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAnalytics();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto">
      {/* Top Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Urban Traffic Analytics & Macro Flow Engine</h2>
            <p className="text-[11px] text-slate-400 font-mono">Live PostgreSQL Aggregations & Origin-Destination (O-D) Trip Matrix</p>
          </div>
        </div>
        <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          PostgreSQL Database Sync
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-mono text-slate-400">Calculating Traffic Volumes & Flow Matrices from PostgreSQL...</p>
        </div>
      ) : (
        <>
          {/* Sector Summaries Metric Strip */}
          {sectorSummaries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {sectorSummaries.map(sec => (
                <div key={sec.sectorId} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1 shadow-md">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300 truncate">{sec.sectorName}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                      sec.congestionStatus === 'Congested' ? 'bg-red-500/20 text-red-400' :
                      sec.congestionStatus === 'Moderate' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {sec.congestionStatus}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-lg font-black font-mono text-white">{sec.activeVehicles.toLocaleString()}</span>
                    <span className="text-xs font-mono text-cyan-400">{sec.avgSpeedKmh} km/h</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{sec.cameraCount} Surveillance Nodes</div>
                </div>
              ))}
            </div>
          )}

          {/* Main Grid Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Hourly Volume & Speed Trend Chart (7 Cols) */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <TrendingUp className="w-4 h-4" />
                  24-Hour City Traffic Volume & Mean Speed Trends
                </span>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="flex items-center gap-1 text-cyan-400">● Volume (Veh/h)</span>
                  <span className="flex items-center gap-1 text-emerald-400">● Mean Speed (km/h)</span>
                </div>
              </div>

              <div className="h-72 pt-2">
                {hourlyData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    No hourly trend metrics recorded in database.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyData}>
                      <defs>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="volume" stroke="#06b6d4" fillOpacity={1} fill="url(#volGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Vehicle Classification Breakdown (5 Cols) */}
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <Layers className="w-4 h-4" />
                  ANPR Vehicle Type Classification
                </span>
                <span className="text-slate-400 font-mono text-[11px]">{vehicleClassData.length} Categories</span>
              </div>

              <div className="h-52 flex items-center justify-center">
                {vehicleClassData.length === 0 ? (
                  <div className="text-xs text-slate-500 font-mono">
                    No classification distribution recorded in database.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vehicleClassData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {vehicleClassData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1 text-center font-mono text-[11px]">
                {vehicleClassData.map((v, i) => (
                  <div key={i} className="bg-slate-950 p-1.5 rounded border border-slate-800 space-y-0.5">
                    <div className="text-slate-400 text-[10px] truncate">{v.name}</div>
                    <div className="font-bold text-white" style={{ color: v.color }}>{v.value}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Origin-Destination (O-D) Matrix Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Compass className="w-4 h-4" />
                Origin-Destination (O-D) Trip Matrix & Corridor Congestion Index
              </span>
              <span className="text-slate-400 font-mono text-[11px]">{odMatrix.length} Monitored Routes</span>
            </div>

            {odMatrix.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No origin-destination matrix data in database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3">OD Matrix ID</th>
                      <th className="py-2 px-3">Origin Zone</th>
                      <th className="py-2 px-3">Destination Zone</th>
                      <th className="py-2 px-3">Vehicle Volume</th>
                      <th className="py-2 px-3">Avg Travel Time</th>
                      <th className="py-2 px-3">Congestion Index</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {odMatrix.map(od => (
                      <tr key={od.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-cyan-400">{od.id}</td>
                        <td className="py-2.5 px-3">{od.originZone}</td>
                        <td className="py-2.5 px-3">{od.destinationZone}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{od.vehicleCount.toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">{od.avgTravelTimeMin} min</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            od.congestionIndex > 0.8 ? 'bg-red-500/20 text-red-400' :
                            od.congestionIndex > 0.6 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {(od.congestionIndex * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

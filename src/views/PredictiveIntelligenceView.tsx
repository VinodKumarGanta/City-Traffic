import React, { useState, useEffect } from 'react';
import { CameraNode, PredictiveState } from '../types/traffic';
import { dbService } from '../services/dbService';
import { CityMap } from '../components/gis/CityMap';
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  BarChart, 
  ArrowRight,
  Activity,
  Layers,
  AlertCircle
} from 'lucide-react';

interface PredictiveIntelligenceViewProps {
  cameras: CameraNode[];
}

export const PredictiveIntelligenceView: React.FC<PredictiveIntelligenceViewProps> = ({ cameras }) => {
  const [selectedHorizon, setSelectedHorizon] = useState<number>(10);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('SEG-NH44');
  const [approvalStatus, setApprovalStatus] = useState<Record<string, boolean>>({});
  const [predictiveStates, setPredictiveStates] = useState<PredictiveState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    dbService.getPredictiveStates().then(states => {
      if (!isMounted) return;
      setPredictiveStates(states);
      if (states.length > 0) {
        setSelectedSegmentId(states[0].roadSegmentId);
        const approvals: Record<string, boolean> = {};
        states.forEach(s => {
          if (s.actionApproved) approvals[s.roadSegmentId] = true;
        });
        setApprovalStatus(approvals);
      }
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const activeSegment = predictiveStates.find(s => s.roadSegmentId === selectedSegmentId) || predictiveStates[0];

  const handleApproveAction = (segmentId: string) => {
    setApprovalStatus(prev => ({ ...prev, [segmentId]: true }));
    dbService.approvePredictiveState(segmentId);
  };

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto">
      {/* Top Predictive Banner & Horizon Timeline Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>PREDICTIVE TRAFFIC & INCIDENT INTELLIGENCE ENGINE</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                XGBoost ML v2.4
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              10–15 Minute Machine Learning Traffic Forecast & Operator Decision Support
            </p>
          </div>
        </div>

        {/* Timeline Horizon Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <span className="text-xs font-mono text-slate-400 px-2">Forecast Horizon:</span>
          {[5, 10, 15].map(min => (
            <button
              key={min}
              onClick={() => setSelectedHorizon(min)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedHorizon === min
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              +{min} min
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-mono text-slate-400">Loading ML Predictive Forecasts from PostgreSQL...</p>
        </div>
      ) : predictiveStates.length === 0 || !activeSegment ? (
        <div className="p-16 text-center bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">No Predictive Forecasts Available</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The machine learning engine has not registered predictive risk states yet. As traffic flows through monitored segments, forecast states will populate automatically.
          </p>
        </div>
      ) : (
        /* Main Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Corridor Selection & Forecast Cards (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            {/* Corridor Segment Selector Cards */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 shadow-xl">
              <div className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
                Monitored Urban Corridors ({predictiveStates.length})
              </div>

              {predictiveStates.map(seg => (
                <button
                  key={seg.roadSegmentId}
                  onClick={() => setSelectedSegmentId(seg.roadSegmentId)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all space-y-1.5 ${
                    selectedSegmentId === seg.roadSegmentId
                      ? 'bg-amber-950/40 border-amber-500/60 text-slate-100 shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-100">{seg.segmentName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    seg.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    seg.riskLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {seg.congestionProbability}% {seg.riskLevel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                  <div>Predicted Speed: <strong className="text-amber-400">{seg.predictedSpeedKmh} km/h</strong></div>
                  <div>Travel Time: <strong className="text-white">{seg.predictedTravelTimeMin} min</strong></div>
                </div>
              </button>
            ))}
          </div>

          {/* Travel Time Forecast Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
            <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                Travel-Time Horizon Delta
              </span>
              <span className="text-amber-400 font-mono text-xs font-bold">+13 min Delay</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Current Travel Time</div>
                <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
                  {activeSegment.currentTravelTimeMin} <span className="text-xs font-normal">min</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{activeSegment.currentSpeedKmh} km/h mean</div>
              </div>

              <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-500/40">
                <div className="text-xs text-amber-300">Predicted ({selectedHorizon} min)</div>
                <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                  {activeSegment.predictedTravelTimeMin} <span className="text-xs font-normal">min</span>
                </div>
                <div className="text-[10px] text-amber-300/80 mt-0.5">{activeSegment.predictedSpeedKmh} km/h forecast</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: GIS Prediction Overlay & Explainability (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          {/* GIS Map with Heatmap & Segment Overlay */}
          <div className="h-[420px] bg-slate-900/90 border border-slate-800 rounded-xl p-2 shadow-2xl relative">
            <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-300 border-b border-slate-800 mb-1">
              <span className="flex items-center gap-2 text-amber-400 font-mono">
                <Layers className="w-4 h-4" />
                Predicted Congestion & Incident Heatmap Layer
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                Showing +{selectedHorizon} min Forecast Window
              </span>
            </div>
            <div className="h-[360px]">
              <CityMap
                cameras={cameras}
                showHeatmap={true}
                center={[17.4450, 78.4600]}
                zoom={13}
              />
            </div>
          </div>

          {/* Explainability & Recommended Operator Action Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Why This Prediction? Explainability Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
              <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <Info className="w-4 h-4" />
                  "Why This Prediction?" (XGBoost Feature Importance)
                </span>
              </div>

              <div className="space-y-2">
                {activeSegment.explainability.map((item, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300">{item.factor}</span>
                    <span className={`font-mono font-bold ${
                      item.impact === 'negative' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {item.changePercent > 0 ? `+${item.changePercent}%` : `${item.changePercent}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Action & Human Approval Card */}
            <div className="bg-gradient-to-b from-slate-900 to-amber-950/30 border border-amber-500/40 rounded-xl p-4 space-y-3 shadow-xl flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-amber-300 border-b border-amber-500/30 pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Human-in-the-Loop Operator Recommendation
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 uppercase">Review Required</span>
                </div>

                <p className="text-xs text-slate-200 mt-3 leading-relaxed bg-slate-950/80 p-3 rounded-lg border border-slate-800 font-mono">
                  "{activeSegment.recommendedAction}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Operator Review:</span>
                {approvalStatus[activeSegment.roadSegmentId] ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs font-mono bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/40">
                    <CheckCircle2 className="w-4 h-4" /> Approved & Dispatched
                  </div>
                ) : (
                  <button
                    onClick={() => handleApproveAction(activeSegment.roadSegmentId)}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve Recommendation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CameraNode, VehicleTrajectory, ANPRDetection } from '../types/traffic';
import { dbService, TrackedPlateSummary } from '../services/dbService';
import { CityMap } from '../components/gis/CityMap';
import { CameraFeedCanvas } from '../components/camera/CameraFeedCanvas';
import { 
  Search, 
  MapPin, 
  Clock, 
  Sliders, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Navigation,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ANPRTrajectoryViewProps {
  cameras: CameraNode[];
  selectedCamera: CameraNode;
  latestDetection: ANPRDetection | null;
  privacyMaskEnabled: boolean;
  onSelectTrajectoryPlate: (plate: string) => void;
}

export const ANPRTrajectoryView: React.FC<ANPRTrajectoryViewProps> = ({
  cameras = [],
  selectedCamera,
  latestDetection,
  privacyMaskEnabled,
  onSelectTrajectoryPlate
}) => {
  const [targetPlate, setTargetPlate] = useState('TS07JH4821');
  const [trackedPlates, setTrackedPlates] = useState<TrackedPlateSummary[]>([]);
  const [trajectory, setTrajectory] = useState<VehicleTrajectory | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch tracked plates list from database
  useEffect(() => {
    let isMounted = true;
    dbService.getTrackedPlates().then(plates => {
      if (!isMounted) return;
      setTrackedPlates(plates);
      if (plates.length > 0 && !plates.some(p => p.plate_number === targetPlate)) {
        setTargetPlate(plates[0].plate_number);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Fetch trajectory data for active plate
  useEffect(() => {
    let isMounted = true;
    if (!targetPlate) return;
    setLoading(true);
    dbService.getTrajectory(targetPlate).then(traj => {
      if (!isMounted) return;
      setTrajectory(traj);
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, [targetPlate]);

  const handlePlateSelect = (plate: string) => {
    setTargetPlate(plate);
    onSelectTrajectoryPlate(plate);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPlate.trim()) {
      handlePlateSelect(targetPlate.trim().toUpperCase());
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto">
      {/* Header Search & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Vehicle ANPR & Spatial Trajectory Tracking</h2>
            <p className="text-[11px] text-slate-400 font-mono">Reconstruct complete journey across city camera graph from PostgreSQL</p>
          </div>
        </div>

        {/* Quick Search Preset Plates */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Live Tracked Plates:</span>
          {trackedPlates.length === 0 ? (
            <span className="text-xs text-slate-500 font-mono italic">No recorded journeys in database</span>
          ) : (
            trackedPlates.map(tp => (
              <button
                key={tp.plate_number}
                onClick={() => handlePlateSelect(tp.plate_number)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                  targetPlate === tp.plate_number
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {privacyMaskEnabled ? '•••' + tp.plate_number.slice(-4) : tp.plate_number}
              </button>
            ))
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-mono text-slate-400">Reconstructing spatial trajectory from PostgreSQL...</p>
        </div>
      ) : !trajectory ? (
        <div className="p-16 text-center bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">No Journey Found for {targetPlate}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No camera checkpoint detections have been logged for this registration number yet. Detections will appear as vehicles cross edge camera checkpoints.
          </p>
        </div>
      ) : (
        /* Main Content Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Trajectory GIS Map (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col h-[650px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs font-semibold">
              <span className="flex items-center gap-2 text-cyan-400 font-mono">
                <Navigation className="w-4 h-4" />
                ST_MakeLine GeoJSON Reconstructed Path
              </span>
              <div className="text-[11px] font-mono text-slate-400">
                Plate: <strong className="text-white">{privacyMaskEnabled ? '••••••••••' : trajectory.plateNumber}</strong> ({trajectory.vehicleColor} {trajectory.vehicleType})
              </div>
            </div>

            <div className="flex-1">
              <CityMap
                cameras={cameras}
                selectedCameraId={selectedCamera?.id || cameras[0]?.id || ''}
                activeTrajectory={trajectory}
                center={
                  trajectory.checkpoints && trajectory.checkpoints.length > 2
                    ? [trajectory.checkpoints[2].lat, trajectory.checkpoints[2].lng]
                    : trajectory.checkpoints && trajectory.checkpoints.length > 0
                    ? [trajectory.checkpoints[0].lat, trajectory.checkpoints[0].lng]
                    : [16.5062, 80.6480]
                }
                zoom={12}
              />
            </div>
          </div>

        {/* Right Column: AI Recognition & Journey Checkpoint Log (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* STN & Deep OCR Pipeline Breakdown Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800 pb-1.5">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Zap className="w-4 h-4" />
                STN & Deep CRNN OCR Pipeline Mechanics
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                &gt;90% Character Acc
              </span>
            </div>

            {/* Pipeline Stage Steps */}
            <div className="grid grid-cols-4 gap-1.5 text-[10px] text-center pt-1">
              <div className="p-1.5 bg-slate-950 border border-slate-800 rounded">
                <div className="text-slate-400 font-semibold">1. YOLOv10</div>
                <div className="text-cyan-400 font-mono font-bold mt-0.5">&lt;8ms Detect</div>
              </div>
              <div className="p-1.5 bg-slate-950 border border-slate-800 rounded">
                <div className="text-slate-400 font-semibold">2. STN Affine</div>
                <div className="text-cyan-400 font-mono font-bold mt-0.5">De-skew matrix</div>
              </div>
              <div className="p-1.5 bg-slate-950 border border-slate-800 rounded">
                <div className="text-slate-400 font-semibold">3. CLAHE</div>
                <div className="text-cyan-400 font-mono font-bold mt-0.5">Equalize Mask</div>
              </div>
              <div className="p-1.5 bg-slate-950 border border-slate-800 rounded">
                <div className="text-slate-400 font-semibold">4. CRNN CTC</div>
                <div className="text-emerald-400 font-mono font-bold mt-0.5">98.7% Sequence</div>
              </div>
            </div>
          </div>

          {/* Journey Checkpoint Timeline */}
          <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Clock className="w-4 h-4" />
                Vehicle Journey Timeline Checkpoints ({trajectory.checkpoints.length})
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {trajectory.startTime} → {trajectory.endTime}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1">
              {trajectory.checkpoints.map((cp, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 relative before:absolute before:left-3.5 before:top-7 before:bottom-0 before:w-0.5 before:bg-slate-800 last:before:hidden"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-950 border-2 border-cyan-500 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 z-10">
                    {idx + 1}
                  </div>
                  <div className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">{cp.locationName}</span>
                      <span className="text-[10px] font-mono text-cyan-400">{cp.timestamp}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/50">
                      <div>Camera: <strong className="text-slate-200">{cp.cameraId}</strong></div>
                      <div>Speed: <strong className="text-emerald-400">{cp.speedKmh} km/h</strong></div>
                      <div>OCR Conf: <strong className="text-cyan-400">{cp.confidence}%</strong></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Visual History Strip */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 shadow-xl">
            <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-1 flex justify-between">
              <span>Visual Verification Strip (ANPR Edge Captures)</span>
              <span className="text-[10px] text-emerald-400 font-mono">5 Matched Frame Snapshots</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {trajectory.checkpoints.map((cp, i) => (
                <div key={i} className="bg-slate-950 border border-slate-800 rounded p-1 text-center space-y-1">
                  <div className="h-10 bg-slate-800 rounded flex items-center justify-center font-mono font-bold text-[10px] text-cyan-300">
                    {privacyMaskEnabled ? '•••••' : trajectory.plateNumber.slice(0, 6)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 truncate">{cp.timestamp.split(' ')[0]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

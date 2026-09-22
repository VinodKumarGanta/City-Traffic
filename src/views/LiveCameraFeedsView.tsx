import React, { useState } from 'react';
import { CameraNode, ANPRDetection } from '../types/traffic';
import { CameraFeedCanvas } from '../components/camera/CameraFeedCanvas';
import { CameraInspectModal } from '../components/camera/CameraInspectModal';
import { 
  Video, 
  Grid, 
  Filter, 
  Search, 
  Activity, 
  Zap, 
  Maximize2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface LiveCameraFeedsViewProps {
  cameras: CameraNode[];
  selectedCamera: CameraNode;
  onSelectCamera: (id: string) => void;
  latestDetection: ANPRDetection | null;
  privacyMaskEnabled: boolean;
}

export const LiveCameraFeedsView: React.FC<LiveCameraFeedsViewProps> = ({
  cameras,
  selectedCamera,
  onSelectCamera,
  latestDetection,
  privacyMaskEnabled
}) => {
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectingCamera, setInspectingCamera] = useState<CameraNode | null>(null);

  const uniqueSectors = Array.from(new Set(cameras.map(cam => cam.sectorId))).filter(Boolean);

  const filteredCameras = cameras.filter(cam => {
    const matchesSector = selectedSector === 'ALL' || cam.sectorId === selectedSector;
    const matchesStatus = statusFilter === 'ALL' || cam.status === statusFilter;
    const matchesSearch = cam.locationName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cam.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSector && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto">
      {/* Top Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Smart City Live Camera Matrix</h2>
            <p className="text-[11px] text-slate-400 font-mono">{cameras.length} RTSP Edge AI Feeds | Real-Time YOLO Bounding Overlay</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sector Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono">Sector:</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Sectors ({uniqueSectors.length})</option>
              {uniqueSectors.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Status</option>
              <option value="online">Online Only</option>
              <option value="warning">Warning / Degradation</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search camera..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Main Camera Grid */}
      {filteredCameras.length === 0 ? (
        <div className="p-16 text-center bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <AlertCircle className="w-10 h-10 text-cyan-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">No Cameras Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No camera surveillance nodes match the current filter criteria or are registered in the PostgreSQL database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCameras.map((cam) => (
          <div
            key={cam.id}
            onClick={() => onSelectCamera(cam.id)}
            className={`h-72 bg-slate-900/90 border rounded-xl p-2 flex flex-col justify-between transition-all cursor-pointer group ${
              selectedCamera.id === cam.id
                ? 'border-cyan-500 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs px-1 pb-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  cam.status === 'online' ? 'bg-cyan-400 animate-pulse' : 'bg-amber-500'
                }`}></span>
                <span className="font-mono font-bold text-cyan-400">{cam.id}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                {cam.locationName}
              </span>
            </div>

            <div className="flex-1 mt-1">
              <CameraFeedCanvas
                camera={cam}
                latestDetection={selectedCamera.id === cam.id ? latestDetection : null}
                privacyMaskEnabled={privacyMaskEnabled}
              />
            </div>

            <div className="pt-2 px-1 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 mt-1">
              <div>Detections: <strong className="text-white">{cam.totalDetectionsToday.toLocaleString()}</strong></div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCamera(cam.id);
                  setInspectingCamera(cam);
                }}
                className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 hover:bg-cyan-900/80"
                title="Open Live Inspection Studio & Enter Camera Feed"
              >
                <Maximize2 className="w-3 h-3" /> Inspect Live Feed
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Live Inspection Studio Modal */}
      <CameraInspectModal
        camera={inspectingCamera}
        isOpen={!!inspectingCamera}
        onClose={() => setInspectingCamera(null)}
        latestDetection={latestDetection}
        privacyMaskEnabled={privacyMaskEnabled}
      />
    </div>
  );
};

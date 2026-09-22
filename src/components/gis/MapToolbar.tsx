import React from 'react';
import { Layers, Eye, EyeOff, Maximize2, Minimize2, Compass, RotateCcw } from 'lucide-react';
import type { BasemapType } from './types';

interface MapToolbarProps {
  activeBasemap: BasemapType;
  onBasemap: (b: BasemapType) => void;
  showCameras: boolean;
  showAlerts: boolean;
  showHeatmap: boolean;
  showTrajectory: boolean;
  cameraCount: number;
  alertCount: number;
  onToggleCameras: () => void;
  onToggleAlerts: () => void;
  onToggleHeatmap: () => void;
  onToggleTrajectory: () => void;
  onLocate: () => void;
  onReset: () => void;
  isFullscreen: boolean;
  onFullscreen: () => void;
  engineLabel: string;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({
  activeBasemap,
  onBasemap,
  showCameras,
  showAlerts,
  showHeatmap,
  showTrajectory,
  cameraCount,
  alertCount,
  onToggleCameras,
  onToggleAlerts,
  onToggleHeatmap,
  onToggleTrajectory,
  onLocate,
  onReset,
  isFullscreen,
  onFullscreen,
  engineLabel,
}) => (
  <div className="absolute top-2 left-2 right-2 z-[1000] flex items-center justify-between gap-2 pointer-events-none">
    <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-lg p-1 text-[11px] font-mono">
      <Layers className="w-3.5 h-3.5 text-cyan-400 ml-1" />
      {(['dark', 'satellite', 'streets'] as BasemapType[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onBasemap(key)}
          className={`px-2 py-0.5 rounded capitalize ${
            activeBasemap === key ? 'bg-cyan-700 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {key}
        </button>
      ))}
      <span className="px-1.5 text-slate-600 hidden sm:inline">{engineLabel}</span>
    </div>
    <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-lg p-1 text-[11px] font-mono">
      <button type="button" onClick={onToggleCameras} className={`px-2 py-0.5 rounded ${showCameras ? 'text-cyan-300' : 'text-slate-500'}`}>
        Cam {cameraCount}
      </button>
      <button type="button" onClick={onToggleAlerts} className={`px-2 py-0.5 rounded ${showAlerts ? 'text-red-300' : 'text-slate-500'}`}>
        Alerts {alertCount}
      </button>
      <button type="button" onClick={onToggleHeatmap} className={`px-2 py-0.5 rounded ${showHeatmap ? 'text-amber-300' : 'text-slate-500'}`}>
        Heat
      </button>
      <button type="button" onClick={onToggleTrajectory} className={`p-1 rounded ${showTrajectory ? 'text-cyan-300' : 'text-slate-500'}`} title="Trajectory">
        {showTrajectory ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
      <button type="button" onClick={onLocate} className="p-1 text-slate-300 hover:text-white" title="Locate">
        <Compass className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onReset} className="p-1 text-slate-300 hover:text-white" title="Reset">
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onFullscreen} className="p-1 text-slate-300 hover:text-white">
        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  </div>
);

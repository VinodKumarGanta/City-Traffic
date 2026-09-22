import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { CameraNode, VehicleTrajectory, TrafficAlert } from '../../types/traffic';
import {
  Video,
  Navigation,
  Globe,
  Layers,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Compass,
  MapPin,
  Crosshair,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Target
} from 'lucide-react';

export type BasemapType = 'dark' | 'satellite' | 'streets' | 'voyager' | 'topo';

interface BasemapConfig {
  name: string;
  url: string;
  overlayUrl?: string;
  attribution: string;
  maxZoom: number;
}

const BASEMAP_PROVIDERS: Record<BasemapType, BasemapConfig> = {
  dark: {
    name: 'Dark Slate (Clean)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
  },
  satellite: {
    name: 'Satellite HD',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19
  },
  streets: {
    name: 'Streets OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  voyager: {
    name: 'World Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, TomTom',
    maxZoom: 19
  },
  topo: {
    name: 'Topographic',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom',
    maxZoom: 19
  }
};

export interface CityPreset {
  name: string;
  category: 'Andhra Pradesh Popular Maps' | 'National Hubs' | 'Global Metros';
  coords: [number, number];
  zoom: number;
}

const GLOBAL_PRESETS: CityPreset[] = [
  // Andhra Pradesh Popular Hubs
  { name: 'Vijayawada (Benz Circle & Varadhi)', category: 'Andhra Pradesh Popular Maps', coords: [16.5062, 80.6480], zoom: 13 },
  { name: 'Eluru (Fire Station & Old Bus Stand)', category: 'Andhra Pradesh Popular Maps', coords: [16.7107, 81.0952], zoom: 14 },
  { name: 'Rajahmundry (Godavari Arch Bridge)', category: 'Andhra Pradesh Popular Maps', coords: [17.0005, 81.7750], zoom: 13 },
  { name: 'Visakhapatnam (Vizag RK Beach)', category: 'Andhra Pradesh Popular Maps', coords: [17.6868, 83.2185], zoom: 13 },
  { name: 'Guntur (Lodge Center & Arundelpet)', category: 'Andhra Pradesh Popular Maps', coords: [16.3067, 80.4365], zoom: 13 },
  { name: 'Amaravati (Capital Region Corridor)', category: 'Andhra Pradesh Popular Maps', coords: [16.5131, 80.5165], zoom: 13 },
  { name: 'Kakinada (Smart Port City)', category: 'Andhra Pradesh Popular Maps', coords: [16.9891, 82.2475], zoom: 13 },
  { name: 'Tirupati (Alipiri & Temple Corridor)', category: 'Andhra Pradesh Popular Maps', coords: [13.6288, 79.4192], zoom: 13 },
  { name: 'Nellore (Grand Trunk Corridor)', category: 'Andhra Pradesh Popular Maps', coords: [14.4426, 79.9865], zoom: 13 },
  { name: 'Kurnool (Raj Vihar Circle)', category: 'Andhra Pradesh Popular Maps', coords: [15.8281, 78.0373], zoom: 13 },
  { name: 'Bhimavaram (West Godavari Hub)', category: 'Andhra Pradesh Popular Maps', coords: [16.5449, 81.5212], zoom: 14 },
  { name: 'Ongole (Prakasam Transit)', category: 'Andhra Pradesh Popular Maps', coords: [15.5057, 80.0499], zoom: 13 },
  { name: 'Kadapa (Rayalaseema Central)', category: 'Andhra Pradesh Popular Maps', coords: [14.4673, 78.8242], zoom: 13 },
  { name: 'Anantapur (Clock Tower Corridor)', category: 'Andhra Pradesh Popular Maps', coords: [14.6819, 77.6006], zoom: 13 },

  // National & Regional Hubs
  { name: 'Hyderabad (Traffic Grid)', category: 'National Hubs', coords: [17.4300, 78.4100], zoom: 13 },
  { name: 'Bengaluru (Silicon Corridor)', category: 'National Hubs', coords: [12.9716, 77.5946], zoom: 13 },
  { name: 'Chennai (Coastal IT Expressway)', category: 'National Hubs', coords: [13.0827, 80.2707], zoom: 13 },
  { name: 'Mumbai (Marine Drive & Sea Link)', category: 'National Hubs', coords: [18.9220, 72.8347], zoom: 13 },
  { name: 'Delhi (Connaught Place & Ring Rd)', category: 'National Hubs', coords: [28.6139, 77.2090], zoom: 13 },

  // Global Metros
  { name: 'New York City', category: 'Global Metros', coords: [40.7128, -74.0060], zoom: 13 },
  { name: 'London', category: 'Global Metros', coords: [51.5074, -0.1278], zoom: 13 },
  { name: 'Tokyo', category: 'Global Metros', coords: [35.6762, 139.6503], zoom: 13 },
  { name: 'Singapore', category: 'Global Metros', coords: [1.3521, 103.8198], zoom: 13 },
  { name: 'Dubai', category: 'Global Metros', coords: [25.2048, 55.2708], zoom: 13 },
  { name: 'Paris', category: 'Global Metros', coords: [48.8566, 2.3522], zoom: 13 },
  { name: 'San Francisco', category: 'Global Metros', coords: [37.7749, -122.4194], zoom: 13 }
];

interface CityMapProps {
  cameras: CameraNode[];
  selectedCameraId?: string;
  onSelectCamera?: (cameraId: string) => void;
  activeTrajectory?: VehicleTrajectory | null;
  alerts?: TrafficAlert[];
  showHeatmap?: boolean;
  center?: [number, number];
  zoom?: number;
}

// Map Auto Recenter & Gesture Controller (Prevents Rubber-Banding during mouse pan)
const MapController: React.FC<{
  targetCenter: [number, number];
  targetZoom: number;
  onCoordinatesChange: (lat: number, lng: number, zoom: number) => void;
  onUserMovedMap?: (center: [number, number], zoom: number) => void;
}> = ({ targetCenter, targetZoom, onCoordinatesChange, onUserMovedMap }) => {
  const map = useMap();
  const lastTargetKeyRef = useRef<string>('');

  useEffect(() => {
    const key = `${targetCenter[0].toFixed(4)},${targetCenter[1].toFixed(4)},${targetZoom}`;
    if (lastTargetKeyRef.current !== key) {
      lastTargetKeyRef.current = key;
      map.flyTo(targetCenter, targetZoom, { duration: 1.2 });
    }
  }, [targetCenter, targetZoom, map]);

  useMapEvents({
    mousemove(e) {
      onCoordinatesChange(
        Number(e.latlng.lat.toFixed(5)),
        Number(e.latlng.lng.toFixed(5)),
        map.getZoom()
      );
    },
    dragend() {
      const c = map.getCenter();
      const z = map.getZoom();
      const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)},${z}`;
      lastTargetKeyRef.current = key;
      onCoordinatesChange(Number(c.lat.toFixed(5)), Number(c.lng.toFixed(5)), z);
      onUserMovedMap?.([c.lat, c.lng], z);
    },
    zoomend() {
      const c = map.getCenter();
      const z = map.getZoom();
      const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)},${z}`;
      lastTargetKeyRef.current = key;
      onCoordinatesChange(Number(c.lat.toFixed(5)), Number(c.lng.toFixed(5)), z);
      onUserMovedMap?.([c.lat, c.lng], z);
    }
  });

  return null;
};

// 4-Way Directional Mouse Pan & Zoom Widget (Rosette for Upside-Down & Left-Right Panning)
const MapNavigationPanWidget: React.FC<{
  onRecenter: () => void;
}> = ({ onRecenter }) => {
  const map = useMap();

  const handlePan = (dx: number, dy: number) => {
    map.panBy([dx, dy], { animate: true, duration: 0.25 });
  };

  return (
    <div className="absolute bottom-12 right-3 z-[1000] pointer-events-auto select-none flex flex-col items-center gap-1.5 animate-in fade-in">
      {/* 4-way Directional D-Pad */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-1.5 shadow-2xl flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => handlePan(0, -140)}
          className="w-7 h-7 rounded-lg bg-slate-800/90 hover:bg-cyan-600 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow border border-slate-700/80 hover:border-cyan-400"
          title="Pan North (Move Map Up / Upside Down)"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handlePan(-140, 0)}
            className="w-7 h-7 rounded-lg bg-slate-800/90 hover:bg-cyan-600 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow border border-slate-700/80 hover:border-cyan-400"
            title="Pan West (Move Map Left / Left-Right)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onRecenter}
            className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/60 hover:bg-cyan-600 text-cyan-300 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow"
            title="Recenter Map to Grid Center"
          >
            <Target className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handlePan(140, 0)}
            className="w-7 h-7 rounded-lg bg-slate-800/90 hover:bg-cyan-600 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow border border-slate-700/80 hover:border-cyan-400"
            title="Pan East (Move Map Right / Left-Right)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => handlePan(0, 140)}
          className="w-7 h-7 rounded-lg bg-slate-800/90 hover:bg-cyan-600 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow border border-slate-700/80 hover:border-cyan-400"
          title="Pan South (Move Map Down / Upside Down)"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom In & Zoom Out Buttons */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          className="w-7 h-7 rounded-lg bg-slate-800/90 hover:bg-cyan-600 text-slate-300 hover:text-white flex items-center justify-center font-bold transition-all hover:scale-110 active:scale-90 shadow border border-slate-700/80 hover:border-cyan-400"
          title="Zoom In (+)"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          className="w-7 h-7 rounded-lg bg-slate-800/90 hover:bg-cyan-600 text-slate-300 hover:text-white flex items-center justify-center font-bold transition-all hover:scale-110 active:scale-90 shadow border border-slate-700/80 hover:border-cyan-400"
          title="Zoom Out (-)"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Custom SVG Icons
const createCameraIcon = (status: CameraNode['status'], isSelected: boolean) => {
  const color = status === 'online' ? '#06b6d4' : status === 'warning' ? '#f59e0b' : '#ef4444';
  const size = isSelected ? 36 : 28;
  const pulseHtml = isSelected
    ? `<span class="absolute -inset-1 rounded-full bg-cyan-500/40 animate-ping"></span>`
    : '';

  return L.divIcon({
    className: 'relative flex items-center justify-center',
    html: `
      <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
        ${pulseHtml}
        <div class="w-full h-full rounded-full flex items-center justify-center shadow-lg border-2 transition-transform duration-200" 
             style="background: #0f172a; border-color: ${color}; color: ${color};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/>
            <rect width="14" height="12" x="2" y="6" rx="2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const createAlertIcon = (severity: TrafficAlert['severity']) => {
  const color = severity === 'critical' ? '#ef4444' : '#f59e0b';
  return L.divIcon({
    className: 'relative flex items-center justify-center',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="absolute -inset-1 rounded-full bg-red-500/50 animate-ping"></span>
        <div class="w-8 h-8 rounded-full bg-red-950 border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg"
             style="border-color: ${color}; color: ${color};">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

export const CityMap: React.FC<CityMapProps> = ({
  cameras = [],
  selectedCameraId,
  onSelectCamera,
  activeTrajectory,
  alerts = [],
  showHeatmap: initialShowHeatmap = false,
  center: initialCenter = [17.4300, 78.4100],
  zoom: initialZoom = 13
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Basemap & View State
  const [activeBasemap, setActiveBasemap] = useState<BasemapType>('dark');
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const [mapZoom, setMapZoom] = useState<number>(initialZoom);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: initialCenter[0],
    lng: initialCenter[1],
    zoom: initialZoom
  });

  // Synchronize when initialCenter or initialZoom changes from outside (e.g. city selector)
  useEffect(() => {
    setMapCenter(initialCenter);
    setMapZoom(initialZoom);
  }, [initialCenter[0], initialCenter[1], initialZoom]);

  // Layer Toggles
  const [showCameras, setShowCameras] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(initialShowHeatmap);
  const [showTrajectory, setShowTrajectory] = useState(true);

  // Custom coordinate input state
  const [showCoordDialog, setShowCoordDialog] = useState(false);
  const [inputLat, setInputLat] = useState('');
  const [inputLng, setInputLng] = useState('');

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Locate User (Browser Geolocation API)
  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
          setMapZoom(14);
        },
        (err) => {
          alert(`Location access denied or unavailable: ${err.message}`);
        },
        { timeout: 10000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Jump to Custom Coordinates
  const handleJumpToCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setMapCenter([lat, lng]);
      setMapZoom(14);
      setShowCoordDialog(false);
      setInputLat('');
      setInputLng('');
    } else {
      alert('Please enter valid coordinates (-90 to 90 for Lat, -180 to 180 for Lng)');
    }
  };

  const selectedProvider = BASEMAP_PROVIDERS[activeBasemap];

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col ${
        isFullscreen ? 'p-0 fixed inset-0 z-[9999]' : ''
      }`}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex items-center justify-between gap-2 pointer-events-none overflow-x-auto no-scrollbar pb-1">
        {/* Left Side: Basemap Switcher & Global Presets */}
        <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-2xl pointer-events-auto shrink-0">
          {/* Basemap Switcher Pills */}
          <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
            <span className="text-[10px] font-mono text-cyan-400 font-bold px-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              GIS:
            </span>
            {(['dark', 'satellite', 'streets', 'voyager'] as BasemapType[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveBasemap(key)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                  activeBasemap === key
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={BASEMAP_PROVIDERS[key].name}
              >
                {key === 'dark' ? 'Dark' : key === 'satellite' ? 'Satellite' : key === 'streets' ? 'Streets' : 'World Streets'}
              </button>
            ))}
          </div>

          {/* Global City Presets Selector */}
          <div className="flex items-center gap-1 pl-1">
            <Globe className="w-3.5 h-3.5 text-cyan-400 ml-1" />
            <select
              onChange={(e) => {
                const preset = GLOBAL_PRESETS.find((p) => p.name === e.target.value);
                if (preset) {
                  setMapCenter(preset.coords);
                  setMapZoom(preset.zoom);
                }
              }}
              value={
                GLOBAL_PRESETS.find(
                  (p) => p.coords[0] === mapCenter[0] && p.coords[1] === mapCenter[1]
                )?.name || 'Custom'
              }
              className="bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[190px] sm:max-w-[240px]"
            >
              <optgroup label="📍 Andhra Pradesh Popular Maps" className="bg-slate-900 text-cyan-400 font-bold">
                {GLOBAL_PRESETS.filter((p) => p.category === 'Andhra Pradesh Popular Maps').map((p) => (
                  <option key={p.name} value={p.name} className="text-slate-200 font-normal">
                    {p.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🇮🇳 National & Regional Hubs" className="bg-slate-900 text-amber-400 font-bold">
                {GLOBAL_PRESETS.filter((p) => p.category === 'National Hubs').map((p) => (
                  <option key={p.name} value={p.name} className="text-slate-200 font-normal">
                    {p.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🌍 Global Metros" className="bg-slate-900 text-purple-400 font-bold">
                {GLOBAL_PRESETS.filter((p) => p.category === 'Global Metros').map((p) => (
                  <option key={p.name} value={p.name} className="text-slate-200 font-normal">
                    {p.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Quick Andhra Pradesh 1-Click Jump Pills */}
          <div className="hidden 2xl:flex items-center gap-1 pl-1 border-l border-slate-800">
            {[
              { label: 'Vijayawada', coords: [16.5062, 80.6480] as [number, number], zoom: 13 },
              { label: 'Eluru', coords: [16.7107, 81.0952] as [number, number], zoom: 14 },
              { label: 'Rajahmundry', coords: [17.0005, 81.7750] as [number, number], zoom: 13 },
              { label: 'Vizag', coords: [17.6868, 83.2185] as [number, number], zoom: 13 }
            ].map((ap) => {
              const isCurrent = Math.abs(mapCenter[0] - ap.coords[0]) < 0.05 && Math.abs(mapCenter[1] - ap.coords[1]) < 0.05;
              return (
                <button
                  key={ap.label}
                  onClick={() => {
                    setMapCenter(ap.coords);
                    setMapZoom(ap.zoom);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                    isCurrent
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  title={`Jump to ${ap.label}, Andhra Pradesh`}
                >
                  {ap.label}
                </button>
              );
            })}
          </div>

          {/* Action Buttons: Geolocation & Coordinate Input */}
          <button
            onClick={handleLocateMe}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            title="Locate My Position (GPS)"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowCoordDialog(!showCoordDialog)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            title="Enter Custom Coordinates (Lat/Lng)"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setMapCenter(initialCenter);
              setMapZoom(initialZoom);
            }}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            title="Reset to Default Traffic Grid"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Side: Layer Controls & Fullscreen */}
        <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-2xl pointer-events-auto shrink-0">
          {/* Toggle Cameras */}
          <button
            onClick={() => setShowCameras(!showCameras)}
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
              showCameras
                ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle ANPR Camera Markers"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Cameras ({cameras.length})</span>
          </button>

          {/* Toggle Alerts */}
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
              showAlerts
                ? 'bg-slate-800 text-red-400 border border-red-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Incident & Anomaly Alerts"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>Alerts ({alerts.length})</span>
          </button>

          {/* Toggle Heatmap */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
              showHeatmap
                ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Congestion Heatmap"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Heatmap</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors border-l border-slate-800 pl-2"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Floating Custom Coordinates Popover Modal */}
      {showCoordDialog && (
        <div className="absolute top-16 left-3 z-[1100] bg-slate-900 border border-cyan-500/40 rounded-xl p-3 shadow-2xl w-64 space-y-2 font-mono text-xs animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between font-bold text-slate-200 border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Crosshair className="w-3.5 h-3.5" />
              Global Fly-To Coordinates
            </span>
            <button
              onClick={() => setShowCoordDialog(false)}
              className="text-slate-500 hover:text-slate-300 text-sm"
            >
              &times;
            </button>
          </div>
          <form onSubmit={handleJumpToCoords} className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Latitude (-90 to 90):</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 17.4300"
                value={inputLat}
                onChange={(e) => setInputLat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Longitude (-180 to 180):</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 78.4100"
                value={inputLng}
                onChange={(e) => setInputLng(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
            >
              Navigate to Location
            </button>
          </form>
        </div>
      )}

      {/* Floating HUD: Real-time Cursor Coordinates & Zoom (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300 shadow-xl flex items-center gap-3">
        <div className="flex items-center gap-1 text-cyan-400">
          <Crosshair className="w-3 h-3" />
          <span>WGS84</span>
        </div>
        <div>
          Lat: <span className="text-slate-100 font-semibold">{hoverCoords.lat}°</span>
        </div>
        <div>
          Lng: <span className="text-slate-100 font-semibold">{hoverCoords.lng}°</span>
        </div>
        <div>
          Zoom: <span className="text-cyan-400 font-bold">{hoverCoords.zoom}x</span>
        </div>
        <div className="hidden sm:inline text-emerald-400 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
          No Billing Key Needed
        </div>
      </div>

      {/* Main Interactive Map Container with Fluid 360 Drag & Pan */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
        zoomControl={false}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing min-h-[460px]"
      >
        <MapController
          targetCenter={mapCenter}
          targetZoom={mapZoom}
          onCoordinatesChange={(lat, lng, zoom) => setHoverCoords({ lat, lng, zoom })}
          onUserMovedMap={(newCenter, newZoom) => {
            setMapCenter(newCenter);
            setMapZoom(newZoom);
          }}
        />

        {/* Dedicated 4-Way Directional Mouse Pan (Upside-Down / Left-Right) & Zoom Pad */}
        <MapNavigationPanWidget
          onRecenter={() => {
            setMapCenter(initialCenter);
            setMapZoom(initialZoom);
          }}
        />

        {/* Dynamic Free Open GIS Basemap Tile Layer */}
        <TileLayer
          key={activeBasemap}
          attribution={selectedProvider.attribution}
          url={selectedProvider.url}
          maxZoom={selectedProvider.maxZoom}
        />
        {selectedProvider.overlayUrl && (
          <TileLayer
            key={`${activeBasemap}-overlay`}
            url={selectedProvider.overlayUrl}
            maxZoom={selectedProvider.maxZoom}
          />
        )}

        {/* Heatmap Overlay Simulation */}
        {showHeatmap &&
          cameras.map((cam) => (
            <CircleMarker
              key={`heat-${cam.id}`}
              center={[cam.lat, cam.lng]}
              radius={35}
              pathOptions={{
                fillColor:
                  cam.totalDetectionsToday > 60000
                    ? '#ef4444'
                    : cam.totalDetectionsToday > 45000
                    ? '#f59e0b'
                    : '#06b6d4',
                fillOpacity: 0.35,
                stroke: false
              }}
            />
          ))}

        {/* Active Trajectory Line & Checkpoints */}
        {showTrajectory && activeTrajectory && activeTrajectory.pathCoordinates && activeTrajectory.pathCoordinates.length > 0 && (
          <>
            <Polyline
              positions={activeTrajectory.pathCoordinates}
              pathOptions={{
                color: '#06b6d4',
                weight: 5,
                opacity: 0.9,
                dashArray: '10, 8'
              }}
            />
            {(activeTrajectory.checkpoints || []).map((cp, idx) => (
              <CircleMarker
                key={`cp-${idx}`}
                center={[cp.lat, cp.lng]}
                radius={8}
                pathOptions={{
                  fillColor: '#38bdf8',
                  fillOpacity: 1,
                  color: '#0f172a',
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs font-mono">
                    <div className="font-bold text-cyan-400 flex items-center justify-between border-b border-slate-700 pb-1">
                      <span>Checkpoint #{idx + 1}</span>
                      <span className="text-[10px] text-slate-400">{cp.timestamp}</span>
                    </div>
                    <div className="text-slate-200 font-semibold">{cp.locationName}</div>
                    <div className="text-slate-400 flex justify-between text-[11px]">
                      <span>Speed: {cp.speedKmh} km/h</span>
                      <span>Conf: {cp.confidence}%</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        )}

        {/* Camera Node Markers */}
        {showCameras &&
          cameras.map((cam) => (
            <Marker
              key={cam.id}
              position={[cam.lat, cam.lng]}
              icon={createCameraIcon(cam.status, selectedCameraId === cam.id)}
              eventHandlers={{
                click: () => onSelectCamera?.(cam.id)
              }}
            >
              <Popup>
                <div className="p-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold border-b border-slate-700 pb-1 font-mono">
                    <span className="text-cyan-400">{cam.id}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        cam.status === 'online'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {cam.status}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-100">{cam.locationName}</div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-300">
                    <div>
                      Model: <span className="text-slate-100">{cam.model}</span>
                    </div>
                    <div>
                      FPS: <span className="text-emerald-400">{cam.fps}</span>
                    </div>
                    <div className="col-span-2">
                      Detections Today:{' '}
                      <span className="text-cyan-400 font-bold">
                        {cam.totalDetectionsToday.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {onSelectCamera && (
                    <button
                      onClick={() => onSelectCamera(cam.id)}
                      className="w-full mt-2 py-1 px-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] transition-colors flex items-center justify-center gap-1"
                    >
                      <Video className="w-3 h-3" />
                      Inspect Camera Stream
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Active Alert Markers */}
        {showAlerts &&
          alerts
            .filter((a) => a.status !== 'resolved')
            .map((alert) => (
              <Marker
                key={`alt-${alert.id}`}
                position={[alert.lat, alert.lng]}
                icon={createAlertIcon(alert.severity)}
              >
                <Popup>
                  <div className="p-1 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1 font-mono">
                      <span className="text-red-400 font-bold">{alert.id}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase">
                        {alert.severity}
                      </span>
                    </div>
                    <div className="font-bold text-slate-100">{alert.title}</div>
                    <div className="text-slate-300 text-[11px] line-clamp-2">{alert.details}</div>
                    {alert.plateNumber !== 'N/A' && (
                      <div className="text-cyan-400 font-mono text-[11px] font-bold">
                        Target Plate: {alert.plateNumber}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
      </MapContainer>
    </div>
  );
};

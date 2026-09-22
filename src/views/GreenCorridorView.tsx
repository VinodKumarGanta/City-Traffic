import React, { useState, useEffect } from 'react';
import { 
  Siren, 
  HeartHandshake, 
  Flame, 
  ShieldAlert, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Play, 
  Square, 
  Volume2, 
  Radio, 
  Navigation, 
  Activity, 
  Zap,
  AlertCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { dbService } from '../services/dbService';
import { GreenCorridorState, CameraNode } from '../types/traffic';
import { audioAlertService } from '../services/audioAlertService';

interface GreenCorridorViewProps {
  cameras: CameraNode[];
}

export const GreenCorridorView: React.FC<GreenCorridorViewProps> = ({ cameras }) => {
  const [corridorsDict, setCorridorsDict] = useState<Record<string, GreenCorridorState>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('vja_hospital');
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    dbService.getGreenCorridors().then(dict => {
      if (!isMounted) return;
      setCorridorsDict(dict);
      const keys = Object.keys(dict);
      if (keys.length > 0 && !dict[selectedPreset]) {
        setSelectedPreset(keys[0]);
      }
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const corridorState: GreenCorridorState | undefined = corridorsDict[selectedPreset] || Object.values(corridorsDict)[0];

  // Switch preset
  const handleSelectPreset = (key: string) => {
    if (corridorState?.active) {
      setCorridorsDict(prev => ({
        ...prev,
        [selectedPreset]: { ...prev[selectedPreset], active: false }
      }));
      dbService.toggleGreenCorridor(selectedPreset, false);
    }
    setSelectedPreset(key);
    setCurrentStepIndex(0);
    audioAlertService.playChime();
  };

  // Toggle Activation
  const handleToggleCorridor = () => {
    if (!corridorState) return;
    const nextActive = !corridorState.active;
    setCorridorsDict(prev => ({
      ...prev,
      [selectedPreset]: {
        ...prev[selectedPreset],
        active: nextActive,
        activatedAt: nextActive ? new Date().toLocaleTimeString() : undefined
      }
    }));

    dbService.toggleGreenCorridor(selectedPreset, nextActive);

    if (nextActive) {
      audioAlertService.playEmergencySiren();
      audioAlertService.speakAlert(`Priority Green Corridor activated for ${corridorState.hospitalName}. All signals preempted.`);
    } else {
      audioAlertService.playChime();
      audioAlertService.speakAlert('Green Corridor deactivated. Normal traffic signal cycles resumed.');
    }
  };

  // Simulate vehicle progress when active
  useEffect(() => {
    if (!corridorState?.active || !corridorState.pathCoordinates.length) return;
    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= corridorState.pathCoordinates.length - 1) {
          return 0; // loop simulation
        }
        return prev + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [corridorState?.active, corridorState?.pathCoordinates.length]);

  if (loading) {
    return (
      <div className="p-16 text-center bg-slate-900/90 border border-slate-800 rounded-xl m-4 max-w-[1920px] mx-auto">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-mono text-slate-400">Loading Green Corridors from PostgreSQL...</p>
      </div>
    );
  }

  if (!corridorState || Object.keys(corridorsDict).length === 0) {
    return (
      <div className="p-16 text-center bg-slate-900/90 border border-slate-800 rounded-xl space-y-3 m-4 max-w-[1920px] mx-auto">
        <AlertCircle className="w-10 h-10 text-emerald-400 mx-auto" />
        <h3 className="text-sm font-bold text-slate-200">No Preconfigured Green Corridors</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          No emergency corridors are currently registered in the database. Emergency corridors can be provisioned through the command center API.
        </p>
      </div>
    );
  }

  const currentCoords = corridorState.pathCoordinates[currentStepIndex] || corridorState.pathCoordinates[0] || [16.5062, 80.6480];
  const centerLat = corridorState.pathCoordinates[0]?.[0] || 16.5062;
  const centerLng = corridorState.pathCoordinates[0]?.[1] || 80.6480;

  // Custom Leaflet DivIcon for emergency vehicle
  const ambulanceIcon = L.divIcon({
    className: 'emergency-marker',
    html: `
      <div style="
        background: #ef4444;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 15px #ef4444;
        animation: pulse 1s infinite;
      ">
        <span style="font-size: 16px;">🚑</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const hospitalIcon = L.divIcon({
    className: 'hospital-marker',
    html: `
      <div style="
        background: #10b981;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px #10b981;
      ">
        <span style="font-size: 14px;">🏥</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  return (
    <div className="p-4 space-y-5 max-w-[1920px] mx-auto text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/80 via-slate-950 to-emerald-950/40 border border-slate-800 p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1">
                <Siren className="w-3.5 h-3.5 animate-spin" />
                Emergency Priority Protocol
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                108 Emergency Medical Services & Fire Command (PostgreSQL Live)
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Emergency &quot;Green Corridor&quot; Priority Dispatcher</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Automated smart traffic signal preemption for critical patient transit, organ transplant transport, and fire rescues.
            </p>
          </div>

          <button
            onClick={handleToggleCorridor}
            className={`px-6 py-3 rounded-xl font-bold font-mono text-xs flex items-center gap-2 shadow-2xl transition-all ${
              corridorState.active
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/60 ring-4 ring-red-500/30 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/60'
            }`}
          >
            {corridorState.active ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>TERMINATE GREEN CORRIDOR</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>ACTIVATE GREEN CORRIDOR</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Object.entries(corridorsDict).map(([key, cor]) => (
          <button
            key={key}
            onClick={() => handleSelectPreset(key)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all shrink-0 ${
              selectedPreset === key
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-lg'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>🚑 {cor.originName} → {cor.hospitalName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">-{cor.timeSavedMin}m saved</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Control & Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Telemetry & Status (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Status Badge */}
          <div className={`p-4 rounded-2xl border transition-all ${
            corridorState.active
              ? 'bg-emerald-950/60 border-emerald-500/60 shadow-xl shadow-emerald-950/40'
              : 'bg-slate-900/90 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${corridorState.active ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  {corridorState.active ? 'CORRIDOR PRIORITY: ENGAGED' : 'CORRIDOR PRIORITY: STANDBY'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Unit: {corridorState.unitId}</span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="text-slate-400">Destination Facility:</div>
              <div className="text-base font-bold text-white flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-red-400" />
                <span>{corridorState.hospitalName}</span>
              </div>
            </div>
          </div>

          {/* Time Saved Comparison Cards */}
          <div className="grid grid-cols-3 gap-2.5 font-mono text-center">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-500">Normal Transit</div>
              <div className="text-base font-bold text-slate-300">{corridorState.normalDurationMin} min</div>
              <div className="text-[9px] text-red-400">Standard Traffic</div>
            </div>

            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl">
              <div className="text-[10px] text-emerald-400">Green Priority</div>
              <div className="text-lg font-black text-emerald-300">{corridorState.priorityDurationMin} min</div>
              <div className="text-[9px] text-emerald-400">Preempted Signals</div>
            </div>

            <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 rounded-xl">
              <div className="text-[10px] text-cyan-400">Life Saved Delta</div>
              <div className="text-lg font-black text-cyan-300">-{corridorState.timeSavedMin} min</div>
              <div className="text-[9px] text-cyan-400">Delay Avoided</div>
            </div>
          </div>

          {/* Intersections Signal Preemption List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Signal Preemption Sequence
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {corridorState.clearedNodeIds.length} Nodes Synchronized
              </span>
            </div>

            <div className="space-y-2">
              {corridorState.clearedNodeIds.map((camId, index) => {
                const cam = cameras.find(c => c.id === camId);
                return (
                  <div 
                    key={camId}
                    className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] text-cyan-400 font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-slate-200 font-sans font-bold text-[11px]">{cam?.locationName || camId}</div>
                        <div className="text-[10px] text-slate-500">{camId}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        corridorState.active 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                          : 'bg-slate-900 text-slate-400'
                      }`}>
                        {corridorState.active ? '🟢 CONTINUOUS GREEN' : '⚪ STANDARD CYCLE'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Live Corridor Map (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Live GIS Route & Vehicle Tracking
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">
              ESRI Dark Canvas GIS Map
            </span>
          </div>

          <div className="h-[460px] rounded-xl overflow-hidden border border-slate-800 relative">
            <MapContainer
              key={`${centerLat}-${centerLng}`}
              center={[centerLat, centerLng]}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              {/* Free, unwatermarked ESRI Dark Canvas */}
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                attribution="&copy; Esri, HERE, Garmin"
                maxZoom={18}
              />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
              />

              {/* Corridor Path Polyline */}
              <Polyline
                positions={corridorState.pathCoordinates}
                color={corridorState.active ? '#10b981' : '#06b6d4'}
                weight={corridorState.active ? 6 : 4}
                opacity={0.9}
                dashArray={corridorState.active ? undefined : '5, 10'}
              />

              {/* Destination Hospital Marker */}
              {corridorState.pathCoordinates.length > 0 && (
                <Marker 
                  position={corridorState.pathCoordinates[corridorState.pathCoordinates.length - 1]} 
                  icon={hospitalIcon}
                >
                  <Popup>
                    <div className="text-xs font-sans">
                      <strong>{corridorState.hospitalName}</strong>
                      <div className="text-emerald-600 font-bold">Emergency Trauma Entry</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Moving Emergency Vehicle Marker */}
              <Marker position={currentCoords} icon={ambulanceIcon}>
                <Popup>
                  <div className="text-xs font-sans">
                    <strong>{corridorState.unitId}</strong>
                    <div>Speed: 64 km/h</div>
                    <div className="text-red-600 font-bold">Priority Active</div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Map Overlay Indicator */}
            <div className="absolute top-3 right-3 z-[400] bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${corridorState.active ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
              <span>{corridorState.active ? 'GREEN CORRIDOR BROADCASTING' : 'READY TO PREEMPT'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

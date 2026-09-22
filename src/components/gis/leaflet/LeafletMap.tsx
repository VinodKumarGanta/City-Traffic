import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Video } from 'lucide-react';
import { CameraNode, TrafficAlert } from '../../../types/traffic';
import { TrafficMapProps, BasemapType } from '../types';
import { MapToolbar } from '../MapToolbar';
import { HeatCanvasLayer } from './HeatCanvasLayer';

const BASEMAPS: Record<BasemapType, { url: string; overlayUrl?: string; attribution: string; maxZoom: number }> = {
  dark: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    maxZoom: 16,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar',
    maxZoom: 19,
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  },
  voyager: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    maxZoom: 19,
  },
};

function iconForCamera(status: CameraNode['status'], selected: boolean) {
  const color = status === 'online' ? '#06b6d4' : status === 'warning' ? '#f59e0b' : '#ef4444';
  const size = selected ? 32 : 24;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:#0f172a;border:2px solid ${color};display:flex;align-items:center;justify-content:center;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function iconForAlert(severity: TrafficAlert['severity']) {
  const color = severity === 'critical' ? '#ef4444' : '#f59e0b';
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:#1c1917;border:2px solid ${color}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function clusterCameras(cameras: CameraNode[], zoom: number) {
  if (zoom >= 14) return cameras.map((c) => ({ kind: 'single' as const, camera: c }));
  const cell = zoom >= 12 ? 0.02 : 0.05;
  const buckets = new Map<string, CameraNode[]>();
  cameras.forEach((c) => {
    const key = `${Math.round(c.lat / cell)}_${Math.round(c.lng / cell)}`;
    const list = buckets.get(key) || [];
    list.push(c);
    buckets.set(key, list);
  });
  return [...buckets.values()].map((list) =>
    list.length === 1
      ? { kind: 'single' as const, camera: list[0] }
      : {
          kind: 'cluster' as const,
          lat: list.reduce((s, c) => s + c.lat, 0) / list.length,
          lng: list.reduce((s, c) => s + c.lng, 0) / list.length,
          count: list.length,
          cameras: list,
        }
  );
}

const FlyTo: React.FC<{ center: [number, number]; zoom: number; nonce: number }> = ({
  center,
  zoom,
  nonce,
}) => {
  const map = useMap();
  useEffect(() => {
    if (nonce === 0) return;
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [nonce, center, zoom, map]);
  return null;
};

const ZoomTracker: React.FC<{ onZoom: (z: number) => void }> = ({ onZoom }) => {
  useMapEvents({
    zoomend(e) {
      onZoom(e.target.getZoom());
    },
  });
  return null;
};

export const LeafletMap: React.FC<TrafficMapProps> = ({
  cameras,
  selectedCameraId,
  onSelectCamera,
  activeTrajectory,
  alerts = [],
  showHeatmap: initialShowHeatmap = false,
  center: initialCenter = [17.43, 78.41],
  zoom: initialZoom = 13,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeBasemap, setActiveBasemap] = useState<BasemapType>('dark');
  const [showCameras, setShowCameras] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(initialShowHeatmap);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [flyNonce, setFlyNonce] = useState(0);
  const [target, setTarget] = useState({ center: initialCenter, zoom: initialZoom });
  const [zoom, setZoom] = useState(initialZoom);

  useEffect(() => {
    setTarget({ center: initialCenter, zoom: initialZoom });
    setFlyNonce((n) => n + 1);
  }, [initialCenter[0], initialCenter[1], initialZoom]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const provider = BASEMAPS[activeBasemap];
  const clustered = useMemo(() => clusterCameras(cameras, zoom), [cameras, zoom]);

  const HudBinder: React.FC = () => {
    const map = useMap();
    useEffect(() => {
      const handler = (e: L.LeafletMouseEvent) => {
        if (!hudRef.current) return;
        hudRef.current.textContent = `${e.latlng.lat.toFixed(4)}°, ${e.latlng.lng.toFixed(4)}° · z${map.getZoom()}`;
      };
      map.on('mousemove', handler);
      return () => {
        map.off('mousemove', handler);
      };
    }, [map]);
    return null;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 ${
        isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ''
      }`}
    >
      <MapToolbar
        activeBasemap={activeBasemap}
        onBasemap={setActiveBasemap}
        showCameras={showCameras}
        showAlerts={showAlerts}
        showHeatmap={showHeatmap}
        showTrajectory={showTrajectory}
        cameraCount={cameras.length}
        alertCount={alerts.filter((a) => a.status !== 'resolved').length}
        onToggleCameras={() => setShowCameras((v) => !v)}
        onToggleAlerts={() => setShowAlerts((v) => !v)}
        onToggleHeatmap={() => setShowHeatmap((v) => !v)}
        onToggleTrajectory={() => setShowTrajectory((v) => !v)}
        onLocate={() => {
          navigator.geolocation?.getCurrentPosition((pos) => {
            setTarget({ center: [pos.coords.latitude, pos.coords.longitude], zoom: 14 });
            setFlyNonce((n) => n + 1);
          });
        }}
        onReset={() => {
          setTarget({ center: initialCenter, zoom: initialZoom });
          setFlyNonce((n) => n + 1);
        }}
        isFullscreen={isFullscreen}
        onFullscreen={() => {
          if (!containerRef.current) return;
          if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(() => {});
          else document.exitFullscreen().catch(() => {});
        }}
        engineLabel="Leaflet"
      />

      <div
        ref={hudRef}
        className="absolute bottom-3 left-3 z-[1000] bg-slate-950/85 border border-slate-800 rounded px-2 py-1 text-[10px] font-mono text-slate-400"
      >
        WGS84
      </div>

      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        zoomControl={false}
        preferCanvas
        className="w-full h-full min-h-[420px]"
      >
        <FlyTo center={target.center} zoom={target.zoom} nonce={flyNonce} />
        <ZoomTracker onZoom={setZoom} />
        <HudBinder />
        <TileLayer key={activeBasemap} attribution={provider.attribution} url={provider.url} maxZoom={provider.maxZoom} />
        {provider.overlayUrl && (
          <TileLayer key={`${activeBasemap}-o`} url={provider.overlayUrl} maxZoom={provider.maxZoom} />
        )}
        {showHeatmap && <HeatCanvasLayer cameras={cameras} />}
        {showTrajectory && activeTrajectory && (
          <>
            <Polyline
              positions={activeTrajectory.pathCoordinates}
              pathOptions={{ color: '#06b6d4', weight: 4, opacity: 0.85 }}
            />
            {activeTrajectory.checkpoints.map((cp, idx) => (
              <CircleMarker
                key={`cp-${idx}`}
                center={[cp.lat, cp.lng]}
                radius={6}
                pathOptions={{ fillColor: '#38bdf8', fillOpacity: 1, color: '#0f172a', weight: 1 }}
              >
                <Popup>
                  <div className="text-xs">
                    {cp.locationName} · {cp.speedKmh} km/h
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        )}
        {showCameras &&
          clustered.map((item) =>
            item.kind === 'cluster' ? (
              <CircleMarker
                key={`cl-${item.lat}-${item.lng}`}
                center={[item.lat, item.lng]}
                radius={14}
                pathOptions={{ fillColor: '#0e7490', fillOpacity: 0.9, color: '#67e8f9', weight: 1 }}
                eventHandlers={{
                  click: () => onSelectCamera?.(item.cameras[0].id),
                }}
              >
                <Popup>
                  <div className="text-xs font-mono">{item.count} cameras</div>
                </Popup>
              </CircleMarker>
            ) : (
              <Marker
                key={item.camera.id}
                position={[item.camera.lat, item.camera.lng]}
                icon={iconForCamera(item.camera.status, selectedCameraId === item.camera.id)}
                eventHandlers={{ click: () => onSelectCamera?.(item.camera.id) }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <div className="font-mono text-cyan-400">{item.camera.id}</div>
                    <div>{item.camera.locationName}</div>
                    {onSelectCamera && (
                      <button
                        type="button"
                        className="mt-1 w-full py-1 rounded bg-cyan-600 text-white text-[11px] flex items-center justify-center gap-1"
                        onClick={() => onSelectCamera(item.camera.id)}
                      >
                        <Video className="w-3 h-3" /> Inspect
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          )}
        {showAlerts &&
          alerts
            .filter((a) => a.status !== 'resolved')
            .map((alert) => (
              <Marker key={alert.id} position={[alert.lat, alert.lng]} icon={iconForAlert(alert.severity)}>
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">{alert.title}</div>
                    <div className="text-slate-400">{alert.details}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
      </MapContainer>
    </div>
  );
};

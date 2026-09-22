import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { CameraNode } from '../../../types/traffic';

interface HeatCanvasLayerProps {
  cameras: CameraNode[];
}

export function HeatCanvasLayer({ cameras }: HeatCanvasLayerProps) {
  const map = useMap();

  useEffect(() => {
    const canvas = L.DomUtil.create('canvas', 'leaflet-zoom-animated') as HTMLCanvasElement;
    canvas.style.pointerEvents = 'none';
    const pane = map.getPanes().overlayPane;
    pane.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const redraw = () => {
      if (!ctx) return;
      const size = map.getSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size.x * dpr;
      canvas.height = size.y * dpr;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.x, size.y);

      const maxDet = Math.max(1, ...cameras.map((c) => c.totalDetectionsToday || 1));
      cameras.forEach((cam) => {
        const p = map.latLngToContainerPoint([cam.lat, cam.lng]);
        const w = Math.min(1, (cam.totalDetectionsToday || 0) / maxDet);
        const r = 28 + w * 36;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        if (w > 0.7) {
          g.addColorStop(0, 'rgba(239,68,68,0.45)');
          g.addColorStop(1, 'rgba(239,68,68,0)');
        } else if (w > 0.4) {
          g.addColorStop(0, 'rgba(245,158,11,0.4)');
          g.addColorStop(1, 'rgba(245,158,11,0)');
        } else {
          g.addColorStop(0, 'rgba(6,182,212,0.35)');
          g.addColorStop(1, 'rgba(6,182,212,0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    map.on('moveend zoomend resize', redraw);
    redraw();
    return () => {
      map.off('moveend zoomend resize', redraw);
      pane.removeChild(canvas);
    };
  }, [map, cameras]);

  return null;
}

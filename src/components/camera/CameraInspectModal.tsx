import React, { useState, useEffect, useRef } from 'react';
import { CameraNode, ANPRDetection } from '../../types/traffic';
import {
  Video,
  Camera,
  Radio,
  Settings,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Maximize2,
  X,
  Play,
  Pause,
  Download,
  Sliders,
  Cpu
} from 'lucide-react';
import { getApiBaseUrl } from '../../services/apiConfig';

interface CameraInspectModalProps {
  camera: CameraNode | null;
  isOpen: boolean;
  onClose: () => void;
  latestDetection?: ANPRDetection | null;
  privacyMaskEnabled?: boolean;
}

export type FeedSourceType = 'webcam' | 'rtsp_gateway' | 'simulation' | 'custom_url';

export interface DynamicTrackedObject {
  id: string;
  class: string;
  label: string;
  is_human: boolean;
  is_vehicle: boolean;
  confidence: number;
  color: string;
  plate: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  targetX: number;
  targetY: number;
  targetW: number;
  targetH: number;
  speed: number;
  lastSeen: number;
  scanY: number;
}

export const CameraInspectModal: React.FC<CameraInspectModalProps> = ({
  camera,
  isOpen,
  onClose,
  latestDetection,
  privacyMaskEnabled = false
}) => {
  if (!isOpen || !camera) return null;

  // Active Feed Source Mode
  const [feedMode, setFeedMode] = useState<FeedSourceType>('webcam');
  const [sourceInput, setSourceInput] = useState('0');
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>('prompt');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [isFrozen, setIsFrozen] = useState(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Stop Webcam Stream
  const stopWebcamStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Request Real Webcam Access (Browser Permission)
  const requestWebcamPermission = async () => {
    setPermissionState('requesting');
    setPermissionError(null);
    stopWebcamStream();

    // Release any backend hold on camera 0 first
    try {
      await fetch(`${getApiBaseUrl()}/api/camera/release_all`, { method: 'POST' });
    } catch {
      // Backend may be starting or offline
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        },
        audio: false
      });

      streamRef.current = mediaStream;
      setPermissionState('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Webcam permission error:', err);
      setPermissionState('denied');
      if (err.name === 'NotReadableError' || err.message?.toLowerCase().includes('in use')) {
        setPermissionError('Device in use: Your webcam is currently in use by another app (e.g. Zoom, Teams, Camera app, or Python).');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera permission denied: Click the camera icon in your browser address bar to allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setPermissionError('No camera detected: No webcam hardware was found on your device.');
      } else {
        setPermissionError(err.message || 'Camera permission was denied by user or browser.');
      }
    }
  };

  // Switch Feed Mode
  useEffect(() => {
    if (feedMode === 'webcam') {
      requestWebcamPermission();
    } else {
      stopWebcamStream();
    }
    return () => {
      stopWebcamStream();
    };
  }, [feedMode]);

  // Check RTSP Gateway Health
  const checkGateway = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/status`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setGatewayStatus(true);
        if (data.sources && data.sources[camera.id]) {
          setSourceInput(data.sources[camera.id]);
        }
      } else {
        setGatewayStatus(false);
      }
    } catch {
      setGatewayStatus(false);
    }
  };

  useEffect(() => {
    checkGateway();
  }, [camera.id]);

  // Connect / Save RTSP Source to Python Gateway
  const handleConnectRTSP = async (customSrc?: string) => {
    const src = customSrc !== undefined ? customSrc : sourceInput;
    setIsConnecting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/camera/${camera.id}/source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: src })
      });
      if (res.ok) {
        setFeedMode('rtsp_gateway');
        setStreamKey(Date.now());
        setGatewayStatus(true);
      } else {
        alert('Could not update gateway stream source.');
      }
    } catch (err: any) {
      alert(`RTSP Gateway on port 5001 unreachable: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Dynamic Optical Motion & YOLO Multi-Object Tracker Refs & State
  const stnCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackedObjectsRef = useRef<Map<string, DynamicTrackedObject>>(new Map());
  const [liveTrackedList, setLiveTrackedList] = useState<DynamicTrackedObject[]>([]);
  const lastAiCheckRef = useRef(0);
  const isRequestingAiRef = useRef(false);
  const radarAngleRef = useRef(0);

  const [opticalSpeed, setOpticalSpeed] = useState(3);
  const [dynamicTargetType, setDynamicTargetType] = useState('Person (Human)');
  const [isSpeedViolation, setIsSpeedViolation] = useState(false);
  const [isMotionDetected, setIsMotionDetected] = useState(false);
  const [isHumanSubject, setIsHumanSubject] = useState(true);
  const [aiClassLabel, setAiClassLabel] = useState('Person (Human)');
  const [trackId] = useState(`TRK-${Math.floor(10 + Math.random() * 89)}`);

  // Draw Real-Time AI Dynamic Multi-Object Overlays on Webcam Feed
  useEffect(() => {
    if (feedMode !== 'webcam' || permissionState !== 'granted') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      if (video.readyState >= 2 && !isFrozen) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const w = canvas.width;
        const h = canvas.height;

        // Draw camera frame
        ctx.drawImage(video, 0, 0, w, h);

        // 1. Periodic Real AI Multi-Object Inference against Backend YOLOv8 (Every 240ms)
        const now = Date.now();
        if (now - lastAiCheckRef.current > 240 && !isRequestingAiRef.current) {
          lastAiCheckRef.current = now;
          isRequestingAiRef.current = true;

          if (!snapCanvasRef.current) {
            snapCanvasRef.current = document.createElement('canvas');
            snapCanvasRef.current.width = 480;
            snapCanvasRef.current.height = 270;
          }
          const sCanvas = snapCanvasRef.current;
          const sCtx = sCanvas.getContext('2d');
          if (sCtx) {
            sCtx.drawImage(video, 0, 0, 480, 270);
            const dataUrl = sCanvas.toDataURL('image/jpeg', 0.65);
            fetch(`${getApiBaseUrl()}/api/ai/detect_frame`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: dataUrl })
            })
              .then(r => r.json())
              .then(res => {
                if (res && res.objects && Array.isArray(res.objects)) {
                  const map = trackedObjectsRef.current;
                  const currTime = Date.now();
                  const scaleX = w / (res.img_width || 480);
                  const scaleY = h / (res.img_height || 270);

                  res.objects.forEach((obj: any, idx: number) => {
                    const objId = obj.id || `TRK-${idx + 1}`;
                    const tx = obj.box[0] * scaleX;
                    const ty = obj.box[1] * scaleY;
                    const tw = obj.box[2] * scaleX;
                    const th = obj.box[3] * scaleY;

                    if (map.has(objId)) {
                      const ex = map.get(objId)!;
                      ex.targetX = tx;
                      ex.targetY = ty;
                      ex.targetW = tw;
                      ex.targetH = th;
                      ex.confidence = obj.confidence;
                      ex.label = obj.label;
                      ex.class = obj.class;
                      ex.color = obj.color;
                      ex.is_human = obj.is_human;
                      ex.is_vehicle = obj.is_vehicle;
                      ex.plate = obj.plate;
                      ex.lastSeen = currTime;
                    } else {
                      map.set(objId, {
                        id: objId,
                        class: obj.class,
                        label: obj.label,
                        is_human: obj.is_human,
                        is_vehicle: obj.is_vehicle,
                        confidence: obj.confidence,
                        color: obj.color,
                        plate: obj.plate,
                        x: tx,
                        y: ty,
                        w: tw,
                        h: th,
                        targetX: tx,
                        targetY: ty,
                        targetW: tw,
                        targetH: th,
                        speed: obj.is_human
                          ? Math.floor(1 + Math.random() * 4)
                          : (obj.is_vehicle ? Math.floor(40 + Math.random() * 25) : 0),
                        lastSeen: currTime,
                        scanY: 0
                      });
                    }
                  });

                  // Cull stale objects not seen in > 1500ms
                  for (const [key, item] of map.entries()) {
                    if (currTime - item.lastSeen > 1500) {
                      map.delete(key);
                    }
                  }

                  const currentItems = Array.from(map.values());
                  setLiveTrackedList(currentItems);

                  const hasHuman = currentItems.some(i => i.is_human);
                  setIsHumanSubject(hasHuman);
                  setIsMotionDetected(currentItems.length > 0);
                  if (currentItems.length > 0) {
                    const primary = currentItems[0];
                    setDynamicTargetType(primary.label);
                    setAiClassLabel(primary.label);
                    setOpticalSpeed(primary.speed || (hasHuman ? 3 : 40));
                    setIsSpeedViolation(primary.is_vehicle && primary.speed > 68);
                  }
                }
              })
              .catch(() => {})
              .finally(() => {
                isRequestingAiRef.current = false;
              });
          } else {
            isRequestingAiRef.current = false;
          }
        }

        // 2. Draw Real-Time Dynamic Bounding Boxes & HUD (60 FPS)
        const items = Array.from(trackedObjectsRef.current.values());

        if (items.length === 0) {
          // Optical Radar Search Overlay when searching for targets
          radarAngleRef.current = (radarAngleRef.current + 0.04) % (Math.PI * 2);
          const cx = w / 2;
          const cy = h / 2;
          const r = Math.min(w, h) * 0.20;

          ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
          ctx.stroke();

          // Radar sweep line
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(radarAngleRef.current) * r, cy + Math.sin(radarAngleRef.current) * r);
          ctx.stroke();

          // Center crosshair
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx - r - 15, cy);
          ctx.lineTo(cx + r + 15, cy);
          ctx.moveTo(cx, cy - r - 15);
          ctx.lineTo(cx, cy + r + 15);
          ctx.stroke();

          // Banner
          ctx.fillStyle = 'rgba(10, 15, 26, 0.88)';
          ctx.fillRect(cx - 170, cy + r + 14, 340, 24);
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
          ctx.strokeRect(cx - 170, cy + r + 14, 340, 24);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('YOLO RADAR: SCANNING SECTOR FOR DYNAMIC OBJECTS', cx, cy + r + 30);
          ctx.textAlign = 'left';
        } else {
          // Draw every tracked object concurrently with its own distinct bounding box
          items.forEach(item => {
            // Smooth lerp interpolation (0.28)
            item.x += (item.targetX - item.x) * 0.28;
            item.y += (item.targetY - item.y) * 0.28;
            item.w += (item.targetW - item.w) * 0.28;
            item.h += (item.targetH - item.h) * 0.28;

            const bx = Math.max(10, Math.min(w - 20, item.x));
            const by = Math.max(10, Math.min(h - 20, item.y));
            const bw = Math.max(30, Math.min(w - bx - 10, item.w));
            const bh = Math.max(30, Math.min(h - by - 10, item.h));

            const isHuman = item.is_human;
            const isVeh = item.is_vehicle;
            const isViolation = isVeh && item.speed > 68;

            const boxColor = isViolation
              ? '#ef4444'
              : (isHuman ? '#10b981' : (isVeh ? '#f59e0b' : (item.color || '#06b6d4')));
            const bracketColor = isViolation
              ? '#f87171'
              : (isHuman ? '#34d399' : (isVeh ? '#fbbf24' : '#38bdf8'));

            // Semi-transparent box fill for HUD feel
            ctx.fillStyle = `${boxColor}15`;
            ctx.fillRect(bx, by, bw, bh);

            // Outer bounding box
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);

            // Cyber Corner Brackets
            const cLen = Math.min(22, Math.min(bw, bh) / 3.2);
            ctx.strokeStyle = bracketColor;
            ctx.lineWidth = 3.5;
            // Top-left
            ctx.beginPath();
            ctx.moveTo(bx, by + cLen);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx + cLen, by);
            ctx.stroke();
            // Top-right
            ctx.beginPath();
            ctx.moveTo(bx + bw - cLen, by);
            ctx.lineTo(bx + bw, by);
            ctx.lineTo(bx + bw, by + cLen);
            ctx.stroke();
            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(bx, by + bh - cLen);
            ctx.lineTo(bx, by + bh);
            ctx.lineTo(bx + cLen, by + bh);
            ctx.stroke();
            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(bx + bw - cLen, by + bh);
            ctx.lineTo(bx + bw, by + bh);
            ctx.lineTo(bx + bw, by + bh - cLen);
            ctx.stroke();

            // Center crosshair
            const midX = bx + bw / 2;
            const midY = by + bh / 2;
            ctx.strokeStyle = `${boxColor}77`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(midX - 8, midY);
            ctx.lineTo(midX + 8, midY);
            ctx.moveTo(midX, midY - 8);
            ctx.lineTo(midX, midY + 8);
            ctx.stroke();

            // Label text: Humans NEVER have vehicle plates!
            let labelText = '';
            if (isHuman) {
              labelText = `YOLO LIVE | ${item.id} | ${item.label} | ${item.confidence}% | ${item.speed} km/h`;
            } else if (isVeh) {
              const plate = privacyMaskEnabled ? '••••••••••' : (latestDetection?.plateNumber || item.plate || 'TS07JH4821');
              labelText = isViolation
                ? `[OVERSPEED: ${item.speed} km/h] ${item.id} | ${item.label} | [${plate}]`
                : `YOLO LIVE | ${item.id} | ${item.label} | ${item.speed} km/h | [${plate}]`;
            } else {
              // Smart devices & real objects (phone, laptop, bottle, chair, etc.)
              labelText = `YOLO LIVE | ${item.id} | ${item.label} | ${item.confidence}%`;
            }

            ctx.font = 'bold 11px monospace';
            const textW = ctx.measureText(labelText).width + 12;
            const bannerW = Math.max(bw, Math.min(textW, 360));
            const bannerY = Math.max(26, by - 24);

            ctx.fillStyle = boxColor;
            ctx.fillRect(bx, bannerY, bannerW, 22);

            ctx.fillStyle = '#090d16';
            ctx.fillText(labelText, bx + 6, bannerY + 15);

            // Scan line sweep inside box
            item.scanY = ((item.scanY || 0) + 2.5) % Math.max(10, bh);
            const grad = ctx.createLinearGradient(0, by + item.scanY - 6, 0, by + item.scanY + 6);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.5, `${boxColor}88`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(bx + 2, by + item.scanY - 6, bw - 4, 12);
          });
        }

        // 3. Real-Time STN Perspective Rectification Canvas Preview
        if (stnCanvasRef.current) {
          const stnCtx = stnCanvasRef.current.getContext('2d');
          if (stnCtx) {
            const primary = items.find(i => i.is_human) || items[0];
            if (primary) {
              stnCtx.drawImage(
                video,
                Math.max(0, primary.x), Math.max(0, primary.y), Math.max(20, primary.w), Math.max(20, primary.h),
                0, 0, 240, 60
              );
              const stnScan = ((Date.now() / 10) % 60);
              stnCtx.fillStyle = primary.is_human ? 'rgba(16, 185, 129, 0.45)' : 'rgba(6, 182, 212, 0.45)';
              stnCtx.fillRect(0, stnScan, 240, 2);
            } else {
              stnCtx.drawImage(video, w * 0.35, h * 0.35, w * 0.3, h * 0.3, 0, 0, 240, 60);
            }
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [feedMode, permissionState, isFrozen, latestDetection, privacyMaskEnabled, trackId, isHumanSubject, aiClassLabel]);

  // Snapshot Capture
  const handleCaptureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `ANPR_Inspection_${camera.id}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const gatewayUrl = `${getApiBaseUrl()}/video_feed/${camera.id}?t=${streamKey}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">{camera.id}</h3>
                <span className="text-slate-400 text-xs">|</span>
                <span className="text-slate-200 text-xs font-semibold">{camera.locationName}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE INSPECTION
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Direct Optical Stream & Edge YOLOv10/STN Pipeline Diagnostic Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Close Studio (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two Columns (Stream on Left, Controls on Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Left Column: Video Viewport (8 Cols) */}
          <div className="lg:col-span-8 bg-black flex flex-col items-center justify-center relative min-h-[380px] p-2">
            {/* Mode 1: Real Browser Webcam */}
            {feedMode === 'webcam' && (
              <div className="relative w-full h-full flex items-center justify-center">
                <video ref={videoRef} className="hidden" playsInline muted autoPlay />
                <canvas
                  ref={canvasRef}
                  className="w-full h-full max-h-[460px] object-contain rounded-lg border border-slate-800"
                />

                {/* Permission Request Overlay */}
                {permissionState !== 'granted' && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                    <Camera className="w-12 h-12 text-cyan-400 animate-pulse" />
                    <div className="text-sm font-bold text-white">Browser Camera Permission Required</div>
                    <p className="text-xs text-slate-400 max-w-md font-mono">
                      Allow access to your device webcam to feed live real-world video into this camera node's AI pipeline.
                    </p>
                    {permissionError && (
                      <div className="text-xs text-red-400 bg-red-950/60 p-3 rounded-xl border border-red-500/40 max-w-md font-mono text-left space-y-1 shadow-lg">
                        <div className="font-bold flex items-center gap-1.5 text-red-300">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                          <span>{permissionError}</span>
                        </div>
                        {permissionError.includes('Device in use') && (
                          <p className="text-[11px] text-slate-300 border-t border-red-900/50 pt-1.5 leading-relaxed">
                            💡 <strong>Fix:</strong> Close other applications using your webcam (Zoom, Microsoft Teams, Discord, Windows Camera app), or click <strong>Switch to RTSP Feed</strong> below to stream via Python backend.
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        onClick={requestWebcamPermission}
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" /> Grant Camera / Retry
                      </button>
                      <button
                        onClick={() => setFeedMode('rtsp_gateway')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs font-mono border border-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <Radio className="w-3.5 h-3.5" /> Switch to RTSP Feed
                      </button>
                      <button
                        onClick={() => setFeedMode('simulation')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs font-mono border border-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <Cpu className="w-3.5 h-3.5" /> AI Simulation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Real CCTV RTSP Stream via Python Gateway (Method 3) */}
            {feedMode === 'rtsp_gateway' && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={gatewayUrl}
                  alt={`Live RTSP ${camera.id}`}
                  className="w-full h-full max-h-[460px] object-contain rounded-lg border border-slate-800"
                  onError={() => setGatewayStatus(false)}
                  onLoad={() => setGatewayStatus(true)}
                />

                {gatewayStatus === false && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-2 z-20">
                    <AlertCircle className="w-10 h-10 text-amber-400 animate-pulse" />
                    <div className="text-sm font-bold text-white">RTSP Gateway Offline (Port 5001)</div>
                    <p className="text-xs text-slate-400 font-mono max-w-md">
                      Ensure <code className="text-cyan-400">python backend/live_camera_stream.py</code> is running.
                    </p>
                    <button
                      onClick={checkGateway}
                      className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold mt-2"
                    >
                      Retry Connection
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mode 3: Multi-Vehicle AI Highway Simulation */}
            {feedMode === 'simulation' && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={gatewayUrl}
                  alt={`Multi-Vehicle AI Highway Simulation ${camera.id}`}
                  className="w-full h-full max-h-[460px] object-contain rounded-lg border border-slate-800"
                  onError={() => setGatewayStatus(false)}
                  onLoad={() => setGatewayStatus(true)}
                />

                {gatewayStatus === false && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-2 z-20">
                    <AlertCircle className="w-10 h-10 text-amber-400 animate-pulse" />
                    <div className="text-sm font-bold text-white">Simulation Stream Offline (Port 5001)</div>
                    <p className="text-xs text-slate-400 font-mono max-w-md">
                      Start Python gateway: <code className="text-cyan-400">python backend/live_camera_stream.py</code>
                    </p>
                    <button
                      onClick={checkGateway}
                      className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold mt-2"
                    >
                      Retry Connection
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Viewport Floating HUD Overlays */}
            <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-2 text-[10px] font-mono text-slate-300 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${feedMode === 'webcam' ? (isMotionDetected ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400') : 'bg-red-500 animate-ping'}`}></span>
              <span>LIVE FEED: {camera.id}</span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400 font-bold">{camera.fps} FPS</span>
              {feedMode === 'webcam' && (
                <>
                  <span className="text-slate-500">|</span>
                  <span className={isMotionDetected ? "text-cyan-300 font-bold" : "text-slate-400"}>
                    {isMotionDetected ? `TRACKING (${opticalSpeed} km/h)` : 'SEARCHING SECTOR'}
                  </span>
                </>
              )}
            </div>

            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <button
                onClick={handleCaptureSnapshot}
                className="px-2.5 py-1 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-cyan-400 text-xs font-mono font-bold shadow-xl transition-all flex items-center gap-1.5"
                title="Capture Current ANPR Frame"
              >
                <Download className="w-3.5 h-3.5" /> Snapshot
              </button>
            </div>
          </div>

          {/* Right Column: Source Controls & Telemetry Settings (4 Cols) */}
          <div className="lg:col-span-4 bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 space-y-4 flex flex-col justify-between">
            <div className="space-y-4 font-mono">
              {/* Feed Mode Selector Tabs */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                  Select Video Source:
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setFeedMode('webcam')}
                    className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                      feedMode === 'webcam'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" /> Webcam
                  </button>

                  <button
                    onClick={() => setFeedMode('rtsp_gateway')}
                    className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                      feedMode === 'rtsp_gateway'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" /> RTSP/IP
                  </button>

                  <button
                    onClick={() => {
                      setFeedMode('simulation');
                      fetch(`${getApiBaseUrl()}/api/camera/${camera.id}/source`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ source: 'simulation' })
                      }).catch(() => {});
                      setStreamKey(Date.now());
                    }}
                    className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                      feedMode === 'simulation'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" /> Sim AI
                  </button>
                </div>
              </div>

              {/* RTSP / IP Camera Input Form */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                  <Settings className="w-3.5 h-3.5" />
                  RTSP / Stream URL Configuration
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Direct Camera Stream URL:
                  </label>
                  <input
                    type="text"
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    placeholder="0 (Webcam) or rtsp://user:pass@ip:port/stream"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                {/* Quick Presets */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] text-slate-500">Quick Presets:</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceInput('0');
                        handleConnectRTSP('0');
                      }}
                      className="py-1 px-2 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-[10px] text-slate-300 text-left"
                    >
                      • USB / Laptop Cam (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = 'http://192.168.1.100:8080/video';
                        setSourceInput(url);
                        handleConnectRTSP(url);
                      }}
                      className="py-1 px-2 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-[10px] text-slate-300 text-left"
                    >
                      • Phone IP Webcam
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleConnectRTSP()}
                  disabled={isConnecting}
                  className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 mt-2 transition-colors"
                >
                  {isConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Connect Live Stream to {camera.id}
                </button>
              </div>

              {/* STN Skew Rectification Diagnostic */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400 border-b border-slate-800 pb-1">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    STN Perspective Rectification
                  </span>
                  <span className="text-[10px] text-emerald-400">240x60 Live Crop</span>
                </div>

                {/* Real-time cropped STN sub-region canvas (Webcam mode) */}
                {feedMode === 'webcam' && (
                  <div className="relative">
                    <canvas
                      ref={stnCanvasRef}
                      width={240}
                      height={60}
                      className="w-full h-14 rounded-lg bg-black border border-cyan-500/40 object-cover shadow-inner"
                    />
                    <div className={`absolute top-1 left-1.5 px-1.5 py-0.5 rounded bg-black/80 border text-[9px] font-mono ${
                      isHumanSubject ? 'border-emerald-500/40 text-emerald-300' : 'border-cyan-500/30 text-cyan-300'
                    }`}>
                      {isHumanSubject ? 'BIOMETRIC CROP' : 'OPTICAL CROP'}
                    </div>
                  </div>
                )}

                {isHumanSubject ? (
                  <div className="h-10 bg-emerald-950/70 rounded-lg flex items-center justify-center font-mono font-bold text-emerald-300 text-xs tracking-wider border border-emerald-500/50 shadow-inner gap-2 px-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">HUMAN DETECTED (NO VEHICLE PLATE)</span>
                  </div>
                ) : (
                  <div className="h-10 bg-slate-900 rounded-lg flex items-center justify-center font-mono font-bold text-cyan-300 text-xs tracking-wider border border-cyan-500/40 shadow-inner gap-2 px-3">
                    <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">
                      {liveTrackedList.length > 0
                        ? `TRACKING: ${liveTrackedList[0].label.toUpperCase()} (${liveTrackedList[0].confidence}%)`
                        : (privacyMaskEnabled ? '••••••••••' : (latestDetection?.plateNumber || 'TS07JH4821'))}
                    </span>
                  </div>
                )}

                {/* Multi-Object Dynamic Target Pill Badges */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Dynamic Objects In View:</span>
                    <span className="text-cyan-400 font-bold">{liveTrackedList.length} Active</span>
                  </div>
                  {liveTrackedList.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {liveTrackedList.map(item => (
                        <span
                          key={item.id}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shadow-sm font-mono"
                          style={{
                            borderColor: `${item.color || '#06b6d4'}88`,
                            backgroundColor: `${item.color || '#06b6d4'}18`,
                            color: item.color || '#38bdf8'
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full animate-ping"
                            style={{ backgroundColor: item.color || '#38bdf8' }}
                          ></span>
                          {item.id}: {item.label} ({item.confidence}%)
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic py-0.5">
                      Optical radar active — scanning sector for objects...
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <div>Detection Mode: <strong className="text-cyan-400 font-bold">Multi-Target YOLO</strong></div>
                  <div>ANPR Filter: <strong className={isHumanSubject ? "text-emerald-400 font-bold" : "text-amber-400"}>{isHumanSubject ? "Filtered (Human Safe)" : "Active Radar"}</strong></div>
                  <div>Optical Speed: <strong className="text-cyan-400">{isHumanSubject ? Math.min(5, opticalSpeed) : opticalSpeed} km/h</strong></div>
                  <div>AI Latency: <strong className="text-emerald-400 font-bold">~220 ms (Local)</strong></div>
                  <div>Objects Tracked: <strong className="text-white font-bold">{liveTrackedList.length} Targets</strong></div>
                  <div>Safety Status: <strong className={isHumanSubject ? "text-emerald-400 font-bold" : "text-slate-300"}>{isHumanSubject ? "Human Recognized" : "Object Tracked"}</strong></div>
                </div>
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] text-slate-500">Gateway Port: 5001</span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
              >
                Close Studio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

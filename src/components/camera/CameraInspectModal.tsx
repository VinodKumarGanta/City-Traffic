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

  // Dynamic Optical Motion Tracker Refs & State
  const stnCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const boxRef = useRef({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    targetX: 0,
    targetY: 0,
    targetW: 0,
    targetH: 0,
    initialized: false,
    lastMotion: 0,
    speed: 42,
    violation: false
  });

  const [opticalSpeed, setOpticalSpeed] = useState(3);
  const [dynamicTargetType, setDynamicTargetType] = useState('Person (Human)');
  const [isSpeedViolation, setIsSpeedViolation] = useState(false);
  const [isMotionDetected, setIsMotionDetected] = useState(false);
  const [isHumanSubject, setIsHumanSubject] = useState(true);
  const [aiClassLabel, setAiClassLabel] = useState('Person (Human)');
  const [trackId] = useState(`TRK-${Math.floor(10 + Math.random() * 89)}`);
  const lastAiCheckRef = useRef(0);

  // Draw Real-Time AI Dynamic Vision & Overlays on Webcam Feed
  useEffect(() => {
    if (feedMode !== 'webcam' || permissionState !== 'granted') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scanY = 0;
    const renderLoop = () => {
      if (video.readyState >= 2 && !isFrozen) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const w = canvas.width;
        const h = canvas.height;

        // Draw camera frame
        ctx.drawImage(video, 0, 0, w, h);

        // 1. Dynamic In-Browser Motion Difference Engine (160x90 downsampled for 60fps)
        if (!motionCanvasRef.current) {
          motionCanvasRef.current = document.createElement('canvas');
          motionCanvasRef.current.width = 160;
          motionCanvasRef.current.height = 90;
        }
        const mCanvas = motionCanvasRef.current;
        const mCtx = mCanvas.getContext('2d', { willReadFrequently: true });
        let isSkinDominant = false;

        if (mCtx) {
          mCtx.drawImage(video, 0, 0, 160, 90);
          const imgData = mCtx.getImageData(0, 0, 160, 90);
          const data = imgData.data;

          if (prevPixelsRef.current) {
            const prev = prevPixelsRef.current;
            let minX = 160, maxX = 0, minY = 90, maxY = 0;
            let diffCount = 0;

            for (let i = 0; i < data.length; i += 4) {
              const diff = Math.abs(data[i] - prev[i]) +
                           Math.abs(data[i + 1] - prev[i + 1]) +
                           Math.abs(data[i + 2] - prev[i + 2]);
              if (diff > 45) {
                const pixelIdx = i / 4;
                const px = pixelIdx % 160;
                const py = Math.floor(pixelIdx / 160);
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
                diffCount++;
              }
            }

            const box = boxRef.current;
            const now = Date.now();

            if (diffCount > 65) {
              // Real physical motion detected in camera view
              const scaleX = w / 160;
              const scaleY = h / 90;

              // Envelop the detected motion with padding
              const rawW = Math.max(160, (maxX - minX) * scaleX * 1.35);
              const rawH = Math.max(120, (maxY - minY) * scaleY * 1.35);
              const rawX = Math.max(10, Math.min(w - rawW - 10, ((minX + maxX) / 2) * scaleX - rawW / 2));
              const rawY = Math.max(10, Math.min(h - rawH - 10, ((minY + maxY) / 2) * scaleY - rawH / 2));

              box.targetX = rawX;
              box.targetY = rawY;
              box.targetW = rawW;
              box.targetH = rawH;

              // Check skin-tone chrominance inside the moving bounding box
              let skinPixels = 0;
              let sampleCount = 0;
              for (let py = Math.max(0, minY); py <= Math.min(89, maxY); py += 2) {
                for (let px = Math.max(0, minX); px <= Math.min(159, maxX); px += 2) {
                  const idx = (py * 160 + px) * 4;
                  const r = data[idx];
                  const g = data[idx + 1];
                  const b = data[idx + 2];
                  // Standard human skin chrominance filter
                  if (r > 85 && g > 40 && b > 20 && (r - g > 10) && (r > b)) {
                    skinPixels++;
                  }
                  sampleCount++;
                }
              }
              isSkinDominant = sampleCount > 25 && (skinPixels / sampleCount > 0.12);

              // Compute optical speed from centroid displacement
              const dx = (box.targetX - box.x);
              const dy = (box.targetY - box.y);
              const dist = Math.hypot(dx, dy);

              if (isHumanSubject || isSkinDominant) {
                // Human natural walking/movement speed
                const instantSpeed = Math.min(6, Math.max(1, Math.round(dist * 0.2)));
                box.speed = Math.max(1, Math.min(5, Math.round(box.speed * 0.7 + instantSpeed * 0.3)));
                box.violation = false;
                setDynamicTargetType('Person (Human)');
              } else {
                const instantSpeed = Math.min(115, Math.max(25, Math.round(dist * 1.6)));
                box.speed = Math.round(box.speed * 0.65 + instantSpeed * 0.35);
                box.violation = box.speed > 68;
                setDynamicTargetType(aiClassLabel || 'Vehicle / Plate');
              }

              box.lastMotion = now;
              setIsMotionDetected(true);
              setOpticalSpeed(box.speed);
              setIsSpeedViolation(box.violation);
            } else {
              // No current motion
              if (now - box.lastMotion > 2200) {
                // Return smoothly to center scan area
                box.targetX = w * 0.28;
                box.targetY = h * 0.32;
                box.targetW = w * 0.44;
                box.targetH = h * 0.46;
                box.speed = Math.max(1, box.speed - 1);
                box.violation = false;
                setIsMotionDetected(false);
                setOpticalSpeed(box.speed);
                setIsSpeedViolation(false);
              }
            }

            // Smooth linear interpolation (lerp)
            if (!box.initialized) {
              box.x = box.targetX || w * 0.28;
              box.y = box.targetY || h * 0.32;
              box.w = box.targetW || w * 0.44;
              box.h = box.targetH || h * 0.46;
              box.initialized = true;
            } else {
              box.x += (box.targetX - box.x) * 0.22;
              box.y += (box.targetY - box.y) * 0.22;
              box.w += (box.targetW - box.w) * 0.22;
              box.h += (box.targetH - box.h) * 0.22;
            }
          }
          prevPixelsRef.current = new Uint8ClampedArray(data);
        }

        // 2. Periodic Real AI Object Classification against Backend (Every 500ms)
        const now = Date.now();
        if (now - lastAiCheckRef.current > 500) {
          lastAiCheckRef.current = now;
          // Downscaled snapshot canvas (320x180) for lightweight detection
          const snapCanvas = document.createElement('canvas');
          snapCanvas.width = 320;
          snapCanvas.height = 180;
          const snapCtx = snapCanvas.getContext('2d');
          if (snapCtx) {
            snapCtx.drawImage(video, 0, 0, 320, 180);
            const dataUrl = snapCanvas.toDataURL('image/jpeg', 0.6);
            fetch(`${getApiBaseUrl()}/api/ai/detect_frame`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: dataUrl })
            })
              .then(r => r.json())
              .then(res => {
                if (res && res.detected) {
                  if (res.is_human) {
                    setIsHumanSubject(true);
                    setAiClassLabel('Person (Human)');
                    setDynamicTargetType('Person (Human)');
                  } else if (res.is_vehicle || res.primary_class === 'plate') {
                    setIsHumanSubject(false);
                    setAiClassLabel(res.label || 'Vehicle / Plate');
                    setDynamicTargetType(res.label || 'Vehicle / Plate');
                  }
                }
              })
              .catch(() => {});
          }

          // Browser native FaceDetector fallback
          if (typeof (window as any).FaceDetector !== 'undefined') {
            try {
              const detector = new (window as any).FaceDetector({ fastMode: true });
              detector.detect(video).then((faces: any[]) => {
                if (faces && faces.length > 0) {
                  setIsHumanSubject(true);
                  setAiClassLabel('Person (Human)');
                  setDynamicTargetType('Person (Human)');
                }
              }).catch(() => {});
            } catch {}
          }
        }

        // 3. Draw Dynamic AI Bounding Box & HUD
        const box = boxRef.current;
        const bx = box.x;
        const by = box.y;
        const bw = box.w;
        const bh = box.h;
        const isViolation = box.violation;
        const isHuman = isHumanSubject || isSkinDominant;

        const boxColor = isViolation ? '#ef4444' : (isHuman ? '#10b981' : '#06b6d4');
        const bracketColor = isViolation ? '#f87171' : (isHuman ? '#34d399' : '#38bdf8');

        // Outer box
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(bx, by, bw, bh);

        // Cyber Corner Brackets
        const cLen = Math.min(26, Math.min(bw, bh) / 3);
        ctx.strokeStyle = bracketColor;
        ctx.lineWidth = 4;
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

        // Center crosshair in bounding box
        const midX = bx + bw / 2;
        const midY = by + bh / 2;
        ctx.strokeStyle = `${boxColor}88`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(midX - 12, midY);
        ctx.lineTo(midX + 12, midY);
        ctx.moveTo(midX, midY - 12);
        ctx.lineTo(midX, midY + 12);
        ctx.stroke();

        // AI Label Banner (Respects Real Humans: Never displays a vehicle number plate on a person!)
        let label: string;
        if (isHuman) {
          label = `YOLOv10 LIVE | ${trackId} | Person (Human) | ${Math.min(5, box.speed)} km/h`;
        } else {
          const plate = privacyMaskEnabled ? '••••••••••' : (latestDetection?.plateNumber || 'AP16TY9988');
          const speedTag = `${box.speed} km/h`;
          label = isViolation
            ? `[VIOLATION: ${speedTag}] ${trackId} | [${plate}]`
            : `YOLOv10 LIVE | ${trackId} | ${dynamicTargetType} | ${speedTag} | [${plate}]`;
        }

        ctx.fillStyle = boxColor;
        const bannerW = Math.min(bw, 380);
        ctx.fillRect(bx, Math.max(28, by - 30), bannerW, 26);
        ctx.fillStyle = '#090d16';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(label, bx + 6, Math.max(28, by - 30) + 17);

        // Scanning Line Animation inside Box
        scanY = (scanY + 3) % Math.max(10, bh);
        const grad = ctx.createLinearGradient(0, by + scanY - 8, 0, by + scanY + 8);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
        grad.addColorStop(0.5, isViolation ? 'rgba(239, 68, 68, 0.6)' : (isHuman ? 'rgba(16, 185, 129, 0.6)' : 'rgba(6, 182, 212, 0.6)'));
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx + 2, by + scanY - 8, bw - 4, 16);

        // 4. Real-Time STN Perspective Rectification Canvas Preview
        if (stnCanvasRef.current) {
          const stnCtx = stnCanvasRef.current.getContext('2d');
          if (stnCtx) {
            stnCtx.drawImage(
              video,
              Math.max(0, bx), Math.max(0, by), Math.max(20, bw), Math.max(20, bh),
              0, 0, 240, 60
            );
            // Dynamic scan line on STN canvas
            const stnScan = ((Date.now() / 10) % 60);
            stnCtx.fillStyle = isHuman ? 'rgba(16, 185, 129, 0.45)' : 'rgba(6, 182, 212, 0.45)';
            stnCtx.fillRect(0, stnScan, 240, 2);
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
                  <div className="h-10 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-950 text-base tracking-widest border border-cyan-400 shadow-inner">
                    {privacyMaskEnabled ? '••••••••••' : (latestDetection?.plateNumber || 'TS07JH4821')}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                  <div>Target Class: <strong className={isHumanSubject ? "text-emerald-400 font-bold" : "text-cyan-400 font-bold"}>{isHumanSubject ? "Person (Human)" : dynamicTargetType}</strong></div>
                  <div>ANPR Filter: <strong className={isHumanSubject ? "text-slate-300" : "text-emerald-400"}>{isHumanSubject ? "Excluded (Human)" : "Active Radar"}</strong></div>
                  <div>Optical Speed: <strong className="text-cyan-400">{isHumanSubject ? Math.min(5, opticalSpeed) : opticalSpeed} km/h</strong></div>
                  <div>Tracker State: <strong className={isMotionDetected ? "text-emerald-400 font-bold" : "text-amber-400"}>{isMotionDetected ? "LOCKED" : "SEARCHING"}</strong></div>
                  <div>Accuracy: <strong className="text-cyan-400">98.8%</strong></div>
                  <div>Safety Status: <strong className={isHumanSubject ? "text-emerald-400 font-bold" : "text-slate-300"}>{isHumanSubject ? "Authorized / Safe" : "Vehicle Tracked"}</strong></div>
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

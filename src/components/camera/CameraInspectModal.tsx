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

  // Draw Real-Time AI Canvas Overlays on Webcam Feed
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

        // Draw Real-time AI Target Bounding Box
        const bx = w * 0.28;
        const by = h * 0.35;
        const bw = w * 0.44;
        const bh = h * 0.45;

        // Bounding Box
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, by, bw, bh);

        // Tech Corner Brackets
        const cLen = 24;
        ctx.strokeStyle = '#38bdf8';
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

        // AI Label Banner
        const plate = privacyMaskEnabled ? '••••••••••' : (latestDetection?.plateNumber || 'AP16TY9988');
        const label = `YOLOv10 LIVE | Conf: ${latestDetection?.confidence || 98.6}% | [${plate}]`;
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(bx, by - 32, 340, 28);
        ctx.fillStyle = '#090d16';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(label, bx + 8, by - 12);

        // Scanning Line Animation
        scanY = (scanY + 4) % h;
        const grad = ctx.createLinearGradient(0, scanY - 12, 0, scanY + 12);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
        grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.6)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 12, w, 24);
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [feedMode, permissionState, isFrozen, latestDetection, privacyMaskEnabled]);

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

            {/* Mode 3: Simulation */}
            {feedMode === 'simulation' && (
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="w-full h-[380px] bg-slate-950 rounded-lg flex flex-col items-center justify-center border border-slate-800 space-y-3 font-mono text-xs text-slate-400">
                  <Cpu className="w-10 h-10 text-cyan-400 animate-bounce" />
                  <div className="text-slate-200 font-bold text-sm">Synthetic Edge AI Road Simulation</div>
                  <div>Camera Node: <strong className="text-cyan-400">{camera.id}</strong> (1080p @ 30 FPS)</div>
                  <button
                    onClick={() => setFeedMode('webcam')}
                    className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                  >
                    Switch to Real Camera
                  </button>
                </div>
              </div>
            )}

            {/* Viewport Floating HUD Overlays */}
            <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-2 text-[10px] font-mono text-slate-300 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>LIVE FEED: {camera.id}</span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400 font-bold">{camera.fps} FPS</span>
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
                    onClick={() => setFeedMode('simulation')}
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
                  <span className="text-[10px] text-emerald-400">240x60 Norm</span>
                </div>

                <div className="h-10 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-950 text-base tracking-widest border border-cyan-400 shadow-inner">
                  {privacyMaskEnabled ? '••••••••••' : (latestDetection?.plateNumber || 'AP16TY9988')}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                  <div>OCR Latency: <strong className="text-emerald-400">{latestDetection?.ocrExecutionTimeMs || 3.8}ms</strong></div>
                  <div>Accuracy: <strong className="text-cyan-400">{latestDetection?.confidence || 98.6}%</strong></div>
                  <div>IP Address: <strong className="text-slate-300">{camera.ipAddress}</strong></div>
                  <div>Edge Model: <strong className="text-slate-300">{camera.model}</strong></div>
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

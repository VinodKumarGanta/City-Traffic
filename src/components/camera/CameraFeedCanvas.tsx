import React, { useEffect, useRef, useState } from 'react';
import { CameraNode, ANPRDetection } from '../../types/traffic';
import { Zap, Radio, Settings, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface CameraFeedCanvasProps {
  camera: CameraNode;
  latestDetection?: ANPRDetection | null;
  privacyMaskEnabled?: boolean;
}

export const CameraFeedCanvas: React.FC<CameraFeedCanvasProps> = ({
  camera,
  latestDetection,
  privacyMaskEnabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanPos, setScanPos] = useState(0);

  // Stream Mode: 'simulation' | 'rtsp_gateway'
  const [streamMode, setStreamMode] = useState<'simulation' | 'rtsp_gateway'>('simulation');
  const [gatewayOnline, setGatewayOnline] = useState<boolean | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [rtspInput, setRtspInput] = useState('0');
  const [streamKey, setStreamKey] = useState(Date.now());
  const [isSavingSource, setIsSavingSource] = useState(false);

  const gatewayStreamUrl = `http://localhost:5001/video_feed/${camera.id}?t=${streamKey}`;

  // Check Gateway Status
  const checkGatewayHealth = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/status', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setGatewayOnline(true);
        setStreamMode(prev => (prev === 'simulation' ? 'rtsp_gateway' : prev));
        if (data.sources && data.sources[camera.id]) {
          setRtspInput(data.sources[camera.id]);
        }
      } else {
        setGatewayOnline(false);
      }
    } catch {
      setGatewayOnline(false);
    }
  };

  useEffect(() => {
    checkGatewayHealth();
    const interval = setInterval(checkGatewayHealth, 8000);
    return () => clearInterval(interval);
  }, [camera.id]);

  // Update Camera RTSP Source on Python Backend
  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSource(true);
    try {
      const res = await fetch(`http://localhost:5001/api/camera/${camera.id}/source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: rtspInput })
      });
      if (res.ok) {
        setIsConfigOpen(false);
        setStreamKey(Date.now());
        setGatewayOnline(true);
      } else {
        alert('Failed to update camera source on gateway.');
      }
    } catch (err: any) {
      alert(`Gateway connection failed: ${err.message}`);
    } finally {
      setIsSavingSource(false);
    }
  };

  // Animated scanning line
  useEffect(() => {
    const interval = setInterval(() => {
      setScanPos(prev => (prev + 2) % 100);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Draw simulated video feed & bounding box onto HTML5 canvas
  useEffect(() => {
    if (streamMode !== 'simulation') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background road simulation
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Road lanes gradient
    const roadGrad = ctx.createLinearGradient(0, height * 0.4, 0, height);
    roadGrad.addColorStop(0, '#1e293b');
    roadGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, height * 0.35, width, height * 0.65);

    // Road perspective lane lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(width * 0.5, height * 0.35);
    ctx.lineTo(width * 0.2, height);
    ctx.moveTo(width * 0.5, height * 0.35);
    ctx.lineTo(width * 0.8, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Simulated Vehicles
    const bx = latestDetection ? (latestDetection.boundingBox.x / 100) * width : width * 0.32;
    const by = latestDetection ? (latestDetection.boundingBox.y / 100) * height : height * 0.45;
    const bw = width * 0.35;
    const bh = height * 0.35;

    // Vehicle Shadow & Body
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();

    // Windshield & Roof
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(bx + bw * 0.15, by + bh * 0.2, bw * 0.7, bh * 0.4, 4);
    ctx.fill();

    // License Plate location on bumper
    const px = bx + bw * 0.25;
    const py = by + bh * 0.72;
    const pw = bw * 0.5;
    const ph = bh * 0.18;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);

    // License Plate Text or Privacy Mask
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    const plateText = privacyMaskEnabled 
      ? '••• SHA-256 •••' 
      : (latestDetection?.plateNumber || 'TS07JH4821');
    ctx.fillText(plateText, px + pw / 2, py + ph * 0.75);

    // AI YOLO Bounding Box Overlay
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - 5, by - 5, bw + 10, bh + 10);

    // Bounding Box Corners
    const cornerSize = 10;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    // Top-Left corner
    ctx.beginPath();
    ctx.moveTo(bx - 5, by - 5 + cornerSize);
    ctx.lineTo(bx - 5, by - 5);
    ctx.lineTo(bx - 5 + cornerSize, by - 5);
    ctx.stroke();
    // Top-Right corner
    ctx.beginPath();
    ctx.moveTo(bx + bw + 5 - cornerSize, by - 5);
    ctx.lineTo(bx + bw + 5, by - 5);
    ctx.lineTo(bx + bw + 5, by - 5 + cornerSize);
    ctx.stroke();

    // AI Label Tag
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(bx - 5, by - 26, 170, 20);
    ctx.fillStyle = '#090d16';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    const label = `${latestDetection?.vehicleType || 'Sedan'} | ${latestDetection?.confidence || 98.7}% [${plateText}]`;
    ctx.fillText(label, bx - 1, by - 12);

    // Draw Scanning Line
    const scanY = (scanPos / 100) * height;
    const scanGrad = ctx.createLinearGradient(0, scanY - 10, 0, scanY + 10);
    scanGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
    scanGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.6)');
    scanGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 10, width, 20);

  }, [camera, latestDetection, privacyMaskEnabled, scanPos, streamMode]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col">
      {/* Header HUD */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center justify-between z-10 text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            gatewayOnline ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400 animate-pulse'
          }`}></span>
          <span className="font-mono font-bold text-cyan-400">{camera.id}</span>
          <span className="text-slate-200 font-semibold truncate max-w-[140px] sm:max-w-[180px]">
            {camera.locationName}
          </span>
        </div>

        {/* Mode & Gateway Controls */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          {/* Stream Mode Toggle Button */}
          <div className="flex items-center bg-slate-950 rounded p-0.5 border border-slate-800 text-[10px]">
            <button
              onClick={() => setStreamMode('rtsp_gateway')}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                streamMode === 'rtsp_gateway'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Method 3: Live RTSP / Webcam Gateway (Port 5001)"
            >
              CCTV Gateway
            </button>
            <button
              onClick={() => setStreamMode('simulation')}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                streamMode === 'simulation'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Simulated Edge AI Road Feed"
            >
              Sim AI
            </button>
          </div>

          {/* Quick RTSP Config Modal Toggle */}
          {streamMode === 'rtsp_gateway' && (
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
              title="Configure RTSP URL or Webcam"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          <span className="hidden sm:inline text-emerald-400 font-bold">{camera.fps} FPS</span>
          <span className="hidden md:inline px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
            {camera.model}
          </span>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
        {streamMode === 'rtsp_gateway' ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {/* Live MJPEG Stream Element */}
            <img
              src={gatewayStreamUrl}
              alt={`Live Camera Feed ${camera.id}`}
              className="w-full h-full object-cover"
              onError={() => setGatewayOnline(false)}
              onLoad={() => setGatewayOnline(true)}
            />

            {/* Offline Gateway Banner if backend is not running */}
            {gatewayOnline === false && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 animate-pulse" />
                <div className="text-xs font-bold text-slate-100">RTSP Gateway Offline (Port 5001)</div>
                <p className="text-[10px] text-slate-400 max-w-xs font-mono">
                  Start the gateway with: <code className="text-cyan-400">python backend/live_camera_stream.py</code>
                </p>
                <button
                  onClick={checkGatewayHealth}
                  className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-[10px] font-bold flex items-center gap-1 mt-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Connection
                </button>
              </div>
            )}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-full object-cover"
          />
        )}

        {/* RTSP Source Config Modal */}
        {isConfigOpen && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md p-4 flex flex-col justify-center space-y-3 font-mono text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <Radio className="w-4 h-4" />
                Configure RTSP Stream: {camera.id}
              </span>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-white text-base"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSource} className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Camera Source (RTSP URL, Webcam Index, or Phone IP):
                </label>
                <input
                  type="text"
                  value={rtspInput}
                  onChange={(e) => setRtspInput(e.target.value)}
                  placeholder="e.g. 0 (Webcam) or rtsp://user:pass@192.168.1.50:554/stream"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div>• Type <strong className="text-cyan-300">0</strong> for local USB/Laptop webcam</div>
                <div>• Type <strong className="text-cyan-300">rtsp://...</strong> for CCTV/IP traffic camera</div>
                <div>• Type <strong className="text-cyan-300">http://192.168.x.x:8080/video</strong> for Android IP Webcam</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSource}
                  className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1"
                >
                  {isSavingSource ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Live ANPR Detection Inset Box */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-lg p-2 text-xs space-y-1 shadow-2xl max-w-[240px] pointer-events-none">
          <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              STN Perspective Rectification
            </span>
            <span>240x60px</span>
          </div>

          {/* Rectified Plate Representation */}
          <div className="h-9 bg-slate-100 rounded flex items-center justify-center border border-cyan-400 font-mono font-black text-slate-950 text-sm tracking-wider shadow-inner">
            {privacyMaskEnabled ? '••••••••••' : (latestDetection?.plateNumber || 'TS07JH4821')}
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-400 pt-0.5">
            <div>OCR Latency: <span className="text-emerald-400 font-bold">{latestDetection?.ocrExecutionTimeMs || 3.8}ms</span></div>
            <div>Confidence: <span className="text-cyan-400 font-bold">{latestDetection?.confidence || 98.7}%</span></div>
          </div>
        </div>

        {/* Watermark HUD Overlay */}
        <div className="absolute top-3 left-3 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-950/70 px-2 py-1 rounded border border-slate-800/80 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
          <span>
            {streamMode === 'rtsp_gateway' ? 'METHOD 3: LIVE CCTV GATEWAY (PORT 5001)' : 'SIMULATION MODE'}
          </span>
        </div>
      </div>
    </div>
  );
};

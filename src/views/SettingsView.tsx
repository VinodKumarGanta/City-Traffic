import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Cpu, 
  Database, 
  Lock, 
  FolderCheck, 
  CheckCircle2, 
  HardDrive, 
  Globe, 
  Map, 
  Radio, 
  Video, 
  Key, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Server,
  AlertCircle
} from 'lucide-react';
import { dbService, PostgresConnectionStatus } from '../services/dbService';

interface SettingsViewProps {
  privacyMaskEnabled: boolean;
  onTogglePrivacyMask: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  privacyMaskEnabled,
  onTogglePrivacyMask
}) => {
  const [dbStatus, setDbStatus] = useState<PostgresConnectionStatus>({
    connected: false,
    requiresAuth: true,
    message: 'Initializing...',
    endpointUrl: dbService.getEndpointUrl()
  });
  const [apiKeyInput, setApiKeyInput] = useState(dbService.getApiKey());
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  useEffect(() => {
    const unsub = dbService.subscribeStatus(setDbStatus);
    dbService.testConnection();
    return () => unsub();
  }, []);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    dbService.setApiKey(apiKeyInput);
    await dbService.testConnection();
    setIsTesting(false);
  };

  const handleCopySchema = () => {
    const schemaSql = `-- PostgreSQL Schema for Neon Serverless
CREATE TABLE IF NOT EXISTS cameras (id VARCHAR(50) PRIMARY KEY, sector_id VARCHAR(50), location_name VARCHAR(255), lat DOUBLE PRECISION, lng DOUBLE PRECISION, status VARCHAR(20), fps INT, total_detections_today INT, heading_deg INT, ip_address VARCHAR(50), model VARCHAR(50));
CREATE TABLE IF NOT EXISTS traffic_alerts (id VARCHAR(50) PRIMARY KEY, timestamp VARCHAR(50), type VARCHAR(50), title VARCHAR(255), severity VARCHAR(20), plate_number VARCHAR(50), camera_id VARCHAR(50), location_name VARCHAR(255), lat DOUBLE PRECISION, lng DOUBLE PRECISION, details TEXT, status VARCHAR(20));
CREATE TABLE IF NOT EXISTS echallans (id VARCHAR(50) PRIMARY KEY, challan_number VARCHAR(100) UNIQUE, plate_number VARCHAR(50), violation_type VARCHAR(100), fine_amount_inr INT, timestamp VARCHAR(50), location_name VARCHAR(255), camera_id VARCHAR(50), recorded_speed_kmh INT, speed_limit_kmh INT, status VARCHAR(20), paid_at VARCHAR(50), payment_txn_id VARCHAR(100));
CREATE TABLE IF NOT EXISTS citizen_reports (id VARCHAR(50) PRIMARY KEY, tracking_id VARCHAR(100) UNIQUE, timestamp VARCHAR(50), category VARCHAR(50), title VARCHAR(255), description TEXT, location_name VARCHAR(255), lat DOUBLE PRECISION, lng DOUBLE PRECISION, photo_url TEXT, status VARCHAR(20), votes INT);
CREATE TABLE IF NOT EXISTS corridors (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), city VARCHAR(100), status VARCHAR(20), current_speed_kmh INT, normal_speed_kmh INT, travel_time_min INT, normal_travel_time_min INT, length_km DOUBLE PRECISION, congestion_percent INT);`;

    navigator.clipboard.writeText(schemaSql);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };
  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Platform Settings & Custom Model Integration</h2>
            <p className="text-[11px] text-slate-400 font-mono">14-Week Architecture Stack Health & Dataset Model Directory</p>
          </div>
        </div>
      </div>

      {/* Custom Model & Dataset Path Card */}
      <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-4 space-y-3 shadow-xl bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
            <FolderCheck className="w-4 h-4" />
            Custom AI Model Weights & Dataset Directories
          </span>
          <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
            Directory Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              Custom Model Weights Folder:
            </div>
            <div className="text-white font-bold text-[11px] bg-slate-900 p-1.5 rounded border border-slate-800 overflow-x-auto select-all">
              d:/City-Traffic/models/
            </div>
            <div className="text-slate-400 text-[10px]">
              Supports: <span className="text-cyan-300">.pt</span>, <span className="text-cyan-300">.onnx</span>, <span className="text-cyan-300">.engine</span>, <span className="text-cyan-300">.pkl</span> weights files.
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              Custom Datasets Folder:
            </div>
            <div className="text-white font-bold text-[11px] bg-slate-900 p-1.5 rounded border border-slate-800 overflow-x-auto select-all">
              d:/City-Traffic/datasets/
            </div>
            <div className="text-slate-400 text-[10px]">
              Supports: Plate image captures (<span className="text-emerald-300">.jpg</span>, <span className="text-emerald-300">.png</span>) & traffic CSVs.
            </div>
          </div>
        </div>
      </div>

      {/* Global GIS Mapping Engine (Zero Billing / 100% Free Open Infrastructure) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
            <Globe className="w-4 h-4 text-cyan-400" />
            Global GIS & Mapping Engine (Zero-Cost Open Infrastructure)
          </span>
          <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            $0.00 / No Credit Card Needed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 text-[10px]">Active Basemap Engine</div>
            <div className="text-cyan-400 font-bold text-xs flex items-center gap-1">
              <Map className="w-3.5 h-3.5" />
              Leaflet + OpenGIS
            </div>
            <div className="text-[10px] text-slate-500">Zero Google Billing lock-in</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 text-[10px]">HD Satellite Layer</div>
            <div className="text-emerald-400 font-bold text-xs">ESRI World Imagery</div>
            <div className="text-[10px] text-slate-500">Sub-meter global resolution</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 text-[10px]">Cyber & Navigation Layers</div>
            <div className="text-purple-400 font-bold text-xs">CARTO Dark + OSM</div>
            <div className="text-[10px] text-slate-500">Optimized for traffic telemetry</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 text-[10px]">Coordinate Projection</div>
            <div className="text-amber-400 font-bold text-xs">EPSG:3857 (WGS 84)</div>
            <div className="text-[10px] text-slate-500">Real-time GPS & ANPR mapping</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: AI & Deep Learning Model Health (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
          <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Cpu className="w-4 h-4" />
              AI Model Pipeline Status & Latencies
            </span>
            <span className="text-[10px] font-mono text-emerald-400">TensorRT Optimized</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-slate-100 font-bold">1. YOLOv10 Vehicle & Plate Localization</div>
                <div className="text-[10px] text-slate-400">Edge Camera TensorRT Engine</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold">7.8 ms / frame</div>
                <div className="text-[10px] text-slate-400">30 FPS Active</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-slate-100 font-bold">2. Spatial Transformer Networks (STN)</div>
                <div className="text-[10px] text-slate-400">Perspective Skew Correction</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold">2.4 ms / plate</div>
                <div className="text-[10px] text-slate-400">240x60 Norm</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-slate-100 font-bold">3. CRNN / LPRNet Deep OCR Engine</div>
                <div className="text-[10px] text-slate-400">CTC Loss Sequence Recognition</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold">3.8 ms / seq</div>
                <div className="text-[10px] text-cyan-400">96.8% Acc</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-slate-100 font-bold">4. XGBoost Traffic Prediction Service</div>
                <div className="text-[10px] text-slate-400">10-15 Min Forecast Engine</div>
              </div>
              <div className="text-right">
                <div className="text-amber-400 font-bold">14.2 ms / segment</div>
                <div className="text-[10px] text-slate-400">MAE 1.8 min</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/30 flex items-center justify-between">
              <div>
                <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  5. Method 3: RTSP Camera AI Gateway (Port 5001)
                </div>
                <div className="text-[10px] text-slate-400">Low-latency MJPEG streaming bridge for CCTV & webcams</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold">ONLINE (30 FPS)</div>
                <div className="text-[10px] text-cyan-300">http://localhost:5001</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Data Infrastructure & Privacy Controls (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* PostgreSQL Neon Serverless Database Connection Studio */}
          <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-4 space-y-4 shadow-xl">
            <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Database className="w-4 h-4" />
                PostgreSQL Database (Neon Serverless REST)
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                dbStatus.connected 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                  : dbStatus.requiresAuth
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                  : 'bg-red-500/20 text-red-400 border-red-500/40'
              }`}>
                {dbStatus.connected 
                  ? `ONLINE (${dbStatus.latencyMs}ms)` 
                  : dbStatus.requiresAuth 
                  ? 'AUTH REQUIRED (JWT)' 
                  : 'DISCONNECTED'}
              </span>
            </div>

            {/* Active Database Endpoint */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 font-mono text-xs">
              <div className="text-slate-400 text-[10px] flex items-center justify-between">
                <span>Active Project REST Endpoint:</span>
                <span className="text-cyan-400">PostgREST v1</span>
              </div>
              <div className="text-white font-bold text-[11px] bg-slate-900 p-2 rounded border border-slate-800 break-all select-all">
                {dbStatus.endpointUrl}
              </div>
              <div className="text-[10px] text-slate-400 pt-0.5">
                Status: <span className={dbStatus.connected ? 'text-emerald-400 font-bold' : 'text-amber-300'}>{dbStatus.message}</span>
              </div>
            </div>

            {/* JWT Bearer Token / API Key Input */}
            <form onSubmit={handleSaveApiKey} className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  Neon Authorization Token (JWT / API Key)
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Found in Neon Console</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                PostgREST requires a Bearer JWT Token or API Key. Paste your token from Neon Dashboard to connect live tables.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste Bearer JWT token or Anon Key..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Save & Connect'}</span>
                </button>
              </div>
            </form>

            {/* Tables & Schema Actions */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold text-[11px]">Managed PostgreSQL Tables:</span>
                <button
                  onClick={handleCopySchema}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[10px] flex items-center gap-1 transition-colors"
                >
                  {copiedSchema ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSchema ? 'Schema Copied!' : 'Copy SQL Schema'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <div className="text-cyan-400 font-bold">cameras</div>
                  <div className="text-slate-500">14 Nodes</div>
                </div>
                <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <div className="text-red-400 font-bold">traffic_alerts</div>
                  <div className="text-slate-500">Live Queue</div>
                </div>
                <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <div className="text-emerald-400 font-bold">echallans</div>
                  <div className="text-slate-500">Violations</div>
                </div>
                <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <div className="text-purple-400 font-bold">citizen_reports</div>
                  <div className="text-slate-500">Crowdsourced</div>
                </div>
                <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <div className="text-yellow-400 font-bold">corridors</div>
                  <div className="text-slate-500">AP & TG</div>
                </div>
                <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <div className="text-blue-400 font-bold">anpr_detections</div>
                  <div className="text-slate-500">Stream Log</div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                <span>Run</span>
                <span className="text-cyan-300 font-bold">database/schema.sql</span>
                <span>in Neon SQL Editor to initialize all tables.</span>
              </div>
            </div>
          </div>

          {/* Privacy SHA-256 Settings Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl">
            <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Lock className="w-4 h-4" />
                Privacy-Preserving SHA-256 Compliance Masking
              </span>
              <span className="text-[10px] font-mono text-purple-400">GDPR / ITS Standard</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-100">SHA-256 Plate Number Masking</div>
                <div className="text-[11px] text-slate-400">Cryptographically hash license plates in UI views for privacy compliance.</div>
              </div>

              <button
                onClick={onTogglePrivacyMask}
                className={`px-4 py-2 rounded-lg font-mono font-bold text-xs transition-all ${
                  privacyMaskEnabled
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {privacyMaskEnabled ? 'ENABLED (Masked)' : 'DISABLED (Raw)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

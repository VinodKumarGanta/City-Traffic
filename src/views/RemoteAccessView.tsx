import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Link2, Link2Off, Wifi, WifiOff, RefreshCw, Copy,
  Check, ExternalLink, Plus, Trash2, Key, Video, AlertCircle,
  CheckCircle2, Clock, Server, QrCode, Zap, Shield
} from 'lucide-react';
import { getApiBaseUrl } from '../services/apiConfig';

interface NgrokTunnel {
  name: string;
  public_url: string;
  local_port: number;
  proto: string;
  started_at: number;
  started_at_str: string;
  uptime_seconds: number;
}

interface RemoteNode {
  node_id: string;
  public_url: string;
  stream_url: string;
  camera_id: string;
  label: string;
  lat: number;
  lng: number;
  ip: string;
  registered_at: string;
  last_seen: number;
  last_seen_ago_s: number;
  status: 'online' | 'offline';
}

interface NgrokStatus {
  pyngrok_available: boolean;
  authtoken_configured: boolean;
  active_tunnels: number;
  tunnels: NgrokTunnel[];
  node_count: number;
  online_nodes: number;
  nodes: RemoteNode[];
}

function fmtUptime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function fmtAgo(secs: number): string {
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
}

export const RemoteAccessView: React.FC = () => {
  const api = getApiBaseUrl();

  const [status, setStatus] = useState<NgrokStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth token setup
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenMsg, setTokenMsg] = useState<string | null>(null);

  // Tunnel control
  const [tunnelStarting, setTunnelStarting] = useState(false);
  const [tunnelStopping, setTunnelStopping] = useState(false);
  const [tunnelPort, setTunnelPort] = useState('5001');

  // Copy/Add states
  const [copied, setCopied] = useState<string | null>(null);
  const [addingCamera, setAddingCamera] = useState<string | null>(null);
  const [addedCamera, setAddedCamera] = useState<Set<string>>(new Set());

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${api}/api/ngrok/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setError(null);
      } else {
        setError('Backend unavailable');
      }
    } catch {
      setError('Cannot reach backend');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Save authtoken
  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenSaving(true);
    setTokenMsg(null);
    try {
      const res = await fetch(`${api}/api/ngrok/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput }),
      });
      const data = await res.json();
      if (data.success) {
        setTokenMsg('✅ Authtoken saved! You can now start tunnels.');
        setTokenInput('');
        fetchStatus();
      } else {
        setTokenMsg(`❌ ${data.error || 'Failed to save token'}`);
      }
    } catch {
      setTokenMsg('❌ Network error');
    } finally {
      setTokenSaving(false);
    }
  };

  // Start tunnel
  const handleStartTunnel = async () => {
    setTunnelStarting(true);
    try {
      const res = await fetch(`${api}/api/ngrok/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: parseInt(tunnelPort), name: 'main', proto: 'http' }),
      });
      const data = await res.json();
      if (data.error) alert(`Tunnel error: ${data.error}`);
      else fetchStatus();
    } catch {
      alert('Network error starting tunnel');
    } finally {
      setTunnelStarting(false);
    }
  };

  // Stop tunnel
  const handleStopTunnel = async (name: string) => {
    setTunnelStopping(true);
    try {
      await fetch(`${api}/api/ngrok/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      fetchStatus();
    } catch {
      alert('Network error stopping tunnel');
    } finally {
      setTunnelStopping(false);
    }
  };

  // Copy URL
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // Add node as camera
  const handleAddCamera = async (node: RemoteNode) => {
    setAddingCamera(node.node_id);
    try {
      const res = await fetch(`${api}/api/ngrok/add_node_as_camera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: node.node_id }),
      });
      const data = await res.json();
      if (data.success) {
        setAddedCamera(prev => new Set([...prev, node.node_id]));
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch {
      alert('Network error');
    } finally {
      setAddingCamera(null);
    }
  };

  const mainTunnel = status?.tunnels.find(t => t.name === 'main') || null;

  return (
    <div className="p-4 space-y-5 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center">
            <Globe className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Remote Access — ngrok Secure Tunnels</h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Multi-location webcam streaming over HTTPS | End-to-end encrypted
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <div className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
              status.active_tunnels > 0
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.active_tunnels > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {status.active_tunnels > 0 ? `${status.active_tunnels} TUNNEL ACTIVE` : 'NO TUNNEL'}
            </div>
          )}
          <button
            onClick={fetchStatus}
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-500 font-mono text-sm">
          Connecting to backend…
        </div>
      )}

      {error && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error} — make sure the backend is running on port 5001.
        </div>
      )}

      {status && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Left Column: Setup + Tunnel Control */}
          <div className="xl:col-span-1 space-y-4">

            {/* Auth Token Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Key className="w-4 h-4 text-amber-400" />
                ngrok Authtoken
                {status.authtoken_configured && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3 h-3" /> CONFIGURED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Get your free token from{' '}
                <a href="https://dashboard.ngrok.com/get-started/your-authtoken"
                   target="_blank" rel="noreferrer"
                   className="text-cyan-400 hover:underline">
                  dashboard.ngrok.com
                </a>
              </p>
              <form onSubmit={handleSaveToken} className="space-y-2">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="2abc...xyz_xxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={tokenSaving || !tokenInput.trim()}
                  className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-semibold text-white transition-colors"
                >
                  {tokenSaving ? 'Saving…' : 'Save Authtoken'}
                </button>
              </form>
              {tokenMsg && (
                <p className={`text-[11px] font-mono ${tokenMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tokenMsg}
                </p>
              )}
            </div>

            {/* Tunnel Control Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Server className="w-4 h-4 text-cyan-400" />
                My Tunnel (Hub)
              </div>
              <p className="text-[11px] text-slate-500">
                Expose your backend so friends can register remotely and you can access it from anywhere.
              </p>

              {mainTunnel ? (
                <div className="space-y-2">
                  {/* Public URL */}
                  <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 space-y-1">
                    <div className="text-[10px] text-emerald-400 font-mono uppercase">Public URL (HTTPS)</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-emerald-300 font-mono break-all flex-1">
                        {mainTunnel.public_url}
                      </code>
                      <button onClick={() => handleCopy(mainTunnel.public_url, 'main_url')}
                              className="shrink-0 p-1 text-slate-400 hover:text-emerald-400">
                        {copied === 'main_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a href={mainTunnel.public_url} target="_blank" rel="noreferrer"
                         className="shrink-0 p-1 text-slate-400 hover:text-cyan-400">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span><Clock className="w-3 h-3 inline mr-1" />Uptime: {fmtUptime(mainTunnel.uptime_seconds)}</span>
                    <span>Port: {mainTunnel.local_port}</span>
                  </div>
                  <button
                    onClick={() => handleStopTunnel('main')}
                    disabled={tunnelStopping}
                    className="w-full py-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 text-xs font-semibold text-red-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <Link2Off className="w-3.5 h-3.5" />
                    {tunnelStopping ? 'Stopping…' : 'Stop Tunnel'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-400 font-mono w-16 shrink-0">Port</label>
                    <input
                      type="number"
                      value={tunnelPort}
                      onChange={e => setTunnelPort(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    onClick={handleStartTunnel}
                    disabled={tunnelStarting || !status.authtoken_configured}
                    className="w-full py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {tunnelStarting ? 'Starting Tunnel…' : 'Start ngrok Tunnel'}
                  </button>
                  {!status.authtoken_configured && (
                    <p className="text-[10px] text-amber-400 font-mono">
                      ⚠ Save your authtoken first.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* How-to for friends */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Shield className="w-4 h-4 text-violet-400" />
                Friend's Setup (Remote Agent)
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Share <code className="text-cyan-400">backend/webcam_agent.py</code> with your friend. They run:
              </p>
              <div className="bg-slate-950 rounded-lg p-3 font-mono text-[10px] text-emerald-300 space-y-1 leading-relaxed overflow-x-auto">
                <div className="text-slate-500"># Install once</div>
                <div>pip install pyngrok flask flask-cors</div>
                <div>pip install opencv-python qrcode pillow requests</div>
                <div className="text-slate-500 mt-2"># Run agent</div>
                <div>python webcam_agent.py \</div>
                <div className="pl-4">--hub {mainTunnel ? mainTunnel.public_url : 'https://YOUR-HUB.ngrok-free.app'} \</div>
                <div className="pl-4">--token THEIR_NGROK_TOKEN \</div>
                <div className="pl-4">--label "Campus Gate A"</div>
              </div>
              <div className="flex items-start gap-2 text-[10px] text-slate-500">
                <Zap className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
                The agent auto-registers here. You'll see their camera appear below within seconds.
              </div>
            </div>
          </div>

          {/* Right Column: Remote Nodes */}
          <div className="xl:col-span-2 space-y-4">

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Active Tunnels', value: status.active_tunnels, color: 'text-cyan-400' },
                { label: 'Remote Nodes', value: status.node_count, color: 'text-violet-400' },
                { label: 'Online Now', value: status.online_nodes, color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Nodes List */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Video className="w-4 h-4 text-violet-400" />
                  Registered Remote Nodes
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Auto-refreshes every 8s
                </span>
              </div>

              {status.nodes.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <Wifi className="w-10 h-10 text-slate-700 mx-auto" />
                  <p className="text-slate-500 text-sm">No remote nodes connected yet.</p>
                  <p className="text-slate-600 text-xs max-w-sm mx-auto">
                    Start your tunnel above, share the hub URL with a friend,
                    and have them run <code className="text-cyan-500">webcam_agent.py</code>.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {status.nodes.map(node => (
                    <div key={node.node_id} className="p-4 flex flex-wrap items-start gap-4 hover:bg-slate-800/30 transition-colors">
                      {/* Status indicator */}
                      <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                        node.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`} />

                      {/* Node info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-100">{node.label}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                            node.status === 'online'
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                          }`}>
                            {node.status === 'online' ? '● ONLINE' : '○ OFFLINE'}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                          <div>Node ID: <span className="text-slate-400">{node.node_id}</span></div>
                          <div>Camera ID: <span className="text-slate-400">{node.camera_id}</span></div>
                          <div>Last seen: <span className="text-slate-400">{fmtAgo(node.last_seen_ago_s)}</span></div>
                          <div>Registered: <span className="text-slate-400">{node.registered_at}</span></div>
                        </div>

                        {/* Stream URL */}
                        <div className="bg-slate-950 rounded-lg px-3 py-2 flex items-center gap-2">
                          <code className="text-[10px] text-cyan-300 font-mono truncate flex-1">
                            {node.stream_url}
                          </code>
                          <button onClick={() => handleCopy(node.stream_url, node.node_id + '_stream')}
                                  className="shrink-0 text-slate-500 hover:text-cyan-400">
                            {copied === node.node_id + '_stream' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <a href={node.stream_url} target="_blank" rel="noreferrer"
                             className="shrink-0 text-slate-500 hover:text-cyan-400">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleAddCamera(node)}
                          disabled={addingCamera === node.node_id || addedCamera.has(node.node_id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            addedCamera.has(node.node_id)
                              ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 cursor-default'
                              : 'bg-cyan-700 hover:bg-cyan-600 text-white disabled:opacity-50'
                          }`}
                        >
                          {addedCamera.has(node.node_id)
                            ? <><CheckCircle2 className="w-3 h-3" /> Added</>
                            : addingCamera === node.node_id
                            ? <><RefreshCw className="w-3 h-3 animate-spin" /> Adding…</>
                            : <><Plus className="w-3 h-3" /> Add to Cameras</>
                          }
                        </button>
                        <a
                          href={node.public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
                        >
                          <QrCode className="w-3 h-3" /> Open Feed
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Tunnels Table (if more than just 'main') */}
            {status.tunnels.length > 0 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-cyan-400" />
                  Active Tunnels
                </div>
                <div className="divide-y divide-slate-800">
                  {status.tunnels.map(t => (
                    <div key={t.name} className="px-4 py-3 flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200">{t.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          localhost:{t.local_port} → {t.public_url}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {fmtUptime(t.uptime_seconds)}
                      </div>
                      <button onClick={() => handleCopy(t.public_url, t.name)}
                              className="text-slate-500 hover:text-cyan-400 p-1">
                        {copied === t.name ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleStopTunnel(t.name)}
                              className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

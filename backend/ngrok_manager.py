"""
ngrok Tunnel Manager — City-Wide AI Traffic Engine
Manages pyngrok tunnels for secure multi-location webcam streaming.
Supports: start/stop tunnels, node registration, heartbeat tracking.
"""

import os
import json
import time
import threading
from pathlib import Path
from typing import Dict, Optional, List

try:
    from pyngrok import ngrok, conf, exception as ngrok_exc
    PYNGROK_AVAILABLE = True
except ImportError:
    PYNGROK_AVAILABLE = False
    print("[ngrok] pyngrok not installed. Run: pip install pyngrok")

# ── Storage path for persistent node registry ────────────────────────────────
_STORE_PATH = Path(__file__).parent / "ngrok_nodes.json"

# ── Shared secret for remote node authentication ─────────────────────────────
# Set via environment variable NGROK_NODE_SECRET (defaults to a dev secret)
NODE_SECRET = os.environ.get("NGROK_NODE_SECRET", "city-traffic-secure-2024")


class NgrokTunnelManager:
    """
    Manages ngrok tunnels and remote node registry.
    Thread-safe singleton instance is exported as `tunnel_manager`.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._tunnels: Dict[str, dict] = {}   # name → {url, port, started_at, process}
        self._nodes: Dict[str, dict] = {}     # node_id → {url, camera_id, last_seen, meta}
        self._authtoken_set = False
        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_cleaner, daemon=True
        )
        self._heartbeat_thread.start()
        self._load_nodes()

    # ── Auth ──────────────────────────────────────────────────────────────────
    def configure_authtoken(self, token: str) -> bool:
        """Set the ngrok authtoken. Persists to pyngrok config."""
        if not PYNGROK_AVAILABLE:
            return False
        try:
            conf.get_default().auth_token = token
            ngrok.set_auth_token(token)
            self._authtoken_set = True
            # Also write to .env so it survives restarts
            env_path = Path(__file__).parent.parent / ".env"
            lines = env_path.read_text().splitlines() if env_path.exists() else []
            filtered = [l for l in lines if not l.startswith("NGROK_AUTHTOKEN=")]
            filtered.append(f"NGROK_AUTHTOKEN={token}")
            env_path.write_text("\n".join(filtered) + "\n")
            print(f"[ngrok] Authtoken configured and saved to .env")
            return True
        except Exception as e:
            print(f"[ngrok] Auth error: {e}")
            return False

    def _try_load_authtoken(self):
        """Load authtoken from env if not already configured."""
        if self._authtoken_set or not PYNGROK_AVAILABLE:
            return
        token = os.environ.get("NGROK_AUTHTOKEN", "")
        if token:
            try:
                conf.get_default().auth_token = token
                self._authtoken_set = True
                print("[ngrok] Authtoken loaded from environment.")
            except Exception:
                pass

    # ── Tunnel Management ─────────────────────────────────────────────────────
    def start_tunnel(self, port: int, name: str = "main", proto: str = "http") -> dict:
        """Start an ngrok tunnel on the given port. Returns tunnel info."""
        if not PYNGROK_AVAILABLE:
            return {"error": "pyngrok not installed"}

        self._try_load_authtoken()

        with self._lock:
            # Kill existing tunnel with same name
            if name in self._tunnels:
                self._stop_tunnel_unsafe(name)

            try:
                tunnel = ngrok.connect(port, proto=proto, name=name)
                public_url = tunnel.public_url
                # Force HTTPS
                if public_url.startswith("http://"):
                    public_url = public_url.replace("http://", "https://", 1)

                self._tunnels[name] = {
                    "name": name,
                    "public_url": public_url,
                    "local_port": port,
                    "proto": proto,
                    "started_at": time.time(),
                    "started_at_str": time.strftime("%Y-%m-%d %H:%M:%S"),
                }
                print(f"[ngrok] Tunnel '{name}' started: {public_url} → localhost:{port}")
                return {"success": True, **self._tunnels[name]}
            except Exception as e:
                print(f"[ngrok] Failed to start tunnel '{name}': {e}")
                return {"error": str(e)}

    def stop_tunnel(self, name: str) -> dict:
        """Stop a named tunnel."""
        with self._lock:
            return self._stop_tunnel_unsafe(name)

    def _stop_tunnel_unsafe(self, name: str) -> dict:
        if name not in self._tunnels:
            return {"error": f"No tunnel named '{name}'"}
        try:
            info = self._tunnels[name]
            ngrok.disconnect(info["public_url"])
            del self._tunnels[name]
            print(f"[ngrok] Tunnel '{name}' stopped.")
            return {"success": True, "stopped": name}
        except Exception as e:
            # Force-remove from tracking even if disconnect fails
            self._tunnels.pop(name, None)
            return {"success": True, "warning": str(e)}

    def stop_all(self):
        """Stop all active tunnels."""
        with self._lock:
            for name in list(self._tunnels.keys()):
                self._stop_tunnel_unsafe(name)
        if PYNGROK_AVAILABLE:
            try:
                ngrok.kill()
            except Exception:
                pass

    def list_tunnels(self) -> List[dict]:
        """Return all active tunnels with uptime."""
        with self._lock:
            now = time.time()
            result = []
            for t in self._tunnels.values():
                entry = dict(t)
                entry["uptime_seconds"] = int(now - t["started_at"])
                result.append(entry)
            return result

    def get_public_url(self, name: str = "main") -> Optional[str]:
        """Get the public ngrok URL for a named tunnel."""
        with self._lock:
            t = self._tunnels.get(name)
            return t["public_url"] if t else None

    # ── Remote Node Registry ──────────────────────────────────────────────────
    def register_node(self, node_id: str, public_url: str, secret: str,
                      camera_id: str = "", label: str = "",
                      lat: float = 0.0, lng: float = 0.0,
                      ip: str = "") -> dict:
        """Register a remote webcam node. Returns success/error."""
        if secret != NODE_SECRET:
            return {"error": "Invalid node secret. Access denied."}

        with self._lock:
            self._nodes[node_id] = {
                "node_id": node_id,
                "public_url": public_url,
                "stream_url": f"{public_url}/video",
                "camera_id": camera_id or f"CAM-REMOTE-{node_id[:8].upper()}",
                "label": label or f"Remote Node {node_id[:6]}",
                "lat": lat,
                "lng": lng,
                "ip": ip,
                "registered_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "last_seen": time.time(),
                "status": "online",
            }
            self._save_nodes()
            print(f"[ngrok] Node registered: {node_id} → {public_url}")
            return {"success": True, "node": self._nodes[node_id]}

    def heartbeat_node(self, node_id: str, secret: str) -> dict:
        """Update last-seen timestamp for a registered node."""
        if secret != NODE_SECRET:
            return {"error": "Invalid node secret"}
        with self._lock:
            if node_id not in self._nodes:
                return {"error": "Node not registered"}
            self._nodes[node_id]["last_seen"] = time.time()
            self._nodes[node_id]["status"] = "online"
            return {"success": True}

    def unregister_node(self, node_id: str, secret: str) -> dict:
        """Remove a registered node."""
        if secret != NODE_SECRET:
            return {"error": "Invalid node secret"}
        with self._lock:
            if node_id in self._nodes:
                del self._nodes[node_id]
                self._save_nodes()
            return {"success": True}

    def list_nodes(self) -> List[dict]:
        """Return all registered remote nodes with live status."""
        with self._lock:
            now = time.time()
            result = []
            for n in self._nodes.values():
                entry = dict(n)
                age = now - n["last_seen"]
                entry["status"] = "online" if age < 90 else "offline"
                entry["last_seen_ago_s"] = int(age)
                result.append(entry)
            return result

    # ── Persistence ───────────────────────────────────────────────────────────
    def _save_nodes(self):
        try:
            _STORE_PATH.write_text(json.dumps(self._nodes, indent=2))
        except Exception as e:
            print(f"[ngrok] Node save error: {e}")

    def _load_nodes(self):
        try:
            if _STORE_PATH.exists():
                self._nodes = json.loads(_STORE_PATH.read_text())
                # Mark all as offline on startup (they must heartbeat to come back)
                for n in self._nodes.values():
                    n["status"] = "offline"
                print(f"[ngrok] Loaded {len(self._nodes)} node(s) from registry.")
        except Exception as e:
            print(f"[ngrok] Node load error: {e}")
            self._nodes = {}

    # ── Background Heartbeat Cleaner ──────────────────────────────────────────
    def _heartbeat_cleaner(self):
        """Mark nodes offline after 90s of no heartbeat."""
        while True:
            time.sleep(30)
            try:
                now = time.time()
                with self._lock:
                    changed = False
                    for n in self._nodes.values():
                        new_status = "online" if (now - n["last_seen"]) < 90 else "offline"
                        if n["status"] != new_status:
                            n["status"] = new_status
                            changed = True
                    if changed:
                        self._save_nodes()
            except Exception:
                pass

    # ── Status Summary ────────────────────────────────────────────────────────
    def get_status(self) -> dict:
        tunnels = self.list_tunnels()
        nodes = self.list_nodes()
        return {
            "pyngrok_available": PYNGROK_AVAILABLE,
            "authtoken_configured": self._authtoken_set or bool(os.environ.get("NGROK_AUTHTOKEN")),
            "active_tunnels": len(tunnels),
            "tunnels": tunnels,
            "node_count": len(nodes),
            "online_nodes": sum(1 for n in nodes if n["status"] == "online"),
            "nodes": nodes,
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
tunnel_manager = NgrokTunnelManager()

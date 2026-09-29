"""
City-Traffic Remote Webcam Agent
=================================
Run this script on any laptop to:
  1. Stream the webcam as an MJPEG HTTP feed on a local port
  2. Open a secure ngrok HTTPS tunnel to that feed
  3. Auto-register with the City-Traffic hub backend
  4. Send heartbeats every 30s to stay "online" in the dashboard

Usage:
    python webcam_agent.py --hub http://HUB_IP:5001 --token YOUR_NGROK_TOKEN --label "Campus Gate A"

Requirements:
    pip install flask flask-cors opencv-python pyngrok qrcode pillow requests
"""

import argparse
import os
import sys
import time
import uuid
import threading
import socket
import requests

try:
    import cv2
    import numpy as np
except ImportError:
    print("ERROR: opencv-python not installed. Run: pip install opencv-python")
    sys.exit(1)

try:
    from flask import Flask, Response
    from flask_cors import CORS
except ImportError:
    print("ERROR: flask/flask-cors not installed. Run: pip install flask flask-cors")
    sys.exit(1)

try:
    from pyngrok import ngrok, conf
except ImportError:
    print("ERROR: pyngrok not installed. Run: pip install pyngrok")
    sys.exit(1)

try:
    import qrcode
    QR_AVAILABLE = True
except ImportError:
    QR_AVAILABLE = False


# ── Node identity ─────────────────────────────────────────────────────────────
NODE_ID = str(uuid.uuid4())[:12]
LOCAL_PORT = 8765
NODE_SECRET = "city-traffic-secure-2024"  # Must match hub's NGROK_NODE_SECRET

# ── Flask webcam server ───────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

cap = None  # cv2.VideoCapture, initialised in main()


def generate_frames():
    global cap
    while True:
        if cap is None or not cap.isOpened():
            time.sleep(0.5)
            continue
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.1)
            continue
        # Overlay: node ID + timestamp
        ts = time.strftime("%H:%M:%S")
        cv2.putText(frame, f"NODE-{NODE_ID} | {ts}", (8, 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (6, 182, 212), 1, cv2.LINE_AA)
        _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 72])
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' +
               jpeg.tobytes() + b'\r\n')
        time.sleep(0.033)  # ~30 FPS


@app.route('/video')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/snapshot')
def snapshot():
    """Single JPEG frame — used by hub for AI detection."""
    global cap
    if cap is None or not cap.isOpened():
        return "Camera not ready", 503
    ret, frame = cap.read()
    if not ret:
        return "Frame read failed", 503
    _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return Response(jpeg.tobytes(), mimetype='image/jpeg')


@app.route('/health')
def health():
    return {"status": "ok", "node_id": NODE_ID, "ts": time.time()}


# ── Registration & heartbeat ──────────────────────────────────────────────────
def register_with_hub(hub_url: str, public_url: str, label: str,
                      lat: float, lng: float) -> bool:
    """POST registration to hub backend."""
    try:
        local_ip = socket.gethostbyname(socket.gethostname())
        payload = {
            "node_id": NODE_ID,
            "public_url": public_url,
            "secret": NODE_SECRET,
            "camera_id": f"CAM-REMOTE-{NODE_ID[:8].upper()}",
            "label": label,
            "lat": lat,
            "lng": lng,
            "ip": local_ip,
        }
        r = requests.post(f"{hub_url}/api/ngrok/register_node",
                          json=payload, timeout=10)
        if r.status_code == 200 and r.json().get("success"):
            print(f"[Agent] ✅ Registered with hub: {hub_url}")
            return True
        else:
            print(f"[Agent] ⚠️  Hub registration response: {r.text}")
            return False
    except Exception as e:
        print(f"[Agent] ⚠️  Hub registration failed: {e}")
        return False


def heartbeat_loop(hub_url: str):
    """Send heartbeat to hub every 30s."""
    while True:
        time.sleep(30)
        try:
            r = requests.post(f"{hub_url}/api/ngrok/heartbeat",
                              json={"node_id": NODE_ID, "secret": NODE_SECRET},
                              timeout=8)
            if r.status_code != 200:
                print(f"[Agent] Heartbeat warning: {r.status_code}")
        except Exception as e:
            print(f"[Agent] Heartbeat error: {e}")


def print_qr(url: str):
    """Print QR code for the stream URL in terminal."""
    if not QR_AVAILABLE:
        return
    try:
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
    except Exception:
        pass


# ── Flask runner in background thread ────────────────────────────────────────
def run_flask():
    app.run(host='0.0.0.0', port=LOCAL_PORT, debug=False, use_reloader=False)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    global cap

    parser = argparse.ArgumentParser(description="City-Traffic Remote Webcam Agent")
    parser.add_argument("--hub",    default="http://localhost:5001",
                        help="Hub backend URL (e.g. http://192.168.1.10:5001)")
    parser.add_argument("--token",  default="",
                        help="Your ngrok authtoken from https://dashboard.ngrok.com")
    parser.add_argument("--label",  default="Remote Camera Node",
                        help="Human-readable label for this camera")
    parser.add_argument("--cam",    default="0", type=str,
                        help="Webcam index (0=default) or RTSP URL")
    parser.add_argument("--lat",    default=17.4435, type=float)
    parser.add_argument("--lng",    default=78.3772, type=float)
    parser.add_argument("--port",   default=LOCAL_PORT, type=int,
                        help="Local port for the webcam HTTP server")
    args = parser.parse_args()

    print("=" * 60)
    print("  City-Traffic Remote Webcam Agent")
    print(f"  Node ID : {NODE_ID}")
    print(f"  Hub     : {args.hub}")
    print(f"  Label   : {args.label}")
    print("=" * 60)

    # 1. Open webcam
    cam_src = int(args.cam) if args.cam.isdigit() else args.cam
    cap = cv2.VideoCapture(cam_src)
    if not cap.isOpened():
        print(f"[Agent] ERROR: Could not open camera source '{cam_src}'")
        sys.exit(1)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    print(f"[Agent] ✅ Webcam opened (source={cam_src})")

    # 2. Start Flask in background
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    time.sleep(1.5)  # Wait for Flask to bind
    print(f"[Agent] ✅ Local MJPEG server: http://localhost:{args.port}/video")

    # 3. Configure ngrok and open tunnel
    if args.token:
        conf.get_default().auth_token = args.token
        ngrok.set_auth_token(args.token)

    print("[Agent] Opening ngrok tunnel...")
    try:
        tunnel = ngrok.connect(args.port, proto="http", name="webcam-agent")
        public_url = tunnel.public_url.replace("http://", "https://")
        stream_url = f"{public_url}/video"
    except Exception as e:
        print(f"[Agent] ERROR: Could not open ngrok tunnel: {e}")
        print("  → Make sure your authtoken is valid: ngrok config add-authtoken TOKEN")
        sys.exit(1)

    print(f"\n[Agent] ✅ SECURE STREAM URL:")
    print(f"         {stream_url}")
    print(f"\n[Agent] Scan this QR code to open the stream:\n")
    print_qr(stream_url)

    # 4. Register with hub (retry up to 5×)
    for attempt in range(5):
        if register_with_hub(args.hub, public_url, args.label, args.lat, args.lng):
            break
        print(f"[Agent] Retry {attempt + 1}/5 in 5s...")
        time.sleep(5)

    # 5. Start heartbeat thread
    hb_thread = threading.Thread(target=heartbeat_loop, args=(args.hub,), daemon=True)
    hb_thread.start()

    print(f"\n[Agent] Running. Press Ctrl+C to stop.\n")
    try:
        while True:
            time.sleep(10)
            print(f"[Agent] ❤  Alive | Stream: {stream_url}")
    except KeyboardInterrupt:
        print("\n[Agent] Shutting down...")
        try:
            requests.post(f"{args.hub}/api/ngrok/unregister_node",
                          json={"node_id": NODE_ID, "secret": NODE_SECRET},
                          timeout=5)
        except Exception:
            pass
        ngrok.kill()
        if cap:
            cap.release()
        print("[Agent] Done.")


if __name__ == "__main__":
    main()

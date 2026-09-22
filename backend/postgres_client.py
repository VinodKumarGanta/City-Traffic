"""
Neon Serverless PostgreSQL Client for Python AI Inference Engines
Allows YOLOv10 / ANPR pipelines to record detections and alerts into PostgreSQL.
"""

import os
import json
import urllib.request
import urllib.error

POSTGRES_REST_URL = os.environ.get(
    "VITE_NEON_POSTGRES_REST_URL",
    "https://ep-noisy-fog-b3qxo8fb.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1"
)
NEON_API_KEY = os.environ.get("VITE_NEON_API_KEY", "")

def get_headers():
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=minimal"
    }
    if NEON_API_KEY:
        headers["apikey"] = NEON_API_KEY
        headers["Authorization"] = f"Bearer {NEON_API_KEY}"
    return headers

def record_anpr_detection(detection_data):
    """
    Insert ANPR detection into Neon PostgreSQL anpr_detections table.
    """
    url = f"{POSTGRES_REST_URL}/anpr_detections"
    payload = json.dumps(detection_data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=get_headers(), method="POST")

    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return res.status in (200, 201, 204)
    except urllib.error.HTTPError as e:
        # print("PostgreSQL error:", e.code, e.read().decode('utf-8'))
        return False
    except Exception:
        return False

def test_neon_connection():
    """
    Test handshake with Neon PostgreSQL REST endpoint.
    """
    url = f"{POSTGRES_REST_URL}/cameras?limit=1"
    req = urllib.request.Request(url, headers=get_headers(), method="GET")

    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return True, f"HTTP {res.status} Connected to Neon PostgreSQL"
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return False, f"HTTP {e.code}: {error_body}"
    except Exception as e:
        return False, str(e)

if __name__ == "__main__":
    ok, msg = test_neon_connection()
    print("Neon PostgreSQL Connection Test:", "SUCCESS" if ok else "NOTICE")
    print("Details:", msg)

import urllib.request
import json

routes = [
    '/api/db/status',
    '/api/db/kpis',
    '/api/db/cameras',
    '/api/db/alerts',
    '/api/db/echallans',
    '/api/db/citizen-reports',
    '/api/db/corridors',
    '/api/db/predictive',
    '/api/db/trajectories',
    '/api/db/trajectories/TS07JH4821',
    '/api/db/analytics/od-matrix',
    '/api/db/analytics/sectors',
    '/api/db/analytics/hourly',
    '/api/db/analytics/vehicle-classes',
    '/api/db/green-corridors',
    '/api/db/detections'
]

print("Testing REST Endpoints on http://localhost:5001...")
for r in routes:
    req = urllib.request.Request('http://localhost:5001' + r)
    try:
        with urllib.request.urlopen(req, timeout=6) as res:
            data = json.loads(res.read().decode())
            count = len(data) if isinstance(data, list) else len(data.keys())
            print(f"  [200 OK] {r:35} -> {count} items/keys")
    except Exception as e:
        print(f"  [FAIL]   {r:35} -> {e}")

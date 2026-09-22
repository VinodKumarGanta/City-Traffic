-- ====================================================================
-- SMART CITY TRAFFIC & ANPR SURVEILLANCE ENGINE
-- PostgreSQL Database Schema for Neon Serverless
-- Endpoint: https://ep-noisy-fog-b3qxo8fb.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1
-- ====================================================================

-- 1. Camera Surveillance Nodes Table
CREATE TABLE IF NOT EXISTS cameras (
    id VARCHAR(50) PRIMARY KEY,
    sector_id VARCHAR(50) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) DEFAULT 'online',
    fps INT DEFAULT 30,
    total_detections_today INT DEFAULT 0,
    heading_deg INT DEFAULT 0,
    ip_address VARCHAR(50),
    model VARCHAR(50) DEFAULT 'YOLOv10-Edge',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Real-Time Traffic Alerts Table
CREATE TABLE IF NOT EXISTS traffic_alerts (
    id VARCHAR(50) PRIMARY KEY,
    timestamp VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    plate_number VARCHAR(50),
    camera_id VARCHAR(50),
    location_name VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    details TEXT,
    teleport_speed_kmh INT,
    status VARCHAR(20) DEFAULT 'active',
    assigned_operator VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Public E-Challans Table
CREATE TABLE IF NOT EXISTS echallans (
    id VARCHAR(50) PRIMARY KEY,
    challan_number VARCHAR(100) UNIQUE NOT NULL,
    plate_number VARCHAR(50) NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    fine_amount_inr INT NOT NULL,
    timestamp VARCHAR(50) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    camera_id VARCHAR(50),
    recorded_speed_kmh INT,
    speed_limit_kmh INT,
    status VARCHAR(20) DEFAULT 'pending',
    paid_at VARCHAR(50),
    payment_txn_id VARCHAR(100),
    dispute_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crowdsourced Citizen Incident Reports Table
CREATE TABLE IF NOT EXISTS citizen_reports (
    id VARCHAR(50) PRIMARY KEY,
    tracking_id VARCHAR(100) UNIQUE NOT NULL,
    timestamp VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_name VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'reported',
    votes INT DEFAULT 1,
    reported_by VARCHAR(100) DEFAULT 'Citizen',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Arterial Corridors Table
CREATE TABLE IF NOT EXISTS corridors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'clear',
    current_speed_kmh INT NOT NULL,
    normal_speed_kmh INT NOT NULL,
    travel_time_min INT NOT NULL,
    normal_travel_time_min INT NOT NULL,
    length_km DOUBLE PRECISION NOT NULL,
    congestion_percent INT DEFAULT 20,
    active_incidents INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ANPR Detection Stream Log Table
CREATE TABLE IF NOT EXISTS anpr_detections (
    id VARCHAR(50) PRIMARY KEY,
    timestamp VARCHAR(50) NOT NULL,
    plate_number VARCHAR(50) NOT NULL,
    plate_hash VARCHAR(100),
    camera_id VARCHAR(50) NOT NULL,
    camera_name VARCHAR(255),
    confidence DOUBLE PRECISION NOT NULL,
    speed_kmh INT NOT NULL,
    vehicle_color VARCHAR(50),
    vehicle_type VARCHAR(50),
    stn_applied BOOLEAN DEFAULT true,
    skew_angle DOUBLE PRECISION DEFAULT 0.0,
    ocr_execution_time_ms DOUBLE PRECISION DEFAULT 4.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- SEED DATA INITIALIZATION
-- ====================================================================

-- Seed Cameras (Andhra Pradesh & Telangana)
INSERT INTO cameras (id, sector_id, location_name, lat, lng, status, fps, total_detections_today, heading_deg, ip_address, model)
VALUES
  ('CAM-AP-VJA01', 'SEC-AP-VJA', 'Vijayawada - Benz Circle Flyover', 16.5002, 80.6477, 'online', 30, 64120, 90, '192.168.20.101', 'YOLOv10-Edge'),
  ('CAM-AP-VJA02', 'SEC-AP-VJA', 'Vijayawada - Kanaka Durga Varadhi NH-16', 16.5120, 80.6180, 'online', 29, 58900, 270, '192.168.20.102', 'YOLOv10-Edge'),
  ('CAM-AP-ELR01', 'SEC-AP-ELR', 'Eluru - Fire Station Junction', 16.7107, 81.0952, 'online', 30, 34200, 45, '192.168.20.103', 'YOLOv8-Edge'),
  ('CAM-AP-ELR02', 'SEC-AP-ELR', 'Eluru - Sanivarapupeta Old Bus Stand', 16.7150, 81.1020, 'online', 28, 29800, 180, '192.168.20.104', 'YOLOv8-Edge'),
  ('CAM-AP-RJY01', 'SEC-AP-RJY', 'Rajahmundry - Godavari Arch Bridge', 17.0005, 81.7750, 'online', 30, 51200, 315, '192.168.20.105', 'YOLOv10-Edge'),
  ('CAM-AP-RJY02', 'SEC-AP-RJY', 'Rajahmundry - Morampudi Junction NH-16', 16.9930, 81.8040, 'online', 30, 47600, 120, '192.168.20.106', 'YOLOv10-Edge'),
  ('CAM-AP-VZG01', 'SEC-AP-VZG', 'Visakhapatnam - RK Beach Promenade', 17.7120, 83.3180, 'online', 30, 68900, 60, '192.168.20.107', 'YOLOv10-Edge'),
  ('CAM-AP-GNT01', 'SEC-AP-GNT', 'Guntur - Lodge Center Intersection', 16.3067, 80.4365, 'online', 28, 42100, 135, '192.168.20.108', 'YOLOv8-Edge'),
  ('CAM-AP-TPT01', 'SEC-AP-TPT', 'Tirupati - Alipiri Tollgate Corridor', 13.6450, 79.4000, 'online', 30, 73400, 0, '192.168.20.109', 'YOLOv10-Edge'),
  ('CAM-101', 'SEC-NW', 'Hitech City Flyover', 17.4435, 78.3772, 'online', 30, 48520, 45, '192.168.10.101', 'YOLOv10-Edge'),
  ('CAM-102', 'SEC-NW', 'Cyber Towers Junction', 17.4504, 78.3808, 'online', 29, 62410, 120, '192.168.10.102', 'YOLOv10-Edge'),
  ('CAM-104', 'SEC-CC', 'Jubilee Hills Road No. 36', 17.4322, 78.4071, 'online', 28, 41900, 90, '192.168.10.104', 'YOLOv10-Edge'),
  ('CAM-106', 'SEC-CC', 'Panjagutta Flyover', 17.4266, 78.4523, 'online', 30, 74200, 330, '192.168.10.106', 'YOLOv10-Edge'),
  ('CAM-110', 'SEC-SW', 'Outer Ring Road Toll - Gachibowli', 17.4401, 78.3482, 'online', 30, 89300, 240, '192.168.10.110', 'YOLOv10-Edge')
ON CONFLICT (id) DO NOTHING;

-- Seed Active Traffic Alerts
INSERT INTO traffic_alerts (id, timestamp, type, title, severity, plate_number, camera_id, location_name, lat, lng, details, teleport_speed_kmh, status, assigned_operator)
VALUES
  ('ALT-AP-801', '10:45:12 AM', 'speeding', 'High Velocity Transit on NH-16 (112 km/h)', 'high', 'AP16TY9988', 'CAM-AP-VJA01', 'Vijayawada - Benz Circle Flyover', 16.5002, 80.6477, 'Vehicle clocked at 112 km/h in 60 km/h urban speed limit zone near Benz Circle.', NULL, 'active', NULL),
  ('ALT-AP-802', '10:43:50 AM', 'predictive', 'Tammileru Channel Traffic Bottleneck', 'medium', 'N/A', 'CAM-AP-ELR01', 'Eluru - Fire Station Junction', 16.7107, 81.0952, 'Heavy transit queue detected at Sanivarapupeta connector in Eluru.', NULL, 'active', NULL),
  ('ALT-AP-803', '10:41:20 AM', 'predictive', 'Godavari River Crossing Inflow Surge', 'critical', 'N/A', 'CAM-AP-RJY01', 'Rajahmundry - Godavari Arch Bridge', 17.0005, 81.7750, 'XGBoost predicts travel delay +14 mins on bridge approach due to interstate freight inflow.', NULL, 'active', NULL),
  ('ALT-9041', '10:39:18 AM', 'teleportation', 'Cloned Plate Anomaly (Spatial Teleportation)', 'critical', 'AP28KX4512', 'CAM-108', 'Paradise Circle → Hitech City', 17.4412, 78.4870, 'Plate recorded at CAM-101 and CAM-108 within 45s. Implied speed S = 520 km/h (>200 km/h limit). Likely cloned plate.', 520, 'investigating', 'Op-04 (Rajesh)')
ON CONFLICT (id) DO NOTHING;

-- Seed E-Challans
INSERT INTO echallans (id, challan_number, plate_number, violation_type, fine_amount_inr, timestamp, location_name, camera_id, recorded_speed_kmh, speed_limit_kmh, status, paid_at, payment_txn_id, dispute_reason)
VALUES
  ('ECH-AP-99881', 'AP-ECH-2026-88129', 'AP16TY9988', 'Speeding', 1500, 'Today, 10:45 AM', 'Vijayawada - Benz Circle Flyover (CAM-AP-VJA01)', 'CAM-AP-VJA01', 112, 60, 'pending', NULL, NULL, NULL),
  ('ECH-AP-99882', 'AP-ECH-2026-64102', 'AP16TY9988', 'Illegal Lane Departure', 1000, 'Yesterday, 04:20 PM', 'Eluru - Fire Station Junction (CAM-AP-ELR01)', 'CAM-AP-ELR01', 74, 50, 'pending', NULL, NULL, NULL),
  ('ECH-TG-48211', 'TG-ECH-2026-31908', 'TS07JH4821', 'Speeding', 1000, '15-Sep-2026, 10:15 AM', 'Outer Ring Road Toll - Gachibowli (CAM-110)', 'CAM-110', 104, 80, 'paid', '15-Sep-2026, 06:10 PM', 'TXN-UPI-9842103498', NULL),
  ('ECH-TG-12341', 'TG-ECH-2026-11492', 'AP39EF1234', 'Red Light', 1000, '14-Sep-2026, 09:30 AM', 'Paradise Circle (CAM-108)', 'CAM-108', NULL, NULL, 'pending', NULL, NULL, NULL),
  ('ECH-TG-88121', 'TG-ECH-2026-78219', 'KA04MH8812', 'Speeding', 2000, '13-Sep-2026, 09:50 AM', 'Mindspace Signal (CAM-103)', 'CAM-103', 75, 50, 'disputed', NULL, NULL, 'Calibration error reported on inductive speed loop.'),
  ('ECH-TG-45121', 'TG-ECH-2026-90412', 'AP28KX4512', 'Cloned Plate', 5000, 'Today, 10:39 AM', 'Paradise Circle → Hitech City', 'CAM-108', 520, 60, 'pending', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Crowdsourced Citizen Reports
INSERT INTO citizen_reports (id, tracking_id, timestamp, category, title, description, location_name, lat, lng, photo_url, status, votes, reported_by)
VALUES
  ('CIT-01', 'CIT-AP-8921', '12 mins ago', 'accident', 'Multi-Vehicle Fender Bender on Benz Circle Ramp', 'Two passenger sedans collided near the flyover entry ramp. Lane 2 partially blocked, emergency towing requested.', 'Benz Circle Flyover, Vijayawada', 16.5002, 80.6477, NULL, 'dispatched', 14, 'K. Sai Krishna (Commuter)'),
  ('CIT-02', 'CIT-AP-8922', '28 mins ago', 'waterlogging', 'Monsoon Waterlogging under Eluru Railway Overbridge', 'Storm drain overflow after heavy rain. 1.5ft water on road, two-wheelers diverting via Sanivarapupeta.', 'Sanivarapupeta Overbridge, Eluru', 16.7150, 81.1020, NULL, 'investigating', 27, 'M. Ramesh (Auto Driver)'),
  ('CIT-03', 'CIT-AP-8923', '45 mins ago', 'signal_failure', 'Flashing Amber / Signal Non-responsive at Morampudi', 'Traffic light controller stuck on flashing yellow. Congestion forming on NH-16 feeder.', 'Morampudi Junction NH-16, Rajahmundry', 16.9930, 81.8040, NULL, 'reported', 8, 'B. Venkat'),
  ('CIT-04', 'CIT-TG-7711', '1 hour ago', 'severe_pothole', 'Deep Trench / Road Cavity on Mindspace Feeder', 'Deep road cavity on extreme left lane causing sudden braking and near-misses.', 'Mindspace Signal, Hitech City', 17.4398, 78.3820, NULL, 'dispatched', 39, 'Deepak V.')
ON CONFLICT (id) DO NOTHING;

-- Seed Corridors
INSERT INTO corridors (id, name, city, status, current_speed_kmh, normal_speed_kmh, travel_time_min, normal_travel_time_min, length_km, congestion_percent, active_incidents)
VALUES
  ('COR-AP-01', 'Benz Circle to Ramavarappadu Ring (NH-16)', 'Vijayawada', 'moderate', 28, 50, 14, 8, 4.8, 58, 1),
  ('COR-AP-02', 'MG Road (Bandar Road) Arterial', 'Vijayawada', 'clear', 42, 45, 9, 8, 5.2, 22, 0),
  ('COR-AP-03', 'Kanaka Durga Varadhi to Krishna Barrage', 'Vijayawada', 'congested', 16, 45, 22, 9, 3.5, 78, 1),
  ('COR-AP-04', 'Fire Station to Sanivarapupeta (G.N.T Road)', 'Eluru', 'clear', 46, 50, 7, 6, 4.1, 18, 0),
  ('COR-AP-05', 'Eluru Old Bus Stand to Collectorate Rd', 'Eluru', 'moderate', 26, 40, 12, 8, 3.2, 52, 1),
  ('COR-AP-06', 'Godavari Fourth Bridge to Kovvur Bypass', 'Rajahmundry', 'clear', 52, 55, 8, 7, 6.4, 15, 0),
  ('COR-AP-07', 'Morampudi NH-16 to Kotipalli Bus Stand', 'Rajahmundry', 'congested', 18, 45, 21, 10, 4.6, 74, 1),
  ('COR-TG-01', 'Gachibowli to Hitech City Flyover', 'Hyderabad', 'congested', 14, 45, 26, 10, 4.2, 82, 2)
ON CONFLICT (id) DO NOTHING;

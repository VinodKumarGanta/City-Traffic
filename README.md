# City-Wide AI Traffic Management Engine 🚦🚗

An intelligent, real-time city traffic monitoring and management platform powered by Computer Vision, AI inference, and IoT edge stream analytics. Built with a modern React + TypeScript dashboard and a Python backend for live camera feed processing, vehicle classification, and accident detection.

---

## 🌟 Key Features

- **Real-Time Traffic Dashboard**: Interactive maps with live sensor streams, congestion density heatmaps, and junction camera monitoring powered by Leaflet and Recharts.
- **AI-Powered Incident Detection**: Edge AI models detecting vehicle accidents and traffic anomalies in real-time.
- **Vehicle Re-Identification & Classification**: Fine-tuned classification model (`VeRi`) identifying vehicle classes, density, and flow rates.
- **Adaptive Signal Control**: Signal optimization algorithms and dynamic phase switching recommendations based on live congestion metrics.
- **Database & Cloud Edge Persistence**: Neon Serverless PostgreSQL integration for historical traffic logging, anomaly tracking, and system telemetry.

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS, Lucide Icons, Framer Motion
- **Mapping & Visuals**: React Leaflet, Recharts, Canvas Confetti
- **Linting & Tooling**: Oxlint

### Backend & AI
- **Python Backend**: Live camera streaming (`live_camera_stream.py`), API endpoints (`test_endpoints.py`), database client (`postgres_client.py`)
- **Computer Vision & Inference**: PyTorch models for accident detection (`accident_detection_model.pth`) and vehicle classification (`veri_vehicle_classifier.pth`)
- **Database**: PostgreSQL / Neon Serverless SQL (`database/schema.sql`, `database/run_migration.py`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) & npm
- Python 3.9+ (with PyTorch, OpenCV, psycopg2 / asyncpg if using backend)

### 1. Frontend Setup
```bash
# Install dependencies
npm install

# Run the frontend development server
npm run dev
```
The frontend dashboard will be available at `http://localhost:5173`.

### 2. Backend & AI Engine Setup
```bash
# Navigate to backend or root
# Setup virtual environment (recommended)
python -m venv venv
venv\Scripts\activate  # Windows (or source venv/bin/activate on Linux/macOS)

# Install required python packages
pip install torch torchvision opencv-python psycopg2-binary python-dotenv

# Run the live stream / inference service
python backend/live_camera_stream.py
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your connection details:
```bash
cp .env.example .env
```

---

## 📁 Repository Structure

```
City-Traffic/
├── backend/                  # Python backend, streaming, and AI training scripts
│   ├── live_camera_stream.py
│   ├── model_inference.py
│   ├── postgres_client.py
│   └── train_*.py
├── database/                 # SQL schemas & database migration scripts
│   ├── migrations/
│   ├── run_migration.py
│   └── schema.sql
├── models/                   # Trained PyTorch model checkpoints & metrics
│   ├── accident_detection_model.pth
│   └── veri_vehicle_classifier.pth
├── src/                      # React frontend application
│   ├── components/           # UI widgets, map overlays, navigation
│   ├── views/                # Dashboard views and camera monitors
│   ├── services/             # API services and data providers
│   └── types/                # TypeScript type definitions
├── .env.example              # Template environment file
├── package.json              # NPM dependencies and scripts
└── vite.config.ts            # Vite build configuration
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).

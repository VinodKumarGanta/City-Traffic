# Custom Model & Dataset Directory

Place your custom AI model files and datasets in this directory structure:

## Directory Structure:
- `d:/City-Traffic/models/`:
  - `yolov8_plate_detector.pt` / `.onnx` / `.engine` (Object localization weights)
  - `stn_perspective_de_skew.pth` (STN Perspective Transformation weights)
  - `crnn_lprnet_ocr.pth` (Deep OCR sequence recognition weights)
  - `xgboost_congestion_forecast.pkl` (Traffic prediction model weights)

- `d:/City-Traffic/datasets/`:
  - License plate image captures (`.jpg`, `.png`)
  - Traffic corridor volume CSV logs (`traffic_corridors.csv`)

## Python Inference Server (`backend/model_inference.py`):
Run `python backend/model_inference.py` to stream live inference detections directly into the Web GIS Dashboard over WebSocket / REST API.

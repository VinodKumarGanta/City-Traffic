"""
City-Wide AI Engine - Custom Model & Dataset Inference Bridge
Loads custom PyTorch (.pt), ONNX (.onnx), or Pickle (.pkl) models from d:/City-Traffic/models/
and dataset samples from d:/City-Traffic/datasets/
"""

import os
import json
import time
import math

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
DATASETS_DIR = os.path.join(os.path.dirname(__file__), "..", "datasets")

def check_available_models():
    """Scans d:/City-Traffic/models for custom model files."""
    available = {
        "yolo_detection": [],
        "stn_skew_rectification": [],
        "crnn_ocr": [],
        "xgboost_prediction": []
    }
    
    if os.path.exists(MODELS_DIR):
        for f in os.listdir(MODELS_DIR):
            ext = os.path.splitext(f)[1].lower()
            if ext in ['.pt', '.onnx', '.engine', '.pth', '.pkl', '.h5']:
                if 'yolo' in f.lower() or 'detect' in f.lower():
                    available["yolo_detection"].append(f)
                elif 'stn' in f.lower() or 'skew' in f.lower():
                    available["stn_skew_rectification"].append(f)
                elif 'ocr' in f.lower() or 'crnn' in f.lower() or 'lpr' in f.lower():
                    available["crnn_ocr"].append(f)
                elif 'xgb' in f.lower() or 'predict' in f.lower() or 'forecast' in f.lower():
                    available["xgboost_prediction"].append(f)
                else:
                    available["yolo_detection"].append(f)
    return available

def load_custom_dataset_samples():
    """Scans d:/City-Traffic/datasets for custom images and CSV logs."""
    samples = []
    if os.path.exists(DATASETS_DIR):
        for root, _, files in os.walk(DATASETS_DIR):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.csv')):
                    samples.append(os.path.join(root, file))
    return samples

if __name__ == "__main__":
    print("=" * 60)
    print("     City-Wide AI Engine - Custom Model & Dataset Loader    ")
    print("=" * 60)
    
    models = check_available_models()
    datasets = load_custom_dataset_samples()
    
    print(f"\n📂 Models Directory: {os.path.abspath(MODELS_DIR)}")
    print(f"📂 Datasets Directory: {os.path.abspath(DATASETS_DIR)}")
    
    print("\n[AI Model Status]")
    for category, files in models.items():
        if files:
            print(f"  ✓ {category}: Found {len(files)} file(s) -> {files}")
        else:
            print(f"  ℹ {category}: No custom file found (Using pre-configured AI engine parameters)")
            
    print(f"\n[Dataset Samples Status]: Found {len(datasets)} sample file(s)")
    print("\n✓ Platform Ready! You can copy your .pt / .onnx / .pkl model files into d:/City-Traffic/models/")

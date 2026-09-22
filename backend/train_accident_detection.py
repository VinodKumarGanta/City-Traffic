"""
===================================================================================
City-Wide AI Engine - Real-Time Accident Detection & Traffic Analysis Pipeline
Adapted from notebook: real-time-accident-detection-and-traffic-analysis.ipynb
Task: Deep Learning Accident Classifier, Severity Estimator & Risk Tracker
===================================================================================
"""

import os
import json
import time
import numpy as np

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader

# -----------------------------------------------------------------------------------
# 1. MODEL SAVE PATHS & CONFIGURATION
# -----------------------------------------------------------------------------------
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_SAVE_PATH = os.path.join(MODELS_DIR, "accident_detection_model.pth")
METRICS_SAVE_PATH = os.path.join(MODELS_DIR, "accident_model_metrics.json")

# -----------------------------------------------------------------------------------
# 2. ACCIDENT RISK FEATURE EXTRACTOR & SYNTHETIC DATA ENGINE
# Features: [Speed Drop, Direction Angle Change, Vehicle Proximity, Area Expansion, Density]
# -----------------------------------------------------------------------------------
def generate_accident_feature_dataset(num_samples=5000):
    """Generates feature representations derived from vehicle tracking telemetry."""
    print(f"[+] Generating {num_samples} vehicle collision & anomaly feature samples...")
    np.random.seed(42)
    
    # 50% normal traffic, 50% accident/collision instances
    num_normal = num_samples // 2
    num_accident = num_samples - num_normal
    
    # Normal traffic features: low speed change, minor direction angle, safe distance
    normal_speed_drop = np.random.normal(loc=0.1, scale=0.08, size=(num_normal, 1))
    normal_dir_change = np.random.normal(loc=10.0, scale=5.0, size=(num_normal, 1))
    normal_proximity = np.random.normal(loc=120.0, scale=30.0, size=(num_normal, 1))
    normal_area_ratio = np.random.normal(loc=1.0, scale=0.1, size=(num_normal, 1))
    normal_density = np.random.normal(loc=0.3, scale=0.1, size=(num_normal, 1))
    
    X_normal = np.hstack([normal_speed_drop, normal_dir_change, normal_proximity, normal_area_ratio, normal_density])
    y_normal = np.zeros((num_normal, 1))
    
    # Accident features: sudden speed drop (>70%), sharp direction angle (>45 deg), close collision distance (<50px)
    acc_speed_drop = np.random.normal(loc=0.75, scale=0.15, size=(num_accident, 1))
    acc_dir_change = np.random.normal(loc=65.0, scale=15.0, size=(num_accident, 1))
    acc_proximity = np.random.normal(loc=25.0, scale=12.0, size=(num_accident, 1))
    acc_area_ratio = np.random.normal(loc=1.6, scale=0.3, size=(num_accident, 1))
    acc_density = np.random.normal(loc=0.85, scale=0.1, size=(num_accident, 1))
    
    X_accident = np.hstack([acc_speed_drop, acc_dir_change, acc_proximity, acc_area_ratio, acc_density])
    y_accident = np.ones((num_accident, 1))
    
    X = np.vstack([X_normal, X_accident])
    y = np.vstack([y_normal, y_accident])
    
    # Shuffle
    indices = np.arange(num_samples)
    np.random.shuffle(indices)
    
    return X[indices], y[indices]

# -----------------------------------------------------------------------------------
# 3. DEEP LEARNING ACCIDENT DETECTION MODEL (PyTorch Architecture)
# -----------------------------------------------------------------------------------
class AccidentClassifierNet(nn.Module):
    """Deep Neural Network matching the notebook's Dense + BatchNorm + Dropout architecture."""
    def __init__(self, input_dim=5):
        super(AccidentClassifierNet, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),
            
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.3),
            
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.2),
            
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.net(x)

# -----------------------------------------------------------------------------------
# 4. TRAINING & EVALUATION PIPELINE
# -----------------------------------------------------------------------------------
def train_accident_model(epochs=15, batch_size=64):
    print("=" * 65)
    print("     Real-Time Accident Detection Model Training Pipeline      ")
    print("=" * 65)

    X, y = generate_accident_feature_dataset(num_samples=6000)
    
    # 80/20 Train/Test Split
    split_idx = int(0.8 * len(X))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    # Convert to PyTorch Tensors
    train_dataset = TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.float32))
    test_dataset = TensorDataset(torch.tensor(X_test, dtype=torch.float32), torch.tensor(y_test, dtype=torch.float32))

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[+] Device: {device}")

    model = AccidentClassifierNet(input_dim=5).to(device)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)

    print("\n[+] Training Accident Classification Model...")
    start_time = time.time()

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        correct = 0
        total = 0

        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)

            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * batch_x.size(0)
            preds = (outputs >= 0.5).float()
            correct += (preds == batch_y).sum().item()
            total += batch_x.size(0)

        epoch_loss = train_loss / total
        epoch_acc = (correct / total) * 100

        if (epoch + 1) % 5 == 0 or epoch == epochs - 1:
            print(f"Epoch [{epoch+1}/{epochs}] - Loss: {epoch_loss:.4f} | Training Accuracy: {epoch_acc:.2f}%")

    training_duration = time.time() - start_time
    print(f"[OK] Model trained in {training_duration:.2f} seconds.")

    # Evaluation on Test Set
    print("\n[+] Evaluating Model on Test Set...")
    model.eval()
    test_loss = 0.0
    test_correct = 0
    test_total = 0

    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)

            test_loss += loss.item() * batch_x.size(0)
            preds = (outputs >= 0.5).float()
            test_correct += (preds == batch_y).sum().item()
            test_total += batch_x.size(0)

    final_accuracy = (test_correct / test_total) * 100
    final_loss = test_loss / test_total

    print(f"\n[Test Set Results]")
    print(f"  * Test Loss: {final_loss:.4f}")
    print(f"  * Test Classification Accuracy: {final_accuracy:.2f}%")

    # Export Model & Metrics
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    
    metrics = {
        "model": "Deep Learning Accident Classifier (Dense + BatchNorm + Dropout)",
        "features": ["Speed Drop", "Direction Change", "Vehicle Distance", "Area Ratio", "Traffic Density"],
        "accuracy": f"{final_accuracy:.2f}%",
        "loss": f"{final_loss:.4f}",
        "saved_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    with open(METRICS_SAVE_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n[OK] Saved accident detection model weights to: {MODEL_SAVE_PATH}")
    print(f"[OK] Saved metrics to: {METRICS_SAVE_PATH}")

if __name__ == "__main__":
    train_accident_model(epochs=15, batch_size=64)

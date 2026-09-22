"""
===================================================================================
City-Wide AI Engine - VeRi-776 Deep Learning Training & Evaluation Pipeline
Task: Vehicle Type & Color Multi-Task Classifier & Trajectory Embedding Model
Dataset Path: D:/archive/VeRi
===================================================================================
"""

import os
import xml.etree.ElementTree as ET
from PIL import Image
import json
import time

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models

# -----------------------------------------------------------------------------------
# 1. DATASET PATHS & CONFIGURATION
# -----------------------------------------------------------------------------------
DATASET_DIR = r"D:\archive\VeRi"
TRAIN_XML = os.path.join(DATASET_DIR, "train_label.xml")
TEST_XML = os.path.join(DATASET_DIR, "test_label.xml")
TRAIN_IMG_DIR = os.path.join(DATASET_DIR, "image_train")
TEST_IMG_DIR = os.path.join(DATASET_DIR, "image_test")

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
os.makedirs(MODELS_DIR, exist_ok=True)

# Color & Type Class Mappings from VeRi specifications
COLOR_MAP = {
    1: 'yellow', 2: 'orange', 3: 'green', 4: 'gray', 5: 'red',
    6: 'blue', 7: 'white', 8: 'golden', 9: 'brown', 10: 'black'
}

TYPE_MAP = {
    1: 'sedan', 2: 'suv', 3: 'van', 4: 'hatchback', 5: 'mpv',
    6: 'pickup', 7: 'bus', 8: 'truck', 9: 'estate'
}

# -----------------------------------------------------------------------------------
# 2. XML ANNOTATION PARSER WITH ROBUST ENCODING HANDLING
# -----------------------------------------------------------------------------------
def parse_veri_xml(xml_path, img_dir):
    """Parses VeRi XML label files into structured Python dict items with gb2312 support."""
    print(f"[+] Parsing annotations from {xml_path}...")
    
    with open(xml_path, "r", encoding="gb2312", errors="ignore") as f:
        xml_content = f.read()
    
    # Strip XML encoding header if present to avoid parser conflicts
    if xml_content.startswith("<?xml"):
        xml_content = xml_content.split("?>", 1)[-1]
        
    root = ET.fromstring(xml_content)
    
    items = []
    items_node = root.find("Items")
    if items_node is not None:
        for item in items_node.findall("Item"):
            img_name = item.attrib.get("imageName")
            img_path = os.path.join(img_dir, img_name)
            
            if os.path.exists(img_path):
                # Class IDs are 1-indexed in XML, map to 0-indexed for PyTorch
                color_id = int(item.attrib.get("colorID", 1)) - 1
                type_id = int(item.attrib.get("typeID", 1)) - 1
                vehicle_id = item.attrib.get("vehicleID", "0000")
                camera_id = item.attrib.get("cameraID", "c001")
                
                items.append({
                    "image_path": img_path,
                    "image_name": img_name,
                    "vehicle_id": vehicle_id,
                    "camera_id": camera_id,
                    "color_id": max(0, min(color_id, 9)),
                    "type_id": max(0, min(type_id, 8))
                })
                
    print(f"[OK] Validated {len(items)} samples in dataset.")
    return items

# -----------------------------------------------------------------------------------
# 3. PYTORCH DATASET CLASS
# -----------------------------------------------------------------------------------
class VeRiDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        image = Image.open(sample["image_path"]).convert("RGB")
        
        if self.transform:
            image = self.transform(image)
            
        color_label = torch.tensor(sample["color_id"], dtype=torch.long)
        type_label = torch.tensor(sample["type_id"], dtype=torch.long)
        
        return image, color_label, type_label

# -----------------------------------------------------------------------------------
# 4. MULTI-TASK DEEP LEARNING MODEL ARCHITECTURE
# -----------------------------------------------------------------------------------
class VeRiMultiTaskClassifier(nn.Module):
    """MobileNetV3 / ResNet Backbone with dual heads for Color & Type classification."""
    def __init__(self, num_colors=10, num_types=9):
        super(VeRiMultiTaskClassifier, self).__init__()
        # Load lightweight MobileNetV3 backbone
        backbone = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        in_features = backbone.classifier[0].in_features
        self.features = backbone.features
        self.avgpool = backbone.avgpool
        
        # Dual Classification Heads
        self.color_head = nn.Sequential(
            nn.Linear(in_features, 128),
            nn.Hardswish(),
            nn.Dropout(0.2),
            nn.Linear(128, num_colors)
        )
        
        self.type_head = nn.Sequential(
            nn.Linear(in_features, 128),
            nn.Hardswish(),
            nn.Dropout(0.2),
            nn.Linear(128, num_types)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        
        color_out = self.color_head(x)
        type_out = self.type_head(x)
        
        return color_out, type_out

# -----------------------------------------------------------------------------------
# 5. MODEL TRAINING & EVALUATION PIPELINE
# -----------------------------------------------------------------------------------
def train_and_evaluate_model(epochs=2, batch_size=32, max_samples=3000):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n[+] Training Device: {device}")
    
    # Data Augmentations
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # Parse dataset
    train_samples = parse_veri_xml(TRAIN_XML, TRAIN_IMG_DIR)[:max_samples]
    test_samples = parse_veri_xml(TEST_XML, TEST_IMG_DIR)[:max_samples // 4]

    train_dataset = VeRiDataset(train_samples, transform=train_transform)
    test_dataset = VeRiDataset(test_samples, transform=test_transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    # Instantiate Model, Loss & Optimizer
    model = VeRiMultiTaskClassifier(num_colors=10, num_types=9).to(device)
    criterion_color = nn.CrossEntropyLoss()
    criterion_type = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)

    print("\n[+] Starting Model Training Loop...")
    start_time = time.time()

    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        color_correct = 0
        type_correct = 0
        total = 0

        for images, color_labels, type_labels in train_loader:
            images = images.to(device)
            color_labels = color_labels.to(device)
            type_labels = type_labels.to(device)

            optimizer.zero_grad()
            color_preds, type_preds = model(images)

            loss_c = criterion_color(color_preds, color_labels)
            loss_t = criterion_type(type_preds, type_labels)
            loss = loss_c + loss_t

            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, c_pred_idx = torch.max(color_preds, 1)
            _, t_pred_idx = torch.max(type_preds, 1)

            color_correct += (c_pred_idx == color_labels).sum().item()
            type_correct += (t_pred_idx == type_labels).sum().item()
            total += images.size(0)

        epoch_loss = running_loss / total
        color_acc = (color_correct / total) * 100
        type_acc = (type_correct / total) * 100

        print(f"Epoch [{epoch+1}/{epochs}] - Loss: {epoch_loss:.4f} | Color Acc: {color_acc:.2f}% | Type Acc: {type_acc:.2f}%")

    training_time = time.time() - start_time
    print(f"[OK] Training completed in {training_time:.1f} seconds.")

    # Model Evaluation
    print("\n[+] Evaluating Model on Test Dataset...")
    model.eval()
    test_color_correct = 0
    test_type_correct = 0
    test_total = 0

    with torch.no_grad():
        for images, color_labels, type_labels in test_loader:
            images = images.to(device)
            color_labels = color_labels.to(device)
            type_labels = type_labels.to(device)

            color_preds, type_preds = model(images)
            _, c_pred_idx = torch.max(color_preds, 1)
            _, t_pred_idx = torch.max(type_preds, 1)

            test_color_correct += (c_pred_idx == color_labels).sum().item()
            test_type_correct += (t_pred_idx == type_labels).sum().item()
            test_total += images.size(0)

    final_color_acc = (test_color_correct / test_total) * 100
    final_type_acc = (test_type_correct / test_total) * 100

    print(f"\n[Test Set Results]")
    print(f"  * Color Classification Accuracy: {final_color_acc:.2f}%")
    print(f"  * Vehicle Type Accuracy: {final_type_acc:.2f}%")

    # Save Model Weights & Metrics
    saved_model_path = os.path.join(MODELS_DIR, "veri_vehicle_classifier.pth")
    torch.save(model.state_dict(), saved_model_path)
    
    metrics = {
        "model_architecture": "MobileNetV3 Multi-Task Classifier",
        "dataset": "VeRi-776 Benchmark",
        "total_train_samples": len(train_samples),
        "total_test_samples": len(test_samples),
        "test_color_accuracy": f"{final_color_acc:.2f}%",
        "test_type_accuracy": f"{final_type_acc:.2f}%",
        "saved_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open(os.path.join(MODELS_DIR, "veri_model_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n[OK] Saved trained model weights to: {saved_model_path}")
    print(f"[OK] Metrics saved to: {os.path.join(MODELS_DIR, 'veri_model_metrics.json')}")

if __name__ == "__main__":
    train_and_evaluate_model(epochs=2, batch_size=32, max_samples=3000)

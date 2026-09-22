# train_kaggle_iot_edge.py
"""Training pipeline for the Kaggle IoT Edge dataset.

- Loads CSV from Kaggle cache.
- Preprocesses timestamps, encodes categorical columns, scales numeric features.
- Uses `event_type` as the target (multi‑class classification).
- Splits data (80/20) with stratification.
- Trains an XGBoost classifier (default modest hyper‑parameters).
- Evaluates accuracy, weighted F1 and produces a classification report.
- Saves the trained model (joblib) and metrics (JSON) into `models/`.
"""

import os
import json
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
import joblib
from xgboost import XGBClassifier

# ---------------------------------------------------------------------------
# Configurable paths
# ---------------------------------------------------------------------------
# Kaggle dataset location (downloaded by kagglehub)
KAGGLE_DATASET_PATH = Path(
    r"C:\\Users\\hi\\.cache\\kagglehub\\datasets\\ziya07\\iot-edge-processed-traffic-and-incident-dataset\\versions\\1\\iot_edge_computing_public_management.csv"
)

# Output directories
MODEL_DIR = Path(__file__).parents[1] / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "kaggle_iot_edge_model.pkl"
METRICS_PATH = MODEL_DIR / "kaggle_iot_edge_metrics.json"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
def load_data(csv_path: Path) -> pd.DataFrame:
    if not csv_path.is_file():
        raise FileNotFoundError(f"Dataset not found at {csv_path}")
    df = pd.read_csv(csv_path)
    return df

def preprocess(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, LabelEncoder, dict, StandardScaler]:
    # Target column
    target_col = "event_type"
    if target_col not in df.columns:
        raise KeyError(f"Target column '{target_col}' not in dataset")
    y = df[target_col]
    X = df.drop(columns=[target_col])

    # Timestamp -> datetime features
    if "timestamp" in X.columns:
        X["timestamp"] = pd.to_datetime(X["timestamp"], errors="coerce")
        X["hour"] = X["timestamp"].dt.hour
        X["day_of_week"] = X["timestamp"].dt.dayofweek
        X = X.drop(columns=["timestamp"])

    # Encode categorical columns (sensor_id, traffic_pattern, incident_report, accident_hotspot)
    cat_cols = [c for c in X.columns if X[c].dtype == object]
    cat_encoders = {}
    for col in cat_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str)).astype(int)
        cat_encoders[col] = le

    # Identify numeric columns (float or int) for scaling
    numeric_cols = X.select_dtypes(include=["float64", "int64"]).columns.tolist()
    scaler = StandardScaler()
    X[numeric_cols] = scaler.fit_transform(X[numeric_cols])

    # Encode target
    target_le = LabelEncoder()
    y_enc = target_le.fit_transform(y.astype(str))

    return X, y_enc, target_le, cat_encoders, scaler

def train_model(X_train, y_train) -> XGBClassifier:
    model = XGBClassifier(
        max_depth=5,
        n_estimators=200,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="multi:softprob",
        eval_metric="mlogloss",
        use_label_encoder=False,
        n_jobs=4,
        random_state=42,
    )
    model.fit(X_train, y_train)
    return model

def evaluate(model, X_test, y_test, target_encoder) -> dict:
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average="weighted")
    report = classification_report(y_test, preds, target_names=target_encoder.classes_, output_dict=True)
    cm = confusion_matrix(y_test, preds).tolist()
    return {
        "accuracy": acc,
        "weighted_f1": f1,
        "classification_report": report,
        "confusion_matrix": cm,
    }

def main():
    print("Loading dataset...")
    df = load_data(KAGGLE_DATASET_PATH)
    print(f"Dataset shape: {df.shape}")

    print("Preprocessing...")
    X, y, target_le, cat_encoders, scaler = preprocess(df)

    print("Splitting data (80/20 stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("Training XGBoost model...")
    model = train_model(X_train, y_train)

    print("Evaluating...")
    metrics = evaluate(model, X_test, y_test, target_le)
    print(json.dumps(metrics, indent=2))

    print(f"Saving model to {MODEL_PATH}")
    joblib.dump({
        "model": model,
        "target_encoder": target_le,
        "cat_encoders": cat_encoders,
        "scaler": scaler,
    }, MODEL_PATH)

    print(f"Saving metrics to {METRICS_PATH}")
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("Done.")

if __name__ == "__main__":
    main()

import os

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from data_loader import load_training_data

# Feature order must stay consistent across train and predict
FEATURE_KEYS = ["requestsPerMin", "failureRate", "uniqueIPs", "avgResponseTime"]

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.pkl")

# Small cold-start set only when DB has < 50 usable rows and no disk model (TASK 2 / TASK 7)
SYNTHETIC_FALLBACK = [
    [6, 0.03, 1, 160],
    [9, 0.05, 2, 185],
    [11, 0.07, 2, 205],
    [8, 0.04, 1, 175],
    [10, 0.06, 3, 198],
    [7, 0.03, 2, 170],
    [12, 0.08, 2, 210],
    [9, 0.05, 1, 190],
    [10, 0.06, 2, 200],
    [8, 0.05, 3, 188],
    [11, 0.07, 1, 208],
    [9, 0.04, 2, 192],
    [10, 0.09, 2, 202],
    [7, 0.04, 1, 168],
    [13, 0.06, 3, 218],
    [8, 0.06, 2, 182],
    [10, 0.05, 2, 196],
    [9, 0.07, 1, 194],
    [11, 0.08, 2, 212],
    [8, 0.03, 1, 178],
    [10, 0.07, 3, 204],
    [9, 0.06, 2, 196],
    [12, 0.05, 2, 214],
    [8, 0.05, 1, 180],
    [10, 0.06, 2, 200],
    [14, 0.55, 8, 1200],
    [16, 0.62, 9, 1500],
    [18, 0.58, 10, 1300],
]

_model = None


def _build_model():
    return IsolationForest(
        n_estimators=100,
        contamination=0.1,
        random_state=42,
    )


def save_model():
    global _model
    if _model is None:
        print("[MODEL] save_model skipped — no model in memory")
        return
    joblib.dump(_model, MODEL_PATH)
    print("[MODEL] Saved")


def train_model_from_db(allow_disk_fallback=True):
    """
    Fit IsolationForest from MongoDB feature history.
    If rows < 50: restore model.pkl when allow_disk_fallback and file exists, else synthetic.
    Returns True if a new model was fit (caller should save), False if restored prior weights.
    """
    global _model
    previous = _model
    X = load_training_data()

    used_synthetic = False
    if X.shape[0] < 50:
        if allow_disk_fallback and os.path.isfile(MODEL_PATH):
            try:
                _model = joblib.load(MODEL_PATH)
                print("[MODEL] Insufficient new data — restored from disk")
                return False
            except Exception as e:
                print(f"[MODEL] Disk fallback failed: {e}")
        print("[MODEL] Insufficient real data — using synthetic cold-start")
        X = np.array(SYNTHETIC_FALLBACK, dtype=np.float64)
        used_synthetic = True

    print(f"[MODEL] Training on {X.shape[0]} samples")
    try:
        m = _build_model()
        m.fit(X)
        _model = m
        if used_synthetic:
            print("[MODEL] Trained on synthetic cold-start set")
        return True
    except Exception as e:
        print(f"[MODEL] Training failed: {e}")
        _model = previous
        if _model is None and os.path.isfile(MODEL_PATH):
            try:
                _model = joblib.load(MODEL_PATH)
                print("[MODEL] Loaded last saved model after training failure")
                return False
            except Exception as e2:
                print(f"[MODEL] Could not load disk after failure: {e2}")
        if _model is None:
            try:
                m = _build_model()
                fb = np.array(SYNTHETIC_FALLBACK, dtype=np.float64)
                m.fit(fb)
                _model = m
                print("[MODEL] Emergency synthetic model after failure")
                return True
            except Exception as e3:
                print(f"[MODEL] Emergency fit failed: {e3}")
                raise


def get_model() -> IsolationForest:
    """Singleton: memory → disk → train from DB (then save)."""
    global _model
    if _model is not None:
        return _model

    if os.path.isfile(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            print("[MODEL] Loaded from disk")
            return _model
        except Exception as e:
            print(f"[MODEL] Failed to load {MODEL_PATH}: {e}")

    print("[MODEL] Training from DB...")
    trained = train_model_from_db(allow_disk_fallback=False)
    if trained:
        save_model()

    return _model


def compute_anomaly_score(features: dict) -> dict:
    """
    Score a single feature dict using the live singleton model.

    Returns:
        { "score": float, "label": "normal" | "anomaly", "raw_score": float }
    """
    model = get_model()

    vector = np.array(
        [
            [
                features.get("requestsPerMin", 0),
                features.get("failureRate", 0),
                features.get("uniqueIPs", 0),
                features.get("avgResponseTime", 0),
            ]
        ]
    )

    raw_score = float(model.decision_function(vector)[0])
    prediction = model.predict(vector)[0]

    normalised = round(max(0.0, min(1.0, -raw_score + 0.5)), 4)
    label = "anomaly" if prediction == -1 else "normal"

    return {
        "score": normalised,
        "label": label,
        "raw_score": round(raw_score, 6),
    }

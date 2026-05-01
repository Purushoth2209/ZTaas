"""
Load feature vectors from MongoDB risk_scores for IsolationForest training.
"""

import numpy as np

from db import get_collection


def load_training_data(limit=5000):
    """
    Latest documents with embedded features, newest first.
    Returns (n, 4) float array; empty (0, 4) if DB unavailable or no valid rows.
    """
    rows = []
    try:
        coll = get_collection()
        cursor = (
            coll.find({"features": {"$exists": True}}, {"features": 1})
            .sort("timestamp", -1)
            .limit(limit)
        )
        for doc in cursor:
            f = doc.get("features")
            if not isinstance(f, dict):
                continue
            try:
                rpm = f.get("requestsPerMin")
                fr = f.get("failureRate")
                ips = f.get("uniqueIPs")
                art = f.get("avgResponseTime")
                if rpm is None or fr is None or ips is None or art is None:
                    continue
                rows.append(
                    [
                        float(rpm),
                        float(fr),
                        float(ips),
                        float(art),
                    ]
                )
            except (TypeError, ValueError):
                continue
    except Exception as e:
        print(f"[DATA] load_training_data failed: {e}")
        return np.empty((0, 4), dtype=np.float64)

    if not rows:
        return np.empty((0, 4), dtype=np.float64)
    return np.asarray(rows, dtype=np.float64)

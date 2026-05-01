#!/usr/bin/env python3
"""
Bulk-insert synthetic risk_scores into MongoDB (no RabbitMQ / consumer required).
Useful for ML training data when you only want to fill ZTaaS.risk_scores quickly.

Usage:
  python3 seed_risk_scores.py           # default 3000 docs
  python3 seed_risk_scores.py 8000

Same persona mix as gateway/scripts/seed-ml-features-queue.js (roughly).
"""
from __future__ import annotations

import random
import sys
import uuid
from datetime import datetime, timedelta, timezone

from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "ZTaaS"
COLLECTION = "risk_scores"


def rand_persona():
    r = random.random()
    if r < 0.52:
        return "normal"
    if r < 0.70:
        return "power"
    if r < 0.85:
        return "suspect"
    if r < 0.95:
        return "attacker"
    return "bot"


def features_for(persona: str) -> dict:
    if persona == "normal":
        return {
            "requestsPerMin": round(random.uniform(4, 22), 3),
            "failureRate": round(random.uniform(0.01, 0.10), 4),
            "uniqueIPs": random.randint(1, 3),
            "avgResponseTime": round(random.uniform(100, 320), 2),
        }
    if persona == "power":
        return {
            "requestsPerMin": round(random.uniform(22, 48), 3),
            "failureRate": round(random.uniform(0.04, 0.14), 4),
            "uniqueIPs": random.randint(2, 5),
            "avgResponseTime": round(random.uniform(180, 520), 2),
        }
    if persona == "suspect":
        return {
            "requestsPerMin": round(random.uniform(35, 85), 3),
            "failureRate": round(random.uniform(0.18, 0.48), 4),
            "uniqueIPs": random.randint(4, 11),
            "avgResponseTime": round(random.uniform(450, 2200), 2),
        }
    if persona == "attacker":
        return {
            "requestsPerMin": round(random.uniform(90, 220), 3),
            "failureRate": round(random.uniform(0.55, 0.95), 4),
            "uniqueIPs": random.randint(14, 40),
            "avgResponseTime": round(random.uniform(2500, 9000), 2),
        }
    # bot
    return {
        "requestsPerMin": round(random.uniform(120, 400), 3),
        "failureRate": round(random.uniform(0.02, 0.12), 4),
        "uniqueIPs": random.randint(1, 4),
        "avgResponseTime": round(random.uniform(40, 180), 2),
    }


POOLS = {
    "normal": [f"user-normal-{i}" for i in range(45)],
    "power": [f"user-power-{i}" for i in range(20)],
    "suspect": [f"user-suspect-{i}" for i in range(25)],
    "attacker": [f"user-attacker-{i}" for i in range(18)],
    "bot": [f"svc-bot-{i}" for i in range(12)],
}
TENANTS = ["default", "default", "default", "tenant-A", "tenant-B"]


def random_ts() -> datetime:
    window = timedelta(days=14)
    skew = random.random() ** 1.4
    return datetime.now(tz=timezone.utc) - timedelta(seconds=skew * window.total_seconds())


def fake_ml_scores(features: dict) -> tuple[float, float, str]:
    """Lightweight score/label stand-in so rows resemble consumer output."""
    rpm = features["requestsPerMin"]
    fr = features["failureRate"]
    raw = min(1.0, max(0.0, fr * 0.6 + min(1.0, rpm / 400) * 0.4))
    label = "anomaly" if raw > 0.55 else "normal"
    score = round(raw * 0.85 + random.uniform(-0.05, 0.05), 4)
    score = max(0.0, min(1.0, score))
    raw_score = round(float(score) - 0.5 + random.uniform(-0.1, 0.1), 6)
    return score, raw_score, label


def main() -> None:
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    if n < 1:
        print("Count must be >= 1")
        sys.exit(1)

    client = MongoClient(MONGO_URI)
    coll = client[DB_NAME][COLLECTION]
    coll.create_index([("userId", -1), ("timestamp", -1)])

    batch = []
    inserted = 0
    batch_size = 500

    for _ in range(n):
        persona = rand_persona()
        feats = features_for(persona)
        score, raw_score, label = fake_ml_scores(feats)
        batch.append(
            {
                "requestId": str(uuid.uuid4()),
                "userId": random.choice(POOLS[persona]),
                "tenantId": random.choice(TENANTS),
                "score": score,
                "rawScore": raw_score,
                "label": label,
                "features": feats,
                "timestamp": random_ts(),
            }
        )
        if len(batch) >= batch_size:
            coll.insert_many(batch)
            inserted += len(batch)
            batch.clear()
            print(f"[SEED] inserted {inserted}/{n} …")

    if batch:
        coll.insert_many(batch)
        inserted += len(batch)

    print(f"[SEED] MongoDB → {DB_NAME}.{COLLECTION}: {inserted} documents")
    client.close()


if __name__ == "__main__":
    main()

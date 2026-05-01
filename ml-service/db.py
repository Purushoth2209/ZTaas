from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME   = "ZTaaS"
COLLECTION = "risk_scores"

_client     = None
_collection = None

def get_collection():
    global _client, _collection

    if _collection is not None:
        return _collection

    _client     = MongoClient(MONGO_URI)
    _collection = _client[DB_NAME][COLLECTION]

    _client[DB_NAME].command("ping")
    print(f"[DB] Connected to MongoDB → {DB_NAME}.{COLLECTION}")

    _collection.create_index([("userId", -1), ("timestamp", -1)])
    print("[DB] MongoDB index ensured → (userId, timestamp)")

    return _collection

import json
import time
import pika
from datetime import datetime, timezone

from model import compute_anomaly_score, train_model_from_db, save_model
from db    import get_collection

RABBITMQ_URL = "amqp://guest:guest@localhost:5672"
QUEUE_NAME   = "ml.features"
RETRY_DELAY  = 5   # seconds

_RETRAIN_EVERY = 500
_processed_ok = 0


def process_message(ch, method, _properties, body):
    """Callback invoked for every message delivered from the queue."""
    global _processed_ok
    try:
        data = json.loads(body)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"[CONSUMER] Bad JSON — discarding: {e}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    request_id = data.get("requestId", "unknown")
    user_id    = data.get("userId",    "unknown")
    tenant_id  = data.get("tenantId",  "default")
    features   = data.get("features")
    timestamp  = data.get("timestamp")

    print(f"[CONSUMER] Message received → userId={user_id}  requestId={request_id}")
    print(f"[CONSUMER] Features: {features}")

    if not features or not isinstance(features, dict):
        print("[CONSUMER] Missing or invalid features — discarding message")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    try:
        result = compute_anomaly_score(features)

        print(
            f"[ML]       Score={result['score']}  Raw={result['raw_score']}  Label={result['label']}"
        )

        doc = {
            "requestId": request_id,
            "userId":    user_id,
            "tenantId":  tenant_id,
            "score":     result["score"],
            "rawScore":  result["raw_score"],
            "label":     result["label"],
            "features":  features,
            "timestamp": (
                datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
                if isinstance(timestamp, (int, float))
                else datetime.now(tz=timezone.utc)
            ),
        }

        collection = get_collection()
        collection.insert_one(doc)

        print(f"[DB]       Saved → userId={user_id}  score={result['score']}  label={result['label']}")

        _processed_ok += 1
        if _processed_ok % _RETRAIN_EVERY == 0:
            try:
                print("[MODEL] Retraining on fresh data...")
                if train_model_from_db(allow_disk_fallback=True):
                    save_model()
                    print("[MODEL] Retrained")
                else:
                    print("[MODEL] Retrain skipped — kept existing persisted model")
            except Exception as re_err:
                print(f"[MODEL] Retrain error (service continues): {re_err}")

    except Exception as e:
        print(f"[CONSUMER] Processing error for userId={user_id}: {e}")

    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)


def start_consumer():
    """Connect to RabbitMQ and begin consuming — retries indefinitely on failure."""
    attempt = 1

    while True:
        try:
            params     = pika.URLParameters(RABBITMQ_URL)
            connection = pika.BlockingConnection(params)
            channel    = connection.channel()

            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE_NAME, on_message_callback=process_message)

            print(f"[CONSUMER] Connected to RabbitMQ — listening on \"{QUEUE_NAME}\"")
            print("[CONSUMER] Processing messages...")

            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            print(f"[CONSUMER] Connect attempt {attempt} failed: {e} — retrying in {RETRY_DELAY}s")
            attempt += 1
            time.sleep(RETRY_DELAY)

        except KeyboardInterrupt:
            print("[CONSUMER] Shutting down...")
            break

        except Exception as e:
            print(f"[CONSUMER] Unexpected error: {e} — retrying in {RETRY_DELAY}s")
            attempt += 1
            time.sleep(RETRY_DELAY)

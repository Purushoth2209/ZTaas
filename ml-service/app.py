from db       import get_collection
from model    import get_model
from consumer import start_consumer


def main():
    print("=" * 50)
    print("  ML Service — Zero Trust Anomaly Detector")
    print("=" * 50)

    print("\n[APP] Initialising MongoDB connection...")
    get_collection()

    print("[APP] Initialising ML model...")
    get_model()

    print("\n[APP] ML Service started\n")
    start_consumer()


if __name__ == "__main__":
    main()

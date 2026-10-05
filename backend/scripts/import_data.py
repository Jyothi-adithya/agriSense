"""
AgriSense - Data Import Script
================================
Phase 3: Imports the cleaned crop dataset into MongoDB.

Workflow:
    CSV -> Pandas -> Validation -> Cleaning -> JSON Documents -> MongoDB

Usage:
    python scripts/import_data.py              # safe: skips if data exists
    python scripts/import_data.py --force      # clears collection and re-imports
    python scripts/import_data.py --csv path/to/custom.csv

Safety:
    - Checks for existing records before inserting.
    - Use --force to wipe and re-import.
    - Original CSV is NEVER modified.
"""

import argparse
import os
import sys
from datetime import datetime, timezone

# Force UTF-8 output on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf_8"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Allow running from scripts/ or backend/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pymongo import MongoClient, ASCENDING
from pymongo.errors import BulkWriteError, ConnectionFailure

# Import the preprocessing function so we reuse the same validation logic
from scripts.preprocess_data import preprocess, DEFAULT_CSV, VALID_RANGES, FIELD_MAP

from config import Config

DOUBLE_SEP = "=" * 60
SEP        = "-" * 60


def connect_db():
    """Connect to MongoDB and return (client, db, collection)."""
    try:
        client = MongoClient(Config.MONGODB_URI, serverSelectionTimeoutMS=4000)
        client.admin.command("ping")
        db         = client[Config.DATABASE_NAME]
        collection = db[Config.CROP_COLLECTION]
        print(f"  [OK] Connected to MongoDB: {Config.MONGODB_URI}")
        print(f"  [OK] Database  : {Config.DATABASE_NAME}")
        print(f"  [OK] Collection: {Config.CROP_COLLECTION}")
        return client, db, collection
    except ConnectionFailure as e:
        print(f"  [ERROR] Cannot connect to MongoDB: {e}")
        print("  Ensure MongoDB is running on port 27017 and try again.")
        sys.exit(1)


def create_indexes(collection) -> None:
    """
    Create indexes on frequently queried fields.

    Index rationale:
      crop        - Used in aggregation group-by, crop profile lookups, and filters.
      ph          - Used in pH category queries and range filters.
      rainfall    - Used in rainfall analytics and range queries.
      temperature - Used in climate analytics and range queries.
    """
    print(f"\n{SEP}")
    print("  Creating MongoDB Indexes")
    print(SEP)

    indexes = [
        ("crop",        "Fast crop-name lookups and GROUP BY aggregations"),
        ("ph",          "pH range queries and category classification"),
        ("rainfall",    "Rainfall analytics min/max/avg aggregations"),
        ("temperature", "Climate analytics and temperature range filters"),
    ]

    for field, reason in indexes:
        result = collection.create_index([(field, ASCENDING)], background=True)
        print(f"  [OK] Index on '{field}' -- {reason}")
        print(f"       Index name: {result}")


def run_import(csv_path: str, force: bool) -> None:
    print(f"\n{DOUBLE_SEP}")
    print("  AgriSense - MongoDB Data Import")
    print(DOUBLE_SEP)

    # Step 1: Connect
    print(f"\n{SEP}")
    print("  Step 1: MongoDB Connection")
    print(SEP)
    client, db, collection = connect_db()

    # Step 2: Check existing data
    print(f"\n{SEP}")
    print("  Step 2: Existing Data Check")
    print(SEP)
    existing = collection.count_documents({})

    if existing > 0 and not force:
        print(f"  [INFO] Collection already contains {existing:,} records.")
        print("  [INFO] Skipping import to prevent duplicate data.")
        print("  [TIP]  Run with --force to wipe and re-import.")
        create_indexes(collection)
        print(f"\n{DOUBLE_SEP}")
        print(f"  Import skipped -- {existing:,} records already in MongoDB.")
        print(DOUBLE_SEP)
        print()
        client.close()
        return

    if existing > 0 and force:
        print(f"  [WARN] --force detected. Deleting {existing:,} existing records...")
        result = collection.delete_many({})
        print(f"  [OK] Deleted {result.deleted_count:,} records.")

    # Step 3: Preprocess CSV
    print(f"\n{SEP}")
    print("  Step 3: Data Preprocessing")
    print(SEP)
    summary = preprocess(csv_path)

    # Re-load and re-apply same cleaning steps
    import pandas as pd
    df = pd.read_csv(csv_path)
    df["label"] = df["label"].astype(str).str.strip().str.lower()
    df.dropna(inplace=True)
    df.drop_duplicates(inplace=True)
    for col, (lo, hi) in VALID_RANGES.items():
        df = df[(df[col] >= lo) & (df[col] <= hi)]
    df = df.rename(columns=FIELD_MAP)

    # Step 4: Build documents
    print(f"\n{SEP}")
    print("  Step 4: Building MongoDB Documents")
    print(SEP)

    imported_at = datetime.now(timezone.utc).isoformat()
    documents   = []
    for _, row in df.iterrows():
        documents.append({
            "nitrogen":    float(row["nitrogen"]),
            "phosphorus":  float(row["phosphorus"]),
            "potassium":   float(row["potassium"]),
            "temperature": round(float(row["temperature"]), 6),
            "humidity":    round(float(row["humidity"]),    6),
            "ph":          round(float(row["ph"]),          6),
            "rainfall":    round(float(row["rainfall"]),    6),
            "crop":        str(row["crop"]),
            "imported_at": imported_at,
        })

    print(f"  [OK] Built {len(documents):,} documents ready for insertion.")
    print("  Sample document:")
    sample = {k: v for k, v in documents[0].items() if k != "imported_at"}
    for k, v in sample.items():
        print(f"    {k:<14}: {v}")

    # Step 5: Bulk insert
    print(f"\n{SEP}")
    print("  Step 5: Inserting into MongoDB")
    print(SEP)

    try:
        result   = collection.insert_many(documents, ordered=False)
        inserted = len(result.inserted_ids)
        print(f"  [OK] Successfully inserted {inserted:,} records.")
    except BulkWriteError as bwe:
        inserted = bwe.details.get("nInserted", 0)
        errors   = len(bwe.details.get("writeErrors", []))
        print(f"  [WARN] Bulk write partial: {inserted:,} inserted, {errors} errors.")

    # Step 6: Create indexes
    create_indexes(collection)

    # Step 7: Post-import verification
    print(f"\n{SEP}")
    print("  Step 7: Post-Import Verification")
    print(SEP)

    final_in_db = collection.count_documents({})
    crops_in_db = len(collection.distinct("crop"))

    print(f"  Records in collection : {final_in_db:,}")
    print(f"  Unique crops          : {crops_in_db}")

    # Spot-check via aggregation
    pipeline = [
        {"$group": {"_id": "$crop", "count": {"$sum": 1}}},
        {"$sort":  {"_id": 1}},
    ]
    crop_counts = list(collection.aggregate(pipeline))
    print(f"\n  Crop record counts (aggregation verify):")
    print(f"  {'Crop':<22} {'Count':>6}")
    print(f"  {'-'*30}")
    for doc in crop_counts:
        print(f"  {doc['_id']:<22} {doc['count']:>6}")

    # Final summary
    print(f"\n{DOUBLE_SEP}")
    print("  IMPORT COMPLETE")
    print(DOUBLE_SEP)
    print(f"  Records inserted  : {inserted:,}")
    print(f"  Records in DB     : {final_in_db:,}")
    print(f"  Unique crops      : {crops_in_db}")
    print(f"  Indexes created   : 4")
    print(DOUBLE_SEP)
    print()

    client.close()


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="AgriSense data import - loads crop dataset into MongoDB."
    )
    parser.add_argument(
        "--csv",
        default=DEFAULT_CSV,
        help=f"Path to the CSV file (default: {DEFAULT_CSV})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Wipe the existing collection and re-import from scratch.",
    )
    args = parser.parse_args()
    run_import(args.csv, args.force)

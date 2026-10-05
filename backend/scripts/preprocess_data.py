"""
AgriSense - Data Preprocessing Script
=======================================
Phase 2: Validates, cleans, and reports on Crop_recommendation.csv.

Usage:
    python scripts/preprocess_data.py
    python scripts/preprocess_data.py --csv path/to/custom.csv

The original CSV is NEVER modified.
A cleaned summary JSON is written to data/cleaned_summary.json for reference.
"""

import argparse
import json
import os
import sys

# Force UTF-8 output on Windows to avoid charmap encoding errors
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf_8"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT_DIR    = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR    = os.path.join(ROOT_DIR, "data")
DEFAULT_CSV = os.path.join(ROOT_DIR, "Crop_recommendation.csv")
SUMMARY_OUT = os.path.join(DATA_DIR, "cleaned_summary.json")

# ── Expected schema ────────────────────────────────────────────────────────────
EXPECTED_COLUMNS = {"N", "P", "K", "temperature", "humidity", "ph", "rainfall", "label"}

# Validation thresholds (documented):
#   N          : 0-200   (dataset max 140)
#   P          : 0-200   (dataset max 145)
#   K          : 0-210   (dataset max 205; expanded from initial 200 after profiling)
#   temperature: 0-50 C  (dataset range 9.5-43.7 C)
#   humidity   : 0-100%
#   pH         : 0-14    (standard soil pH scale)
#   rainfall   : 0-3000 mm/year (dataset max ~298 mm)
VALID_RANGES: dict = {
    "N":           (0,    200),
    "P":           (0,    200),
    "K":           (0,    210),
    "temperature": (0,    50),
    "humidity":    (0,    100),
    "ph":          (0,    14),
    "rainfall":    (0,    3000),
}

FIELD_MAP = {
    "N":           "nitrogen",
    "P":           "phosphorus",
    "K":           "potassium",
    "temperature": "temperature",
    "humidity":    "humidity",
    "ph":          "ph",
    "rainfall":    "rainfall",
    "label":       "crop",
}

# Pure ASCII separators (Windows console safe)
DOUBLE_SEP = "=" * 60
SINGLE_SEP = "-" * 60


def section(title: str) -> None:
    print(f"\n{SINGLE_SEP}")
    print(f"  {title}")
    print(SINGLE_SEP)


# ── Main ───────────────────────────────────────────────────────────────────────
def preprocess(csv_path: str) -> dict:
    """
    Runs the full preprocessing pipeline.

    Returns a summary dict that is also written to data/cleaned_summary.json.
    """
    print(f"\n{DOUBLE_SEP}")
    print("  AgriSense - Data Preprocessing Report")
    print(DOUBLE_SEP)
    print(f"  Source CSV : {csv_path}")
    print(f"  Output dir : {DATA_DIR}")

    # ── 1. Load CSV ────────────────────────────────────────────────────────────
    section("1. Loading CSV")
    if not os.path.isfile(csv_path):
        print(f"  [ERROR] File not found: {csv_path}")
        print("  Place Crop_recommendation.csv in the project root and try again.")
        sys.exit(1)

    df_raw = pd.read_csv(csv_path)
    total_rows = len(df_raw)
    total_cols = len(df_raw.columns)
    print(f"  [OK] Loaded {total_rows:,} rows x {total_cols} columns")
    print(f"  Columns found : {list(df_raw.columns)}")

    # ── 2. Column validation ──────────────────────────────────────────────────
    section("2. Column Validation")
    actual_cols  = set(df_raw.columns)
    missing_cols = EXPECTED_COLUMNS - actual_cols
    extra_cols   = actual_cols - EXPECTED_COLUMNS

    if missing_cols:
        print(f"  [ERROR] Missing required columns: {missing_cols}")
        print("  Ensure the CSV contains: N, P, K, temperature, humidity, ph, rainfall, label")
        sys.exit(1)

    print(f"  [OK] All {len(EXPECTED_COLUMNS)} required columns present.")
    if extra_cols:
        print(f"  [INFO] Extra columns found (will be ignored): {extra_cols}")

    # Keep only required columns
    df = df_raw[list(EXPECTED_COLUMNS)].copy()

    # ── 3. Data types ─────────────────────────────────────────────────────────
    section("3. Data Type Check")
    numeric_cols = [c for c in EXPECTED_COLUMNS if c != "label"]
    type_errors  = 0
    for col in numeric_cols:
        before   = len(df)
        df[col]  = pd.to_numeric(df[col], errors="coerce")
        coerced  = before - int(df[col].notna().sum())
        if coerced:
            print(f"  [WARN] '{col}': {coerced} non-numeric values coerced to NaN")
            type_errors += coerced
        else:
            print(f"  [OK] '{col}' -- numeric OK")

    if type_errors == 0:
        print(f"  [OK] All numeric columns have valid numeric types.")

    # ── 4. Missing values ─────────────────────────────────────────────────────
    section("4. Missing Value Analysis")
    null_counts = df.isnull().sum()
    total_nulls = int(null_counts.sum())

    if total_nulls == 0:
        print("  [OK] No missing values found in any column.")
    else:
        print(f"  [WARN] {total_nulls} missing values detected:")
        for col, cnt in null_counts[null_counts > 0].items():
            print(f"         '{col}': {cnt} missing")
        # Decision: drop rows with any missing value
        df.dropna(inplace=True)
        print(f"  [ACTION] Dropped rows with missing values. Remaining: {len(df):,}")

    rows_after_nulls = len(df)

    # ── 5. Duplicate records ──────────────────────────────────────────────────
    section("5. Duplicate Record Detection")
    dup_mask  = df.duplicated()
    dup_count = int(dup_mask.sum())

    if dup_count == 0:
        print("  [OK] No exact duplicate records found.")
    else:
        print(f"  [WARN] {dup_count} exact duplicate rows detected.")
        print("  [ACTION] Dropping duplicates (keeping first occurrence).")
        df.drop_duplicates(inplace=True)
        print(f"  Remaining: {len(df):,}")

    rows_after_dups = len(df)

    # ── 6. Range / outlier validation ─────────────────────────────────────────
    section("6. Numeric Range Validation")
    invalid_counts = {}

    for col, (lo, hi) in VALID_RANGES.items():
        out_of_range = df[(df[col] < lo) | (df[col] > hi)]
        cnt = len(out_of_range)
        invalid_counts[col] = cnt

        if cnt == 0:
            print(f"  [OK] '{col}' -- all values within [{lo}, {hi}]")
        else:
            print(f"  [WARN] '{col}' -- {cnt} values outside [{lo}, {hi}]:")
            print(f"         Min={df[col].min():.4f}  Max={df[col].max():.4f}")
            print(f"  [ACTION] Removing {cnt} records with out-of-range '{col}'.")
            df = df[~((df[col] < lo) | (df[col] > hi))]

    total_invalid = sum(invalid_counts.values())
    rows_after_ranges = len(df)

    # ── 7. Label (crop) validation ────────────────────────────────────────────
    section("7. Crop Label Validation")
    df["label"] = df["label"].astype(str).str.strip().str.lower()
    empty_labels = int((df["label"] == "").sum()) + int(df["label"].isna().sum())

    if empty_labels == 0:
        print("  [OK] All crop labels are non-empty strings.")
    else:
        print(f"  [WARN] {empty_labels} empty/null crop labels found. Dropping.")
        df = df[df["label"].str.len() > 0]

    unique_crops = sorted(df["label"].unique())
    print(f"  [OK] {len(unique_crops)} unique crops found:")
    print(f"  {unique_crops}")

    # ── 8. pH-specific check ──────────────────────────────────────────────────
    section("8. pH Category Analysis")
    # Standard soil science pH thresholds:
    #   Acidic   : pH < 6.5
    #   Neutral  : 6.5 <= pH <= 7.5
    #   Alkaline : pH > 7.5
    acidic   = int((df["ph"] < 6.5).sum())
    neutral  = int(((df["ph"] >= 6.5) & (df["ph"] <= 7.5)).sum())
    alkaline = int((df["ph"] > 7.5).sum())
    print("  pH categories (standard soil science thresholds):")
    print(f"    Acidic   (pH < 6.5)         : {acidic:>5,} records")
    print(f"    Neutral  (6.5 <= pH <= 7.5) : {neutral:>5,} records")
    print(f"    Alkaline (pH > 7.5)         : {alkaline:>5,} records")

    # ── 9. Field name standardisation ─────────────────────────────────────────
    section("9. Field Name Standardisation")
    print("  Mapping original CSV columns -> MongoDB field names:")
    for src, dst in FIELD_MAP.items():
        print(f"    {src:<15} -> {dst}")
    df_clean = df.rename(columns=FIELD_MAP)

    final_rows = len(df_clean)

    # ── 10. Clean dataset statistics ──────────────────────────────────────────
    section("10. Clean Dataset Statistics")
    stats = {}
    for col in ["nitrogen","phosphorus","potassium","temperature","humidity","ph","rainfall"]:
        stats[col] = {
            "min":  round(float(df_clean[col].min()),  4),
            "max":  round(float(df_clean[col].max()),  4),
            "mean": round(float(df_clean[col].mean()), 4),
            "std":  round(float(df_clean[col].std()),  4),
        }
    print(f"\n  {'Column':<14} {'Min':>10} {'Max':>10} {'Mean':>10} {'Std':>10}")
    print(f"  {'-'*56}")
    for col, s in stats.items():
        print(f"  {col:<14} {s['min']:>10.4f} {s['max']:>10.4f} {s['mean']:>10.4f} {s['std']:>10.4f}")

    print(f"\n  Records per crop (after cleaning):")
    crop_counts = df_clean["crop"].value_counts().sort_index()
    for crop, cnt in crop_counts.items():
        print(f"    {crop:<20} {cnt:>4}")

    # ── 11. Final summary ─────────────────────────────────────────────────────
    print(f"\n{DOUBLE_SEP}")
    print("  PREPROCESSING SUMMARY")
    print(DOUBLE_SEP)
    print(f"  Original records           : {total_rows:>6,}")
    print(f"  Missing value rows dropped : {total_rows - rows_after_nulls:>6,}")
    print(f"  Duplicate rows dropped     : {rows_after_nulls - rows_after_dups:>6,}")
    print(f"  Out-of-range rows dropped  : {rows_after_dups - rows_after_ranges:>6,}")
    print(f"  Invalid label rows dropped : {rows_after_ranges - final_rows:>6,}")
    print(f"  {'-'*40}")
    print(f"  Final valid records        : {final_rows:>6,}")
    print(f"  Unique crops               : {len(unique_crops):>6,}")
    print(DOUBLE_SEP)

    if total_nulls == 0 and dup_count == 0 and total_invalid == 0:
        print("\n  [OK] Dataset is clean -- no records were removed.")
        print("  [OK] Ready for import into MongoDB.")
    else:
        removed = total_rows - final_rows
        print(f"\n  [INFO] {removed} records removed during cleaning.")
        print("  [INFO] Cleaned dataset ready for MongoDB import.")

    # ── 12. Write summary JSON ─────────────────────────────────────────────────
    os.makedirs(DATA_DIR, exist_ok=True)
    summary = {
        "source_csv":              csv_path,
        "original_records":        total_rows,
        "missing_value_drops":     total_rows - rows_after_nulls,
        "duplicate_drops":         rows_after_nulls - rows_after_dups,
        "range_violation_drops":   rows_after_dups - rows_after_ranges,
        "final_valid_records":     final_rows,
        "unique_crops":            unique_crops,
        "crop_counts":             crop_counts.to_dict(),
        "ph_categories": {
            "acidic":   acidic,
            "neutral":  neutral,
            "alkaline": alkaline,
        },
        "column_stats": stats,
    }

    with open(SUMMARY_OUT, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\n  Summary written -> {SUMMARY_OUT}")
    print()

    return summary


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="AgriSense data preprocessing - validates and cleans the crop dataset."
    )
    parser.add_argument(
        "--csv",
        default=DEFAULT_CSV,
        help=f"Path to the CSV file (default: {DEFAULT_CSV})",
    )
    args = parser.parse_args()
    preprocess(args.csv)

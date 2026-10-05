"""
AgriSense Recommendation Service
==================================
Similarity-based crop recommendation — NO machine learning.

Algorithm:
  1. Fetch crop profiles (avg N/P/K/temp/humidity/pH/rainfall) from MongoDB aggregation.
  2. For each crop, compute per-parameter normalised similarity against user input.
  3. Combine into a weighted suitability score (equal weights: 1/7 each).
  4. Rank all crops by score, return top N with explanations.

The score is explicitly labelled "Dataset Similarity Score" — it is NOT a
prediction of crop yield, nor a guarantee of agricultural suitability.
"""

from datetime import datetime, timezone
from flask import current_app
from services.analytics_service import get_all_crop_profiles

# Weights for each parameter (equal weighting = 1/7 each)
# These are educational project weights, not scientifically validated.
WEIGHTS = {
    "nitrogen":    1 / 7,
    "phosphorus":  1 / 7,
    "potassium":   1 / 7,
    "temperature": 1 / 7,
    "humidity":    1 / 7,
    "ph":          1 / 7,
    "rainfall":    1 / 7,
}

# Global ranges used for normalisation (derived from full dataset stats)
# These define the scale for each parameter's similarity calculation.
GLOBAL_RANGES = {
    "nitrogen":    140.0,   # max - min in dataset
    "phosphorus":  140.0,
    "potassium":   200.0,
    "temperature":  34.85,  # 43.68 - 8.83
    "humidity":     85.74,  # 99.98 - 14.24
    "ph":            6.43,  # 9.94  - 3.50
    "rainfall":    278.35,  # 298.56 - 20.21
}


def _param_similarity(user_val: float, crop_avg: float, global_range: float) -> float:
    """
    Normalised similarity for one parameter.
    Returns a value in [0, 1] where 1.0 = exact match.

    Formula:
        sim = max(0, 1 - |user_val - crop_avg| / global_range)

    The global_range anchors the similarity so that a difference equal to
    the full dataset spread gives 0, and a perfect match gives 1.
    """
    if global_range == 0:
        return 1.0
    diff = abs(user_val - crop_avg)
    return max(0.0, 1.0 - diff / global_range)


def recommend_crops(user_input: dict, top_n: int = 5) -> dict:
    """
    Ranks all crops by dataset similarity score against user_input.

    Parameters
    ----------
    user_input : dict with keys nitrogen, phosphorus, potassium,
                 temperature, humidity, ph, rainfall
    top_n      : number of top crops to return (default 5)

    Returns
    -------
    dict with:
        top_crop        — highest scoring crop name
        recommendations — list of {crop, score, parameter_scores, comparison}
        user_input      — echoed back for display
    """
    # Step 1: Get all crop profiles from MongoDB
    profiles = get_all_crop_profiles()
    if not profiles:
        return {"error": "No crop data found. Please run the import script first."}

    PARAM_KEYS = [
        ("nitrogen",    "avg_nitrogen"),
        ("phosphorus",  "avg_phosphorus"),
        ("potassium",   "avg_potassium"),
        ("temperature", "avg_temperature"),
        ("humidity",    "avg_humidity"),
        ("ph",          "avg_ph"),
        ("rainfall",    "avg_rainfall"),
    ]

    scored = []

    for profile in profiles:
        crop_name = profile["_id"]

        # Step 2: Per-parameter similarity
        param_scores = {}
        for user_key, avg_key in PARAM_KEYS:
            user_val  = float(user_input[user_key])
            crop_avg  = float(profile[avg_key])
            sim       = _param_similarity(user_val, crop_avg, GLOBAL_RANGES[user_key])
            param_scores[user_key] = round(sim, 4)

        # Step 3: Weighted suitability score
        score = sum(WEIGHTS[k] * param_scores[k] for k in WEIGHTS)
        score = round(score, 4)

        # Step 4: Build comparison table
        comparison = []
        DISPLAY_LABELS = {
            "nitrogen":    ("Nitrogen (N)",    "units"),
            "phosphorus":  ("Phosphorus (P)",  "units"),
            "potassium":   ("Potassium (K)",   "units"),
            "temperature": ("Temperature",     "°C"),
            "humidity":    ("Humidity",        "%"),
            "ph":          ("pH",              ""),
            "rainfall":    ("Rainfall",        "mm"),
        }
        for user_key, avg_key in PARAM_KEYS:
            label, unit = DISPLAY_LABELS[user_key]
            comparison.append({
                "parameter":    label,
                "unit":         unit,
                "user_value":   round(float(user_input[user_key]), 2),
                "crop_average": round(float(profile[avg_key]),     2),
                "similarity":   round(param_scores[user_key] * 100, 1),  # as %
            })

        scored.append({
            "crop":             crop_name,
            "score":            score,
            "score_pct":        round(score * 100, 1),
            "parameter_scores": param_scores,
            "comparison":       comparison,
        })

    # Step 5: Rank by score descending
    scored.sort(key=lambda x: x["score"], reverse=True)
    top       = scored[:top_n]
    top_crop  = top[0] if top else None

    # Step 6: Generate explanation for top crop
    explanation = []
    if top_crop:
        for row in top_crop["comparison"]:
            sim = row["similarity"]
            if sim >= 80:
                explanation.append(
                    f"✓ {row['parameter']} is very close to the average {top_crop['crop']} profile "
                    f"(yours: {row['user_value']}, avg: {row['crop_average']})"
                )
            elif sim >= 55:
                explanation.append(
                    f"~ {row['parameter']} is within a similar range "
                    f"(yours: {row['user_value']}, avg: {row['crop_average']})"
                )
            else:
                explanation.append(
                    f"✗ {row['parameter']} differs from the typical {top_crop['crop']} profile "
                    f"(yours: {row['user_value']}, avg: {row['crop_average']})"
                )

    return {
        "top_crop":        top_crop["crop"]    if top_crop else None,
        "top_score_pct":   top_crop["score_pct"] if top_crop else 0,
        "recommendations": top,
        "explanation":     explanation,
        "user_input":      user_input,
        "note":            (
            "Scores represent dataset similarity — how closely your soil and climate "
            "conditions match the historical average for each crop. "
            "This is NOT a prediction of crop yield or a guarantee of suitability."
        ),
    }


def save_recommendation_history(user_input: dict, recommended_crop: str, score_pct: float) -> None:
    """Persist a recommendation request to prediction_history collection."""
    db  = current_app.config["DB"]
    col = db["prediction_history"]
    col.insert_one({
        "input":            user_input,
        "recommended_crop": recommended_crop,
        "score_pct":        score_pct,
        "created_at":       datetime.now(timezone.utc).isoformat(),
    })


def get_recommendation_history(limit: int = 20) -> list:
    """Returns the most recent recommendation requests."""
    db  = current_app.config["DB"]
    col = db["prediction_history"]
    docs = list(col.find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return docs

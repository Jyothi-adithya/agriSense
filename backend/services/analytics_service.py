"""
AgriSense Analytics Service
============================
All analytics are performed via MongoDB aggregation pipelines.
No client-side computation — MongoDB does the heavy lifting.
"""

from flask import current_app


def _col():
    return current_app.config["DB"]["crop_data"]


# ── 1. Dashboard KPIs ─────────────────────────────────────────────────────────

def get_dashboard_stats() -> dict:
    """
    Returns high-level KPI stats for the dashboard home page.
    Uses a single aggregation pass for efficiency.
    """
    col = _col()

    # Single-pass aggregation for all numeric averages
    pipeline = [
        {
            "$group": {
                "_id":          None,
                "total_records": {"$sum": 1},
                "avg_ph":        {"$avg": "$ph"},
                "avg_rainfall":  {"$avg": "$rainfall"},
                "avg_temp":      {"$avg": "$temperature"},
                "avg_humidity":  {"$avg": "$humidity"},
                "avg_nitrogen":  {"$avg": "$nitrogen"},
                "avg_phosphorus":{"$avg": "$phosphorus"},
                "avg_potassium": {"$avg": "$potassium"},
            }
        }
    ]

    result = list(col.aggregate(pipeline))
    if not result:
        return {}

    r            = result[0]
    crop_count   = len(col.distinct("crop"))

    return {
        "total_records":  r["total_records"],
        "crop_count":     crop_count,
        "avg_ph":         round(r["avg_ph"],        2),
        "avg_rainfall":   round(r["avg_rainfall"],  2),
        "avg_temperature":round(r["avg_temp"],      2),
        "avg_humidity":   round(r["avg_humidity"],  2),
        "avg_nitrogen":   round(r["avg_nitrogen"],  2),
        "avg_phosphorus": round(r["avg_phosphorus"],2),
        "avg_potassium":  round(r["avg_potassium"], 2),
    }


# ── 2. Crop Distribution ──────────────────────────────────────────────────────

def get_crop_distribution() -> list:
    """
    Count of records per crop type.
    Example: [{"crop": "rice", "count": 100}, ...]
    Uses the index on 'crop' for fast GROUP BY.
    """
    col      = _col()
    pipeline = [
        {"$group": {"_id": "$crop", "count": {"$sum": 1}}},
        {"$sort":  {"_id": 1}},
        {"$project": {"_id": 0, "crop": "$_id", "count": 1}},
    ]
    return list(col.aggregate(pipeline))


# ── 3. Average NPK per crop ───────────────────────────────────────────────────

def get_avg_npk_by_crop() -> list:
    """
    Average N, P, K for each crop.
    Used for Soil Analytics and Crop Analytics pages.
    """
    col      = _col()
    pipeline = [
        {
            "$group": {
                "_id":          "$crop",
                "avg_nitrogen":  {"$avg": "$nitrogen"},
                "avg_phosphorus":{"$avg": "$phosphorus"},
                "avg_potassium": {"$avg": "$potassium"},
            }
        },
        {"$sort": {"_id": 1}},
        {
            "$project": {
                "_id":           0,
                "crop":          "$_id",
                "avg_nitrogen":  {"$round": ["$avg_nitrogen",  2]},
                "avg_phosphorus":{"$round": ["$avg_phosphorus",2]},
                "avg_potassium": {"$round": ["$avg_potassium", 2]},
            }
        },
    ]
    return list(col.aggregate(pipeline))


# ── 4. Average climate per crop ───────────────────────────────────────────────

def get_avg_climate_by_crop() -> list:
    """
    Average temperature, humidity, rainfall, pH for each crop.
    Used for Climate Analytics page.
    """
    col      = _col()
    pipeline = [
        {
            "$group": {
                "_id":           "$crop",
                "avg_temperature":{"$avg": "$temperature"},
                "avg_humidity":   {"$avg": "$humidity"},
                "avg_rainfall":   {"$avg": "$rainfall"},
                "avg_ph":         {"$avg": "$ph"},
            }
        },
        {"$sort": {"_id": 1}},
        {
            "$project": {
                "_id":            0,
                "crop":           "$_id",
                "avg_temperature":{"$round": ["$avg_temperature", 2]},
                "avg_humidity":   {"$round": ["$avg_humidity",    2]},
                "avg_rainfall":   {"$round": ["$avg_rainfall",    2]},
                "avg_ph":         {"$round": ["$avg_ph",          2]},
            }
        },
    ]
    return list(col.aggregate(pipeline))


# ── 5. pH category distribution ───────────────────────────────────────────────

def get_ph_distribution() -> dict:
    """
    Categorises all records into Acidic / Neutral / Alkaline.

    Thresholds (standard soil science):
      Acidic   : pH < 6.5
      Neutral  : 6.5 <= pH <= 7.5
      Alkaline : pH > 7.5
    """
    col      = _col()
    pipeline = [
        {
            "$bucket": {
                "groupBy": "$ph",
                "boundaries": [0, 6.5, 7.5, 15],
                "default": "other",
                "output": {"count": {"$sum": 1}},
            }
        }
    ]
    raw = list(col.aggregate(pipeline))

    # Map bucket boundaries to labels
    label_map = {0: "acidic", 6.5: "neutral", 7.5: "alkaline"}
    result    = {"acidic": 0, "neutral": 0, "alkaline": 0}
    for bucket in raw:
        key = label_map.get(bucket["_id"])
        if key:
            result[key] = bucket["count"]

    total = sum(result.values())
    return {
        "categories": [
            {
                "label":      "Acidic",
                "range":      "pH < 6.5",
                "count":      result["acidic"],
                "percentage": round(result["acidic"] / total * 100, 1) if total else 0,
            },
            {
                "label":      "Neutral",
                "range":      "6.5 <= pH <= 7.5",
                "count":      result["neutral"],
                "percentage": round(result["neutral"] / total * 100, 1) if total else 0,
            },
            {
                "label":      "Alkaline",
                "range":      "pH > 7.5",
                "count":      result["alkaline"],
                "percentage": round(result["alkaline"] / total * 100, 1) if total else 0,
            },
        ],
        "insight": _ph_insight(result, total),
    }


def _ph_insight(counts: dict, total: int) -> str:
    """Generate a data-driven insight string from actual pH counts."""
    dominant = max(counts, key=counts.get)
    pct      = round(counts[dominant] / total * 100, 1) if total else 0
    labels   = {"acidic": "acidic (pH < 6.5)", "neutral": "neutral (6.5–7.5)", "alkaline": "alkaline (pH > 7.5)"}
    return (
        f"{pct}% of records in the dataset fall within the {labels[dominant]} category, "
        f"making it the most common soil pH range."
    )


# ── 6. Rainfall stats per crop ────────────────────────────────────────────────

def get_rainfall_stats_by_crop() -> list:
    """
    Min, max, average rainfall for each crop.
    Uses the rainfall index for efficient range stats.
    """
    col      = _col()
    pipeline = [
        {
            "$group": {
                "_id":         "$crop",
                "min_rainfall":{"$min": "$rainfall"},
                "max_rainfall":{"$max": "$rainfall"},
                "avg_rainfall":{"$avg": "$rainfall"},
            }
        },
        {"$sort": {"_id": 1}},
        {
            "$project": {
                "_id":          0,
                "crop":         "$_id",
                "min_rainfall": {"$round": ["$min_rainfall", 2]},
                "max_rainfall": {"$round": ["$max_rainfall", 2]},
                "avg_rainfall": {"$round": ["$avg_rainfall", 2]},
            }
        },
    ]
    return list(col.aggregate(pipeline))


# ── 7. Temperature stats per crop ─────────────────────────────────────────────

def get_temperature_stats_by_crop() -> list:
    """
    Min, max, average temperature for each crop.
    Uses the temperature index for efficient range stats.
    """
    col      = _col()
    pipeline = [
        {
            "$group": {
                "_id":            "$crop",
                "min_temperature":{"$min": "$temperature"},
                "max_temperature":{"$max": "$temperature"},
                "avg_temperature":{"$avg": "$temperature"},
            }
        },
        {"$sort": {"_id": 1}},
        {
            "$project": {
                "_id":             0,
                "crop":            "$_id",
                "min_temperature": {"$round": ["$min_temperature", 2]},
                "max_temperature": {"$round": ["$max_temperature", 2]},
                "avg_temperature": {"$round": ["$avg_temperature", 2]},
            }
        },
    ]
    return list(col.aggregate(pipeline))


# ── 8. Humidity stats per crop ────────────────────────────────────────────────

def get_humidity_stats_by_crop() -> list:
    """Min, max, average humidity for each crop."""
    col      = _col()
    pipeline = [
        {
            "$group": {
                "_id":          "$crop",
                "min_humidity": {"$min": "$humidity"},
                "max_humidity": {"$max": "$humidity"},
                "avg_humidity": {"$avg": "$humidity"},
            }
        },
        {"$sort": {"_id": 1}},
        {
            "$project": {
                "_id":          0,
                "crop":         "$_id",
                "min_humidity": {"$round": ["$min_humidity", 2]},
                "max_humidity": {"$round": ["$max_humidity", 2]},
                "avg_humidity": {"$round": ["$avg_humidity", 2]},
            }
        },
    ]
    return list(col.aggregate(pipeline))


# ── 9. Full crop profile ──────────────────────────────────────────────────────

def get_crop_profile(crop_name: str) -> dict | None:
    """
    Complete aggregated profile for a single crop:
    avg/min/max for all 7 parameters.
    """
    col  = _col()
    name = crop_name.lower().strip()

    pipeline = [
        {"$match": {"crop": name}},
        {
            "$group": {
                "_id":             "$crop",
                "record_count":    {"$sum": 1},
                "avg_nitrogen":    {"$avg": "$nitrogen"},
                "min_nitrogen":    {"$min": "$nitrogen"},
                "max_nitrogen":    {"$max": "$nitrogen"},
                "avg_phosphorus":  {"$avg": "$phosphorus"},
                "min_phosphorus":  {"$min": "$phosphorus"},
                "max_phosphorus":  {"$max": "$phosphorus"},
                "avg_potassium":   {"$avg": "$potassium"},
                "min_potassium":   {"$min": "$potassium"},
                "max_potassium":   {"$max": "$potassium"},
                "avg_temperature": {"$avg": "$temperature"},
                "min_temperature": {"$min": "$temperature"},
                "max_temperature": {"$max": "$temperature"},
                "avg_humidity":    {"$avg": "$humidity"},
                "min_humidity":    {"$min": "$humidity"},
                "max_humidity":    {"$max": "$humidity"},
                "avg_ph":          {"$avg": "$ph"},
                "min_ph":          {"$min": "$ph"},
                "max_ph":          {"$max": "$ph"},
                "avg_rainfall":    {"$avg": "$rainfall"},
                "min_rainfall":    {"$min": "$rainfall"},
                "max_rainfall":    {"$max": "$rainfall"},
            }
        },
        {
            "$project": {
                "_id":             0,
                "crop":            "$_id",
                "record_count":    1,
                "avg_nitrogen":    {"$round": ["$avg_nitrogen",    2]},
                "min_nitrogen":    {"$round": ["$min_nitrogen",    2]},
                "max_nitrogen":    {"$round": ["$max_nitrogen",    2]},
                "avg_phosphorus":  {"$round": ["$avg_phosphorus",  2]},
                "min_phosphorus":  {"$round": ["$min_phosphorus",  2]},
                "max_phosphorus":  {"$round": ["$max_phosphorus",  2]},
                "avg_potassium":   {"$round": ["$avg_potassium",   2]},
                "min_potassium":   {"$round": ["$min_potassium",   2]},
                "max_potassium":   {"$round": ["$max_potassium",   2]},
                "avg_temperature": {"$round": ["$avg_temperature", 2]},
                "min_temperature": {"$round": ["$min_temperature", 2]},
                "max_temperature": {"$round": ["$max_temperature", 2]},
                "avg_humidity":    {"$round": ["$avg_humidity",    2]},
                "min_humidity":    {"$round": ["$min_humidity",    2]},
                "max_humidity":    {"$round": ["$max_humidity",    2]},
                "avg_ph":          {"$round": ["$avg_ph",          2]},
                "min_ph":          {"$round": ["$min_ph",          2]},
                "max_ph":          {"$round": ["$max_ph",          2]},
                "avg_rainfall":    {"$round": ["$avg_rainfall",    2]},
                "min_rainfall":    {"$round": ["$min_rainfall",    2]},
                "max_rainfall":    {"$round": ["$max_rainfall",    2]},
            }
        },
    ]

    result = list(col.aggregate(pipeline))
    return result[0] if result else None


# ── 10. All crop profiles (for recommendation) ────────────────────────────────

def get_all_crop_profiles() -> list:
    """
    Returns avg of all 7 parameters for every crop.
    Used by the recommendation engine to build crop profile lookup.
    """
    col      = _col()
    pipeline = [
        {
            "$group": {
                "_id":             "$crop",
                "avg_nitrogen":    {"$avg": "$nitrogen"},
                "avg_phosphorus":  {"$avg": "$phosphorus"},
                "avg_potassium":   {"$avg": "$potassium"},
                "avg_temperature": {"$avg": "$temperature"},
                "avg_humidity":    {"$avg": "$humidity"},
                "avg_ph":          {"$avg": "$ph"},
                "avg_rainfall":    {"$avg": "$rainfall"},
                "min_nitrogen":    {"$min": "$nitrogen"},
                "max_nitrogen":    {"$max": "$nitrogen"},
                "min_phosphorus":  {"$min": "$phosphorus"},
                "max_phosphorus":  {"$max": "$phosphorus"},
                "min_potassium":   {"$min": "$potassium"},
                "max_potassium":   {"$max": "$potassium"},
                "min_temperature": {"$min": "$temperature"},
                "max_temperature": {"$max": "$temperature"},
                "min_humidity":    {"$min": "$humidity"},
                "max_humidity":    {"$max": "$humidity"},
                "min_ph":          {"$min": "$ph"},
                "max_ph":          {"$max": "$ph"},
                "min_rainfall":    {"$min": "$rainfall"},
                "max_rainfall":    {"$max": "$rainfall"},
                "record_count":    {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    return list(col.aggregate(pipeline))


# ── 11. Soil analytics (combined) ────────────────────────────────────────────

def get_soil_analytics() -> dict:
    """
    Combined soil analytics payload for the Soil Analytics page.
    Returns NPK averages per crop + pH distribution.
    """
    return {
        "npk_by_crop":      get_avg_npk_by_crop(),
        "ph_distribution":  get_ph_distribution(),
        "rainfall_by_crop": get_rainfall_stats_by_crop(),
    }


# ── 12. Climate analytics (combined) ─────────────────────────────────────────

def get_climate_analytics(crop_filter: str | None = None) -> dict:
    """
    Combined climate analytics payload for the Climate Analytics page.
    Optionally filtered by crop name.
    """
    col = _col()

    match_stage = {}
    if crop_filter:
        match_stage = {"$match": {"crop": crop_filter.lower().strip()}}

    def run(pipeline):
        if match_stage:
            return list(col.aggregate([match_stage] + pipeline))
        return list(col.aggregate(pipeline))

    temp_pipeline = [
        {"$group": {
            "_id":             "$crop",
            "avg_temperature": {"$avg": "$temperature"},
            "min_temperature": {"$min": "$temperature"},
            "max_temperature": {"$max": "$temperature"},
        }},
        {"$sort": {"_id": 1}},
        {"$project": {
            "_id": 0, "crop": "$_id",
            "avg_temperature": {"$round": ["$avg_temperature", 2]},
            "min_temperature": {"$round": ["$min_temperature", 2]},
            "max_temperature": {"$round": ["$max_temperature", 2]},
        }},
    ]

    humidity_pipeline = [
        {"$group": {
            "_id":          "$crop",
            "avg_humidity": {"$avg": "$humidity"},
            "min_humidity": {"$min": "$humidity"},
            "max_humidity": {"$max": "$humidity"},
        }},
        {"$sort": {"_id": 1}},
        {"$project": {
            "_id": 0, "crop": "$_id",
            "avg_humidity": {"$round": ["$avg_humidity", 2]},
            "min_humidity": {"$round": ["$min_humidity", 2]},
            "max_humidity": {"$round": ["$max_humidity", 2]},
        }},
    ]

    rainfall_pipeline = [
        {"$group": {
            "_id":          "$crop",
            "avg_rainfall": {"$avg": "$rainfall"},
            "min_rainfall": {"$min": "$rainfall"},
            "max_rainfall": {"$max": "$rainfall"},
        }},
        {"$sort": {"_id": 1}},
        {"$project": {
            "_id": 0, "crop": "$_id",
            "avg_rainfall": {"$round": ["$avg_rainfall", 2]},
            "min_rainfall": {"$round": ["$min_rainfall", 2]},
            "max_rainfall": {"$round": ["$max_rainfall", 2]},
        }},
    ]

    return {
        "temperature_by_crop": run(temp_pipeline),
        "humidity_by_crop":    run(humidity_pipeline),
        "rainfall_by_crop":    run(rainfall_pipeline),
        "crop_filter":         crop_filter,
    }

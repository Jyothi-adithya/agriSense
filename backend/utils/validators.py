"""
AgriSense Input Validators
Validates all incoming API inputs with documented ranges.
"""

from typing import Any

# ── Validation ranges (documented) ────────────────────────────────────────────
# N          : 0-200  (dataset max 140)
# P          : 0-200  (dataset max 145)
# K          : 0-210  (dataset max 205; expanded after profiling dataset)
# Temperature: 0-50°C  (dataset range 9.5-43.7°C)
# Humidity: 0-100%
# pH: 0-14  (standard soil pH scale)
# Rainfall: 0-3000 mm/year  (dataset max ~298 mm)

FIELD_RULES: dict[str, dict[str, Any]] = {
    "nitrogen":    {"min": 0,    "max": 200,  "label": "Nitrogen (N)"},
    "phosphorus":  {"min": 0,    "max": 200,  "label": "Phosphorus (P)"},
    "potassium":   {"min": 0,    "max": 210,  "label": "Potassium (K)"},
    "temperature": {"min": 0.0,  "max": 50.0, "label": "Temperature (°C)"},
    "humidity":    {"min": 0.0,  "max": 100.0,"label": "Humidity (%)"},
    "ph":          {"min": 0.0,  "max": 14.0, "label": "pH"},
    "rainfall":    {"min": 0.0,  "max": 3000.0,"label": "Rainfall (mm)"},
}


def validate_crop_input(data: dict, require_crop: bool = False) -> tuple[dict | None, str | None]:
    """
    Validates crop input data for CRUD and recommendation endpoints.

    Parameters:
        data         -- the incoming JSON body dict
        require_crop -- if True, 'crop' field is mandatory (for CREATE)

    Returns:
        (cleaned_data, None)   if valid
        (None, error_message)  if invalid
    """
    if not data:
        return None, "Request body is empty or not JSON."

    cleaned: dict = {}

    for field, rules in FIELD_RULES.items():
        if field not in data:
            return None, f"Missing required field: '{field}'"
        raw = data[field]
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None, f"'{field}' must be a number. Got: {raw!r}"
        if value < rules["min"] or value > rules["max"]:
            return (
                None,
                f"{rules['label']} must be between {rules['min']} and {rules['max']}. Got: {value}",
            )
        cleaned[field] = value

    if require_crop:
        if "crop" not in data or not str(data.get("crop", "")).strip():
            return None, "Missing required field: 'crop'"
        cleaned["crop"] = str(data["crop"]).strip().lower()
    elif "crop" in data:
        crop = str(data["crop"]).strip().lower()
        if crop:
            cleaned["crop"] = crop

    return cleaned, None


def validate_object_id(id_str: str) -> bool:
    """Returns True if the string looks like a valid 24-char hex ObjectId."""
    if not id_str or len(id_str) != 24:
        return False
    try:
        int(id_str, 16)
        return True
    except ValueError:
        return False

"""
AgriSense Recommendation Routes

POST /api/recommend              get crop recommendations
GET  /api/recommendation-history list past recommendation requests
"""

from flask import Blueprint, jsonify, request
from services.recommendation_service import (
    recommend_crops,
    save_recommendation_history,
    get_recommendation_history,
)
from utils.validators import validate_crop_input

recommendation_bp = Blueprint("recommendation", __name__)


@recommendation_bp.route("/recommend", methods=["POST"])
def recommend():
    """
    POST /api/recommend

    Body (JSON):
    {
        "nitrogen":    90,
        "phosphorus":  42,
        "potassium":   43,
        "temperature": 21.0,
        "humidity":    80.0,
        "ph":          6.5,
        "rainfall":    200.0
    }

    Returns ranked list of crops by dataset similarity score.
    """
    body = request.get_json(silent=True) or {}

    # Validate numeric fields only — crop name not needed for recommendation
    data, err = validate_crop_input(body, require_crop=False)
    if err:
        return jsonify({"error": err}), 400

    # Strip crop key if accidentally included; only use numeric params
    user_input = {k: v for k, v in data.items() if k != "crop"}

    result = recommend_crops(user_input)

    if "error" in result:
        return jsonify(result), 404

    # Persist to prediction_history
    try:
        save_recommendation_history(
            user_input        = user_input,
            recommended_crop  = result.get("top_crop", ""),
            score_pct         = result.get("top_score_pct", 0),
        )
    except Exception:
        pass   # Non-critical; do not fail the response if history save fails

    return jsonify(result)


@recommendation_bp.route("/recommendation-history", methods=["GET"])
def history():
    """GET /api/recommendation-history — most recent 20 requests."""
    limit = int(request.args.get("limit", 20))
    data  = get_recommendation_history(limit=limit)
    return jsonify({"data": data, "count": len(data)})

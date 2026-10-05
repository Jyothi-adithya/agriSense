"""
AgriSense Analytics Routes

GET  /api/dashboard                     KPI summary
GET  /api/analytics/crop-distribution   count per crop
GET  /api/analytics/soil                NPK + pH analytics
GET  /api/analytics/climate             temperature, humidity, rainfall
GET  /api/analytics/crop-profile/<crop> full profile for one crop
GET  /api/crops/list                    distinct crop name list
"""

from flask import Blueprint, jsonify, request
from services.analytics_service import (
    get_dashboard_stats,
    get_crop_distribution,
    get_soil_analytics,
    get_climate_analytics,
    get_crop_profile,
    get_avg_npk_by_crop,
    get_avg_climate_by_crop,
    get_rainfall_stats_by_crop,
    get_temperature_stats_by_crop,
    get_humidity_stats_by_crop,
)
from flask import current_app

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/dashboard", methods=["GET"])
def dashboard():
    """GET /api/dashboard — dashboard KPIs via single aggregation pass."""
    stats = get_dashboard_stats()
    if not stats:
        return jsonify({"error": "No data in database. Run the import script first."}), 404

    # Also include crop distribution for charts
    distribution = get_crop_distribution()
    stats["crop_distribution"] = distribution

    return jsonify(stats)


@analytics_bp.route("/analytics/crop-distribution", methods=["GET"])
def crop_distribution():
    """GET /api/analytics/crop-distribution"""
    data = get_crop_distribution()
    return jsonify({"data": data, "count": len(data)})


@analytics_bp.route("/analytics/soil", methods=["GET"])
def soil_analytics():
    """GET /api/analytics/soil — NPK averages + pH distribution."""
    data = get_soil_analytics()
    return jsonify(data)


@analytics_bp.route("/analytics/climate", methods=["GET"])
def climate_analytics():
    """
    GET /api/analytics/climate
    Optional query param: ?crop=rice  (filter results to one crop)
    """
    crop_filter = request.args.get("crop", None)
    data        = get_climate_analytics(crop_filter)
    return jsonify(data)


@analytics_bp.route("/analytics/crop-profile/<crop_name>", methods=["GET"])
def crop_profile(crop_name):
    """GET /api/analytics/crop-profile/<crop> — full stats for one crop."""
    profile = get_crop_profile(crop_name)
    if not profile:
        return jsonify({"error": f"No data found for crop: '{crop_name}'"}), 404
    return jsonify({"data": profile})


@analytics_bp.route("/analytics/npk", methods=["GET"])
def npk_analytics():
    """GET /api/analytics/npk — average NPK per crop."""
    data = get_avg_npk_by_crop()
    return jsonify({"data": data})


@analytics_bp.route("/analytics/rainfall", methods=["GET"])
def rainfall_analytics():
    """GET /api/analytics/rainfall — min/max/avg rainfall per crop."""
    data = get_rainfall_stats_by_crop()
    return jsonify({"data": data})


@analytics_bp.route("/analytics/temperature", methods=["GET"])
def temperature_analytics():
    """GET /api/analytics/temperature — min/max/avg temperature per crop."""
    data = get_temperature_stats_by_crop()
    return jsonify({"data": data})


@analytics_bp.route("/analytics/humidity", methods=["GET"])
def humidity_analytics():
    """GET /api/analytics/humidity — min/max/avg humidity per crop."""
    data = get_humidity_stats_by_crop()
    return jsonify({"data": data})


@analytics_bp.route("/crops/names", methods=["GET"])
def crop_names():
    """GET /api/crops/names — sorted list of distinct crop names."""
    db    = current_app.config["DB"]
    names = sorted(db["crop_data"].distinct("crop"))
    return jsonify({"data": names, "count": len(names)})

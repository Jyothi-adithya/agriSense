"""
AgriSense Crop Routes — full CRUD implementation.

POST   /api/crops         create a record
GET    /api/crops         list with filters, sorting, pagination
GET    /api/crops/<id>    get one record
PUT    /api/crops/<id>    update a record
DELETE /api/crops/<id>    delete a record
"""

from flask import Blueprint, jsonify, request, current_app
from services.crop_service import (
    create_crop, list_crops, get_crop_by_id, update_crop, delete_crop,
)
from utils.validators import validate_crop_input, validate_object_id

crop_bp = Blueprint("crops", __name__)


# ── POST /api/crops ───────────────────────────────────────────────────────────

@crop_bp.route("/crops", methods=["POST"])
def create():
    """Create a new crop record."""
    data, err = validate_crop_input(request.get_json(silent=True) or {}, require_crop=True)
    if err:
        return jsonify({"error": err}), 400

    doc = create_crop(data)
    return jsonify({"message": "Record created successfully.", "data": doc}), 201


# ── GET /api/crops ────────────────────────────────────────────────────────────

@crop_bp.route("/crops", methods=["GET"])
def list_all():
    """
    List crop records with optional filters, sorting, pagination.

    Query params:
        crop, search, ph_min, ph_max, rain_min, rain_max, temp_min, temp_max,
        sort_by, sort_dir (asc|desc), page, page_size
    """
    args = request.args

    def _float(key):
        try:
            return float(args[key]) if key in args else None
        except ValueError:
            return None

    result = list_crops(
        crop      = args.get("crop"),
        search    = args.get("search"),
        ph_min    = _float("ph_min"),
        ph_max    = _float("ph_max"),
        rain_min  = _float("rain_min"),
        rain_max  = _float("rain_max"),
        temp_min  = _float("temp_min"),
        temp_max  = _float("temp_max"),
        sort_by   = args.get("sort_by", "crop"),
        sort_dir  = args.get("sort_dir", "asc"),
        page      = int(args.get("page", 1)),
        page_size = int(args.get("page_size", 20)),
    )
    return jsonify(result)


# ── GET /api/crops/<id> ───────────────────────────────────────────────────────

@crop_bp.route("/crops/<crop_id>", methods=["GET"])
def get_one(crop_id):
    """Get a single crop record by MongoDB ObjectId."""
    if not validate_object_id(crop_id):
        return jsonify({"error": "Invalid record ID format."}), 400

    doc = get_crop_by_id(crop_id)
    if not doc:
        return jsonify({"error": "Record not found."}), 404

    return jsonify({"data": doc})


# ── PUT /api/crops/<id> ───────────────────────────────────────────────────────

@crop_bp.route("/crops/<crop_id>", methods=["PUT"])
def update(crop_id):
    """Update a crop record by ObjectId. Validates all provided fields."""
    if not validate_object_id(crop_id):
        return jsonify({"error": "Invalid record ID format."}), 400

    body = request.get_json(silent=True) or {}
    if not body:
        return jsonify({"error": "Request body is empty."}), 400

    # Allow partial updates — only validate fields that are present
    data, err = validate_crop_input(body)
    if err:
        return jsonify({"error": err}), 400

    # For update, crop name is optional
    if "crop" in body:
        data["crop"] = str(body["crop"]).strip().lower()

    doc = update_crop(crop_id, data)
    if not doc:
        return jsonify({"error": "Record not found."}), 404

    return jsonify({"message": "Record updated successfully.", "data": doc})


# ── DELETE /api/crops/<id> ────────────────────────────────────────────────────

@crop_bp.route("/crops/<crop_id>", methods=["DELETE"])
def delete(crop_id):
    """Delete a crop record by ObjectId."""
    if not validate_object_id(crop_id):
        return jsonify({"error": "Invalid record ID format."}), 400

    deleted = delete_crop(crop_id)
    if not deleted:
        return jsonify({"error": "Record not found."}), 404

    return jsonify({"message": "Record deleted successfully."})

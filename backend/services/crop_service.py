"""
AgriSense Crop Service — CRUD operations on crop_data collection.
"""

from bson import ObjectId
from bson.errors import InvalidId
from flask import current_app
from pymongo import ASCENDING, DESCENDING


def _col():
    """Returns the crop_data collection from the current app context."""
    return current_app.config["DB"]["crop_data"]


def _serialize(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serialisable dict."""
    doc["_id"] = str(doc["_id"])
    return doc


# ── CREATE ─────────────────────────────────────────────────────────────────────

def create_crop(data: dict) -> dict:
    """
    Insert a single validated crop document.
    Returns the inserted document with its new _id.
    """
    col    = _col()
    result = col.insert_one(data)
    doc    = col.find_one({"_id": result.inserted_id})
    return _serialize(doc)


# ── READ (list) ───────────────────────────────────────────────────────────────

def list_crops(
    crop: str | None       = None,
    ph_min: float | None   = None,
    ph_max: float | None   = None,
    rain_min: float | None = None,
    rain_max: float | None = None,
    temp_min: float | None = None,
    temp_max: float | None = None,
    search: str | None     = None,
    sort_by: str           = "crop",
    sort_dir: str          = "asc",
    page: int              = 1,
    page_size: int         = 20,
) -> dict:
    """
    Returns a paginated, filtered, sorted list of crop records.

    Supported filters:
        crop      — exact match (case-insensitive)
        ph        — range [ph_min, ph_max]
        rainfall  — range [rain_min, rain_max]
        temperature — range [temp_min, temp_max]
        search    — substring match on crop name
    """
    col   = _col()
    query = {}

    # Crop filter
    if crop:
        query["crop"] = crop.lower().strip()

    # Search (substring on crop name)
    if search:
        query["crop"] = {"$regex": search.strip(), "$options": "i"}

    # Numeric range filters
    for field, lo, hi in [
        ("ph",          ph_min,   ph_max),
        ("rainfall",    rain_min, rain_max),
        ("temperature", temp_min, temp_max),
    ]:
        rng = {}
        if lo is not None:
            rng["$gte"] = lo
        if hi is not None:
            rng["$lte"] = hi
        if rng:
            query[field] = rng

    # Sort
    ALLOWED_SORT = {
        "crop", "nitrogen", "phosphorus", "potassium",
        "temperature", "humidity", "ph", "rainfall",
    }
    sort_field = sort_by if sort_by in ALLOWED_SORT else "crop"
    direction  = ASCENDING if sort_dir == "asc" else DESCENDING

    # Pagination
    page      = max(1, page)
    page_size = min(max(1, page_size), 100)
    skip      = (page - 1) * page_size

    total  = col.count_documents(query)
    cursor = col.find(query).sort(sort_field, direction).skip(skip).limit(page_size)
    docs   = [_serialize(d) for d in cursor]

    return {
        "data":        docs,
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


# ── READ (one) ────────────────────────────────────────────────────────────────

def get_crop_by_id(crop_id: str) -> dict | None:
    """Returns one crop document by ObjectId string, or None if not found."""
    try:
        oid = ObjectId(crop_id)
    except InvalidId:
        return None
    col = _col()
    doc = col.find_one({"_id": oid})
    return _serialize(doc) if doc else None


# ── UPDATE ────────────────────────────────────────────────────────────────────

def update_crop(crop_id: str, data: dict) -> dict | None:
    """
    Updates a crop document by ObjectId.
    Returns the updated document, or None if not found / invalid id.
    """
    try:
        oid = ObjectId(crop_id)
    except InvalidId:
        return None

    col    = _col()
    result = col.find_one_and_update(
        {"_id": oid},
        {"$set": data},
        return_document=True,   # return updated doc
    )
    return _serialize(result) if result else None


# ── DELETE ────────────────────────────────────────────────────────────────────

def delete_crop(crop_id: str) -> bool:
    """
    Deletes a crop document by ObjectId.
    Returns True if deleted, False if not found.
    """
    try:
        oid = ObjectId(crop_id)
    except InvalidId:
        return False

    col    = _col()
    result = col.delete_one({"_id": oid})
    return result.deleted_count == 1

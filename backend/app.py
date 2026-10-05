"""
AgriSense Flask Application Entry Point
"""

from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

from config import Config
from routes.crop_routes import crop_bp
from routes.analytics_routes import analytics_bp
from routes.recommendation_routes import recommendation_bp


def create_app() -> Flask:
    """Application factory — creates and configures the Flask app."""

    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS(app, origins=Config.CORS_ORIGINS)

    # ── MongoDB connection ────────────────────────────────────────────────────
    client = MongoClient(Config.MONGODB_URI, serverSelectionTimeoutMS=3000)
    db = client[Config.DATABASE_NAME]

    # Attach db to app context so blueprints can access it
    app.config["DB"] = db
    app.config["MONGO_CLIENT"] = client

    # ── Blueprints ────────────────────────────────────────────────────────────
    app.register_blueprint(crop_bp, url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api")
    app.register_blueprint(recommendation_bp, url_prefix="/api")

    # ── Health check ──────────────────────────────────────────────────────────
    @app.route("/api/health", methods=["GET"])
    def health():
        """Returns MongoDB connection status and basic DB statistics."""
        try:
            # Ping MongoDB — raises ConnectionFailure if unreachable
            client.admin.command("ping")
            record_count = db[Config.CROP_COLLECTION].count_documents({})
            crop_count = len(db[Config.CROP_COLLECTION].distinct("crop"))
            return jsonify(
                {
                    "status": "ok",
                    "message": "AgriSense API is running",
                    "mongodb": {
                        "status": "connected",
                        "uri": Config.MONGODB_URI,
                        "database": Config.DATABASE_NAME,
                        "collection": Config.CROP_COLLECTION,
                        "record_count": record_count,
                        "crop_count": crop_count,
                    },
                    "version": "1.0.0",
                }
            )
        except ConnectionFailure as exc:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "MongoDB connection failed",
                        "mongodb": {"status": "disconnected", "error": str(exc)},
                    }
                ),
                503,
            )

    # ── Global error handlers ─────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found", "status": 404}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed", "status": 405}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "status": 500}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    print(f"  AgriSense API running on http://localhost:{Config.FLASK_PORT}")
    print(f"  Health check: http://localhost:{Config.FLASK_PORT}/api/health")
    app.run(
        host="0.0.0.0",
        port=Config.FLASK_PORT,
        debug=(Config.FLASK_ENV == "development"),
    )

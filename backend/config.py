"""
AgriSense Backend Configuration
Loads environment variables and exposes settings.
"""

import os
from dotenv import load_dotenv

# Load .env from the same directory as this file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


class Config:
    """Central configuration for the AgriSense Flask application."""

    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "agrisense_db")
    FLASK_ENV: str = os.getenv("FLASK_ENV", "development")
    FLASK_PORT: int = int(os.getenv("FLASK_PORT", "5000"))

    # Collection names
    CROP_COLLECTION: str = "crop_data"
    HISTORY_COLLECTION: str = "prediction_history"

    # CORS allowed origins
    CORS_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173"]

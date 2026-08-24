# app/database.py

import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Example: "mongodb://localhost:27017/NutriAi"
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/NutriAi")

_client: Optional[AsyncIOMotorClient] = None
_db = None


def get_client() -> AsyncIOMotorClient:
    """
    Singleton Motor client.
    Uses MONGO_URI from .env.
    For local "mongodb://..." we do NOT enable TLS/SSL.
    """
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            # IMPORTANT: no TLS for local mongodb:// unless you explicitly configured Mongo with TLS
            tls=False,
        )
    return _client


def get_db():
    """
    Return the default database from the connection string.
    With mongodb://localhost:27017/NutriAi this is "NutriAi".
    """
    global _db
    if _db is None:
        _db = get_client().get_default_database()
    return _db


def get_scans_collection():
    """
    Collection where camera/body scans are stored.
    Used by /camera-analyze and /scan-history.
    """
    return get_db()["body_scans"]


def get_preferences_collection():
    """
    Collection where liked meals are stored.
    Used by /preferences endpoints.
    """
    return get_db()["meal_likes"]
"""
Async MongoDB connection for the NutriSight ML backend.
Connects to the same Atlas cluster as the Node.js backend using MONGO_URI from .env.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI not set in ml-backend/.env — copy it from Backend/.env")

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            MONGO_URI,
            tls=True,
            serverSelectionTimeoutMS=5000,
        )
    return _client


def get_db():
    """Return the nutrisight database handle."""
    return get_client()["nutrisight"]


def get_scans_collection():
    """Return the body_scans collection."""
    return get_db()["body_scans"]


def get_preferences_collection():
    """Return the meal_preferences collection."""
    return get_db()["meal_preferences"]

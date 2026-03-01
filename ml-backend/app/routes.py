"""
NutriSight ML API routes.

  POST /api/analyze                 – USDA food nutrition lookup
  POST /api/body-analyze            – BMI-estimated body classification
  POST /api/camera-analyze          – Camera-based body classification (saves to MongoDB)
  GET  /api/scan-history/{user_id}  – Fetch past body scans for a user
  GET  /api/weekly-plan             – RL-based 7-day meal plan for current user
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Any, Dict

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
import numpy as np
import httpx
import pandas as pd

from app.usda import get_nutrition
from app.body_analyzer import (
    analyze_body,
    body_classifier,
    scaler,
    label_encoder,
    MODELS_LOADED,
)
from app.database import get_scans_collection, get_preferences_collection
from utils.nutrition_calculator import NutritionCalculator

# RL recommender imports
from recommender.nutrition_engine import UserProfile, ActivityLevel, Goal
from recommender.bandit import LinUCBBandit
from recommender.meal_recommender import MealRecommender

router = APIRouter()
nutrition_calc = NutritionCalculator()
logger = logging.getLogger(__name__)

# ── User service config ─────────────────────────────────────────────────────
USER_SERVICE_BASE_URL = "http://localhost:5000"


async def fetch_user_profile_from_node(authorization: Optional[str]) -> dict:
    """
    Fetch current user profile from Node backend (/api/users/me).
    Requires a Bearer token in Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required to fetch user profile.")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{USER_SERVICE_BASE_URL}/api/users/me",
                headers={"Authorization": authorization},
                timeout=8.0,
            )
    except httpx.ReadTimeout:
        raise HTTPException(status_code=504, detail="User service timed out while fetching profile.")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"User service error: {exc}")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Failed to fetch user profile: {resp.text}",
        )

    return resp.json()


# ── Load food dataset & init bandit + recommender ──────────────────────────
# Resolve path relative to ml-backend root so it works regardless of cwd
_ML_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOOD_CSV_PATH = os.path.join(_ML_BACKEND_ROOT, "dataset", "sample.csv")

try:
    food_df = pd.read_csv(FOOD_CSV_PATH)
except Exception as e:
    raise RuntimeError(f"Failed to load food dataset from {FOOD_CSV_PATH}: {e}")

# Feature dimension for LinUCB:
# bias + bmi + gender + 4 meal one-hot + 4 macro fractions = 11
BANDIT_FEATURE_DIM = 11
bandit = LinUCBBandit(d=BANDIT_FEATURE_DIM, alpha=0.4)
meal_recommender = MealRecommender(food_df, bandit)


# ── Food Nutrition ──────────────────────────────────────────────────────────
class MealRequest(BaseModel):
    meal_name: str
    weight_grams: float


@router.post("/analyze")
async def analyze(req: MealRequest):
    return await get_nutrition(req.meal_name, req.weight_grams)


class MealDetectionResultRequest(BaseModel):
    user_id: str
    meal_type: Optional[str] = None
    jwt_token: Optional[str] = None
    analysis: Dict[str, Any] = {}
    daily_targets: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


@router.post("/meal/detection-result")
async def meal_detection_result(req: MealDetectionResultRequest):
    """
    n8n callback endpoint for posting finalized meal detection/nutrition output.
    """
    return {
        "success": True,
        "message": "Meal detection result received",
        "received_for_user": req.user_id,
        "meal_type": req.meal_type,
        "analysis_keys": list(req.analysis.keys()),
    }


# ── Body Analysis (BMI-estimated ratios) ───────────────────────────────────
class BodyRequest(BaseModel):
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = "moderate"


@router.post("/body-analyze")
@router.post("/body-analysis")
async def body_analyze(req: BodyRequest, authorization: Optional[str] = Header(default=None)):
    user = await fetch_user_profile_from_node(authorization) if authorization else {}

    height_cm = req.height_cm if req.height_cm is not None else user.get("height")
    weight_kg = req.weight_kg if req.weight_kg is not None else user.get("weight")
    age = req.age if req.age is not None else user.get("age")
    gender = req.gender if req.gender is not None else user.get("gender")
    activity_level = req.activity_level or user.get("activityLevel") or "moderate"

    if height_cm is None or weight_kg is None or age is None or gender is None:
        raise HTTPException(
            status_code=400,
            detail="Missing profile fields. Provide height_cm, weight_kg, age, gender or send Authorization for Node profile fetch.",
        )

    g = str(gender).lower()
    normalized_gender = "female" if g == "female" else "male"

    return analyze_body(
        height_cm=float(height_cm),
        weight_kg=float(weight_kg),
        age=int(age),
        gender=normalized_gender,
        activity_level=str(activity_level),
    )


# ── Camera Body Analysis — saves one scan to MongoDB ───────────────────────
class CameraAnalyzeRequest(BaseModel):
    # Who is being scanned
    user_id: str
    # Body metrics from profile
    height_cm: float
    weight_kg: float
    age: int
    gender: str
    activity_level: str = "moderate"
    # Real landmark features extracted by MediaPipe in the browser
    waist_hip_ratio: float
    shoulder_waist_ratio: float
    torso_leg_ratio: float
    body_aspect_ratio: float
    # Optional quality info
    pose_quality: Optional[float] = None


@router.post("/camera-analyze")
async def camera_analyze(req: CameraAnalyzeRequest):
    """
    Use MediaPipe landmark features + trained model when available,
    otherwise fall back to a BMI-based heuristic.
    Also persists the scan to MongoDB.
    """
    height_m = req.height_cm / 100
    bmi = req.weight_kg / (height_m ** 2)
    gender_encoded = 1 if str(req.gender).lower() == "male" else 0

    # Default BMI-based fallback
    if bmi < 18.5:
        category = "under_weight"
    elif bmi < 25:
        category = "normal"
    elif bmi < 30:
        category = "overweight"
    elif bmi < 35:
        category = "obese"
    else:
        category = "extremely_obese"

    confidence = 0.65
    inference_mode = "bmi_heuristic_fallback"
    inference_error: Optional[str] = None

    # Try trained model if loaded
    if MODELS_LOADED:
        try:
            features = np.array(
                [[
                    round(float(bmi), 2),
                    req.waist_hip_ratio,
                    req.shoulder_waist_ratio,
                    req.torso_leg_ratio,
                    req.body_aspect_ratio,
                    req.age,
                    gender_encoded,
                ]]
            )

            features_scaled = scaler.transform(features)
            prediction = body_classifier.predict(features_scaled)[0]
            probabilities = body_classifier.predict_proba(features_scaled)[0]

            category = label_encoder.inverse_transform([prediction])[0]
            confidence = float(probabilities[prediction])
            inference_mode = "trained_model"

        except Exception as exc:
            logger.exception("Camera analyze model inference failed")
            inference_error = str(exc)
            # BMI heuristic result kept as fallback

    # Build nutrition plan regardless of mode
    nutrition = nutrition_calc.get_complete_nutrition_plan(
        weight_kg=req.weight_kg,
        height_cm=req.height_cm,
        age=req.age,
        gender=req.gender,
        category=category,
        activity_level=req.activity_level,
    )

    result_bmi = round(float(bmi), 1)
    result_confidence = round(confidence * 100, 1)

    scan_doc = {
        "user_id": req.user_id,
        "scanned_at": datetime.now(timezone.utc),
        "source": "camera",
        "bmi": result_bmi,
        "category": category,
        "confidence": result_confidence,
        "pose_quality": req.pose_quality,
        "inputs": {
            "height_cm": req.height_cm,
            "weight_kg": req.weight_kg,
            "age": req.age,
            "gender": req.gender,
            "activity_level": req.activity_level,
        },
        "nutrition_plan": nutrition,
        "landmark_features": {
            "waist_hip_ratio": req.waist_hip_ratio,
            "shoulder_waist_ratio": req.shoulder_waist_ratio,
            "torso_leg_ratio": req.torso_leg_ratio,
            "body_aspect_ratio": req.body_aspect_ratio,
        },
        "inference": {
            "mode": inference_mode,
            "models_loaded": MODELS_LOADED,
            "raw_bmi": bmi,
        },
    }

    # Persist to MongoDB
    scan_id: Optional[str] = None
    persisted = False
    persistence_error: Optional[str] = None
    try:
        scans = get_scans_collection()
        insert_result = await scans.insert_one(scan_doc)
        scan_id = str(insert_result.inserted_id)
        persisted = True
    except Exception as exc:
        logger.exception("Failed to persist camera scan to MongoDB")
        persistence_error = str(exc)

    return {
        "scan_id": scan_id,
        "bmi": result_bmi,
        "category": category,
        "confidence": result_confidence,
        "pose_quality": req.pose_quality,
        "source": "camera",
        "scanned_at": scan_doc["scanned_at"].isoformat(),
        "nutrition_plan": nutrition,
        "inference_mode": inference_mode,
        "inference_error": inference_error,
        "models_loaded": MODELS_LOADED,
        "persisted": persisted,
        "persistence_error": persistence_error,
    }


# ── Scan History for a user ────────────────────────────────────────────────
@router.get("/scan-history/{user_id}")
async def scan_history(user_id: str, limit: int = 10):
    """
    Return the most recent `limit` body scans for user_id,
    newest first, with lightweight fields for the timeline view.
    """
    scans = get_scans_collection()
    try:
        cursor = (
            scans.find(
                {"user_id": user_id},
                {
                    "_id": 1,
                    "scanned_at": 1,
                    "bmi": 1,
                    "category": 1,
                    "confidence": 1,
                    "pose_quality": 1,
                    "inputs": 1,
                    "nutrition_plan.daily_targets": 1,
                },
            )
            .sort("scanned_at", -1)
            .limit(limit)
        )

        docs = []
        async for doc in cursor:
            doc["scan_id"] = str(doc.pop("_id"))
            if "scanned_at" in doc and hasattr(doc["scanned_at"], "isoformat"):
                doc["scanned_at"] = doc["scanned_at"].isoformat()
            docs.append(doc)

        return {"scans": docs, "count": len(docs)}
    except Exception as exc:
        logger.exception("Failed to fetch scan history from MongoDB")
        raise HTTPException(
            status_code=502,
            detail=f"Database error while fetching scan history: {exc}",
        )


# ── Meal Price Lookup ────────────────────────────────────────────────────────
@router.get("/meal-prices")
async def meal_prices():
    """
    Return a dict mapping every dish name → price (INR) from the food dataset.
    Used by the budget page to show live prices on AI-recommended meals.
    """
    if "Price (INR)" not in food_df.columns:
        return {"prices": {}, "note": "Price column not in dataset"}

    # Build dish → price mapping from the enriched CSV
    price_map = (
        food_df[["Dish Name", "Price (INR)"]]
        .dropna()
        .drop_duplicates(subset=["Dish Name"])
        .set_index("Dish Name")["Price (INR)"]
        .astype(float)
        .to_dict()
    )

    # Also return a summary used by the budget overview
    avg_price = round(sum(price_map.values()) / max(len(price_map), 1), 1)
    min_price = round(min(price_map.values()), 1) if price_map else 0
    max_price = round(max(price_map.values()), 1) if price_map else 0

    return {
        "prices": price_map,
        "count": len(price_map),
        "avg_inr": avg_price,
        "min_inr": min_price,
        "max_inr": max_price,
    }


# ── Weekly meal plan (RL) for current user ─────────────────────────────────
@router.get("/weekly-plan")
async def weekly_plan(
    goal: str = "maintenance",
    activity_level: str = "moderate",
    dietary_pref: str = "veg",
    # ── Optional profile fields sent directly from the frontend ───────────
    # When these are provided the Node backend call is skipped entirely,
    # eliminating the httpx.ReadTimeout issue.
    height: Optional[float] = None,
    weight: Optional[float] = None,
    age: Optional[int] = None,
    gender: Optional[str] = None,
    user_id: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
):
    """
    Build a 7-day RL-based meal plan for the current user.

    Priority for profile data:
      1. Query params (height/weight/age/gender) — fastest, no inter-service call.
      2. Fetch from Node backend using Authorization header — fallback only.
    """

    # ── 1) Resolve profile ────────────────────────────────────────────────
    resolved_user_id = user_id or "anonymous"
    height_cm: Optional[float] = height
    weight_kg: Optional[float] = weight
    resolved_age: Optional[int] = age
    resolved_gender: Optional[str] = gender.lower() if isinstance(gender, str) else None

    if authorization:
        node_user = await fetch_user_profile_from_node(authorization)
        resolved_user_id = str(node_user.get("_id", resolved_user_id))

        if height_cm is None:
            height_cm = node_user.get("height")
        if weight_kg is None:
            weight_kg = node_user.get("weight")
        if resolved_age is None:
            resolved_age = node_user.get("age")
        if resolved_gender is None:
            node_gender = str(node_user.get("gender") or "").lower()
            resolved_gender = node_gender if node_gender in ("male", "female") else "male"

        node_activity = str(node_user.get("activityLevel") or "").lower()
        if node_activity in ("sedentary", "light", "moderate", "very_active", "extra_active"):
            activity_level = node_activity
        elif node_activity == "active":
            activity_level = "very_active"

    if height_cm is None:
        height_cm = 170.0
    if weight_kg is None:
        weight_kg = 70.0
    if resolved_age is None:
        resolved_age = 25
    if resolved_gender not in ("male", "female"):
        resolved_gender = "male"

    # ── 2) Validate enums ────────────────────────────────────────────────
    if goal not in ("weight_loss", "maintenance", "muscle_gain"):
        goal = "maintenance"
    if activity_level not in ("sedentary", "light", "moderate", "very_active", "extra_active"):
        activity_level = "moderate"
    dietary_pref = "veg" if dietary_pref.lower() == "veg" else "non-veg"

    # ── 3) Build UserProfile ─────────────────────────────────────────────
    profile = UserProfile(
        user_id=resolved_user_id,
        height_cm=height_cm,
        weight_kg=weight_kg,
        age=resolved_age,
        gender=resolved_gender,        # type: ignore[arg-type]
        activity_level=activity_level, # type: ignore[arg-type]
        goal=goal,                     # type: ignore[arg-type]
        dietary_pref=dietary_pref,     # type: ignore[arg-type]
        allergies=None,
    )

    # ── 4) Generate weekly plan via RL recommender ───────────────────────
    plan = meal_recommender.generate_weekly_plan(profile)

    # ── 5) Inject fiber_g and water_ml into daily_targets ────────────────
    cal = plan["daily_targets"].get("calories", 2000)
    plan["daily_targets"]["fiber_g"]  = round(14 * cal / 1000, 1)
    plan["daily_targets"]["water_ml"] = round(35 * profile.weight_kg)

    return plan


# ── Meal Preferences (Like / Unlike / Fetch) ────────────────────────────────

class LikeRequest(BaseModel):
    user_id: str
    dish_name: str
    calories_kcal: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fats_g: float = 0.0
    category: str = ""
    veg_nonveg: str = ""


class UnlikeRequest(BaseModel):
    user_id: str
    dish_name: str


@router.get("/preferences/{user_id}")
async def get_preferences(user_id: str):
    """
    Return all liked meals for a given user_id.
    """
    prefs = get_preferences_collection()
    cursor = prefs.find(
        {"user_id": user_id},
        {"_id": 0},  # exclude internal Mongo _id
    ).sort("liked_at", -1)

    docs = []
    async for doc in cursor:
        docs.append(doc)

    return {"preferences": docs, "count": len(docs)}


@router.post("/preferences/like", status_code=201)
async def like_meal(req: LikeRequest):
    """
    Upsert a like for a meal.
    Uses (user_id + dish_name) as the unique key so duplicate likes are idempotent.
    """
    from app.database import get_db

    prefs = get_preferences_collection()
    db = get_db()
    dislikes_col = db["meal_dislikes"]

    doc = {
        "user_id":      req.user_id,
        "dish_name":    req.dish_name,
        "calories_kcal": req.calories_kcal,
        "protein_g":   req.protein_g,
        "carbs_g":     req.carbs_g,
        "fats_g":      req.fats_g,
        "category":    req.category,
        "veg_nonveg":  req.veg_nonveg,
        "liked_at":    datetime.now(timezone.utc),
    }

    await prefs.update_one(
        {"user_id": req.user_id, "dish_name": req.dish_name},
        {"$set": doc},
        upsert=True,
    )

    # If user likes a meal, clear any prior dislike for the same dish.
    await dislikes_col.delete_one({"user_id": req.user_id, "dish_name": req.dish_name})
    bandit.dislikes.pop((req.user_id, req.dish_name), None)

    return {"message": "Meal liked", "dish_name": req.dish_name}


@router.delete("/preferences/unlike")
async def unlike_meal(req: UnlikeRequest):
    """
    Remove a like for a (user_id, dish_name) pair.
    Returns 404 if it didn't exist.
    """
    prefs = get_preferences_collection()
    result = await prefs.delete_one(
        {"user_id": req.user_id, "dish_name": req.dish_name}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Preference not found")

    return {"message": "Meal unliked", "dish_name": req.dish_name}


@router.delete("/preferences/undislike")
async def undislike_meal(req: UnlikeRequest):
    """
    Remove a dislike for a (user_id, dish_name) pair.
    Returns 404 if it didn't exist.
    """
    from app.database import get_db

    db = get_db()
    dislikes_col = db["meal_dislikes"]
    result = await dislikes_col.delete_one(
        {"user_id": req.user_id, "dish_name": req.dish_name}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dislike not found")

    # Also clear in-memory hard exclusion used by LinUCB filtering.
    bandit.dislikes.pop((req.user_id, req.dish_name), None)

    return {"message": "Meal undisliked", "dish_name": req.dish_name}


# ── Dislike endpoint — teaches the bandit to avoid this meal ────────────────

class DislikeRequest(BaseModel):
    user_id: str
    dish_name: str
    calories_kcal: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fats_g: float = 0.0
    category: str = ""
    veg_nonveg: str = ""


@router.post("/preferences/dislike", status_code=201)
async def dislike_meal(req: DislikeRequest):
    """
    Record a dislike for a meal.
    - Stores the dislike in MongoDB 'meal_dislikes' collection.
    - Registers the negative signal in the in-memory LinUCB bandit so the
      model avoids this dish for this user in future recommendations.
    - Removes any existing like for the same dish (can't both like & dislike).
    """
    from app.database import get_db

    db = get_db()
    dislikes_col = db["meal_dislikes"]
    prefs_col = get_preferences_collection()

    # Upsert dislike record
    doc = {
        "user_id":       req.user_id,
        "dish_name":     req.dish_name,
        "calories_kcal": req.calories_kcal,
        "protein_g":     req.protein_g,
        "carbs_g":       req.carbs_g,
        "fats_g":        req.fats_g,
        "category":      req.category,
        "veg_nonveg":    req.veg_nonveg,
        "disliked_at":   datetime.now(timezone.utc),
    }
    await dislikes_col.update_one(
        {"user_id": req.user_id, "dish_name": req.dish_name},
        {"$set": doc},
        upsert=True,
    )

    # Remove any existing like for this dish
    await prefs_col.delete_one(
        {"user_id": req.user_id, "dish_name": req.dish_name}
    )

    # ── Teach the bandit: register a -1 feedback for this dish ────────────
    # Find the dish row in the food_df so we can build the context vector
    mask = food_df["Dish Name"] == req.dish_name
    if mask.any():
        dish_row = food_df[mask].iloc[0]

        # Build a minimal UserProfile for the bandit update
        from recommender.nutrition_engine import UserProfile, compute_macro_targets
        dummy_profile = UserProfile(
            user_id=req.user_id,
            height_cm=170.0,
            weight_kg=70.0,
            age=25,
            gender="male",
            activity_level="moderate",
            goal="maintenance",
            dietary_pref="veg",
        )
        daily_targets = compute_macro_targets(dummy_profile)
        bandit.update(
            profile=dummy_profile,
            daily_targets=daily_targets,
            meal_type=req.category or "lunch",
            dish_row=dish_row,
            feedback=-1,   # ← negative feedback
        )

    return {"message": "Meal disliked", "dish_name": req.dish_name}


@router.get("/preferences/dislikes/{user_id}")
async def get_dislikes(user_id: str):
    """Return all disliked meals for a given user."""
    from app.database import get_db
    db = get_db()
    cursor = db["meal_dislikes"].find({"user_id": user_id}, {"_id": 0}).sort("disliked_at", -1)
    docs = []
    async for doc in cursor:
        docs.append(doc)
    return {"dislikes": docs, "count": len(docs)}


# ── Budget management & analysis ─────────────────────────────────────────────
class BudgetModel(BaseModel):
    monthly_budget: float
    current_monthly_spend: float = 0.0


def get_budget_collection():
    from app.database import get_db
    return get_db()["user_budgets"]


@router.get("/budget/{user_id}")
async def get_budget(user_id: str):
    col = get_budget_collection()
    doc = await col.find_one({"user_id": user_id})
    if not doc:
        return {"budget": None}
    doc.pop("_id", None)
    if "updated_at" in doc and hasattr(doc["updated_at"], "isoformat"):
        doc["updated_at"] = doc["updated_at"].isoformat()
    return {"budget": doc}


@router.post("/budget/{user_id}")
async def save_budget(user_id: str, data: BudgetModel):
    col = get_budget_collection()
    doc = {
        "user_id": user_id,
        "monthly_budget": float(data.monthly_budget),
        "current_monthly_spend": float(data.current_monthly_spend),
        "updated_at": datetime.now(timezone.utc),
    }
    await col.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    doc["updated_at"] = doc["updated_at"].isoformat()
    return {"success": True, "budget": doc}


@router.delete("/budget/{user_id}")
async def delete_budget(user_id: str):
    col = get_budget_collection()
    result = await col.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found.")
    return {"success": True, "message": "Budget deleted"}


@router.get("/budget-analysis/{user_id}")
async def budget_analysis(
    user_id: str,
    goal: str = "maintenance",
    dietary_pref: str = "veg",
    activity_level: str = "moderate",
    authorization: Optional[str] = Header(default=None),
):
    """
    Build complete budget analysis using:
    - persisted budget from MongoDB user_budgets
    - on-the-fly weekly plan from recommender (Node profile if auth available)
    """
    # Resolve profile using Node backend when auth is available.
    height_cm = 170.0
    weight_kg = 70.0
    age = 25
    gender = "male"

    if authorization:
        node_user = await fetch_user_profile_from_node(authorization)
        user_id = str(node_user.get("_id", user_id))
        height_cm = float(node_user.get("height") or height_cm)
        weight_kg = float(node_user.get("weight") or weight_kg)
        age = int(node_user.get("age") or age)
        raw_gender = str(node_user.get("gender") or "male").lower()
        gender = "female" if raw_gender == "female" else "male"

        node_activity = str(node_user.get("activityLevel") or "").lower()
        if node_activity == "active":
            node_activity = "very_active"
        if node_activity in ("sedentary", "light", "moderate", "very_active", "extra_active"):
            activity_level = node_activity

    if goal not in ("weight_loss", "maintenance", "muscle_gain"):
        goal = "maintenance"
    if activity_level not in ("sedentary", "light", "moderate", "very_active", "extra_active"):
        activity_level = "moderate"
    dietary_pref = "veg" if dietary_pref.lower() == "veg" else "non-veg"

    profile = UserProfile(
        user_id=user_id,
        height_cm=height_cm,
        weight_kg=weight_kg,
        age=age,
        gender=gender,                  # type: ignore[arg-type]
        activity_level=activity_level,  # type: ignore[arg-type]
        goal=goal,                      # type: ignore[arg-type]
        dietary_pref=dietary_pref,      # type: ignore[arg-type]
        allergies=None,
    )
    plan = meal_recommender.generate_weekly_plan(profile)

    budget_col = get_budget_collection()
    budget_doc = await budget_col.find_one({"user_id": user_id})

    weekly_cost = 0.0
    daily_costs = []
    category_costs = {"breakfast": 0.0, "lunch": 0.0, "snack": 0.0, "dinner": 0.0}
    meal_details = []
    total_calories = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fats = 0.0

    for day in plan.get("days", []):
        day_cost = 0.0
        meals = day.get("meals", {})
        for meal_type in ("breakfast", "lunch", "snack", "dinner"):
            meal = meals.get(meal_type)
            if not meal:
                continue
            price = float(meal.get("price_inr", 0) or 0)
            cals = float(meal.get("calories_kcal", 0) or 0)
            prot = float(meal.get("protein_g", 0) or 0)
            carbs = float(meal.get("carbs_g", 0) or 0)
            fats = float(meal.get("fats_g", 0) or 0)

            day_cost += price
            category_costs[meal_type] += price
            total_calories += cals
            total_protein += prot
            total_carbs += carbs
            total_fats += fats

            meal_details.append({
                "date": day.get("date", ""),
                "day_index": day.get("day", day.get("day_index", 0)),
                "meal_type": meal_type,
                "dish_name": meal.get("dish_name", ""),
                "price_inr": price,
                "calories_kcal": cals,
                "protein_g": prot,
                "carbs_g": carbs,
                "fats_g": fats,
                "veg_nonveg": meal.get("veg_nonveg", ""),
            })

        daily_costs.append({
            "date": day.get("date", ""),
            "day_index": day.get("day", day.get("day_index", 0)),
            "cost": round(day_cost, 2),
        })
        weekly_cost += day_cost

    monthly_ai_cost = round(weekly_cost * 4.33, 2)
    monthly_budget = float(budget_doc.get("monthly_budget", 0)) if budget_doc else 0.0
    current_spend = float(budget_doc.get("current_monthly_spend", 0)) if budget_doc else 0.0
    savings_vs_current = round(current_spend - monthly_ai_cost, 2) if current_spend > 0 else 0.0
    savings_vs_budget = round(monthly_budget - monthly_ai_cost, 2) if monthly_budget > 0 else 0.0
    daily_avg = round(monthly_ai_cost / 30, 2) if monthly_ai_cost > 0 else 0.0
    cost_per_100kcal = round(weekly_cost / max(total_calories / 100, 1), 2) if weekly_cost else 0
    cost_per_g_protein = round(weekly_cost / max(total_protein, 1), 2) if weekly_cost else 0

    if meal_details:
        sorted_meals = sorted(meal_details, key=lambda x: x["price_inr"])
        cheapest = sorted_meals[:5]
        most_expensive = sorted_meals[-5:][::-1]
    else:
        cheapest = []
        most_expensive = []

    return {
        "monthly_budget": monthly_budget,
        "current_monthly_spend": current_spend,
        "weekly_ai_cost": round(weekly_cost, 2),
        "monthly_ai_cost": monthly_ai_cost,
        "daily_average": daily_avg,
        "savings_vs_current": savings_vs_current,
        "savings_vs_budget": savings_vs_budget,
        "savings_percentage": round((savings_vs_current / current_spend) * 100, 1) if current_spend > 0 else 0,
        "budget_utilization": round((monthly_ai_cost / monthly_budget) * 100, 1) if monthly_budget > 0 else 0,
        "daily_costs": daily_costs,
        "category_costs_weekly": {k: round(v, 2) for k, v in category_costs.items()},
        "category_costs_monthly": {k: round(v * 4.33, 2) for k, v in category_costs.items()},
        "cheapest_meals": cheapest,
        "most_expensive_meals": most_expensive,
        "total_meals_per_week": len(meal_details),
        "cost_per_100kcal": cost_per_100kcal,
        "cost_per_g_protein": cost_per_g_protein,
        "total_weekly_calories": round(total_calories, 1),
        "total_weekly_protein": round(total_protein, 1),
        "total_weekly_carbs": round(total_carbs, 1),
        "total_weekly_fats": round(total_fats, 1),
        "has_plan": len(plan.get("days", [])) > 0,
        "has_budget": budget_doc is not None,
    }
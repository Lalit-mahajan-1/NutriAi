"""
NutriSight ML API routes.

  POST /api/analyze                 – USDA food nutrition lookup
  POST /api/body-analyze            – BMI-estimated body classification
  POST /api/camera-analyze          – Camera-based body classification (saves to MongoDB)
  GET  /api/scan-history/{user_id}  – Fetch past body scans for a user
  GET  /api/weekly-plan             – RL-based 7-day meal plan for current user
"""

from datetime import datetime, timezone
from typing import Optional

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

# ── User service config ─────────────────────────────────────────────────────
USER_SERVICE_BASE_URL = "http://localhost:5000"

# ── Load food dataset & init bandit + recommender ──────────────────────────
# Adjust path if your CSV is elsewhere
FOOD_CSV_PATH = "dataset/sample.csv"

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


# ── Body Analysis (BMI-estimated ratios) ───────────────────────────────────
class BodyRequest(BaseModel):
    height_cm: float
    weight_kg: float
    age: int
    gender: str
    activity_level: str = "moderate"


@router.post("/body-analyze")
async def body_analyze(req: BodyRequest):
    return analyze_body(
        height_cm=req.height_cm,
        weight_kg=req.weight_kg,
        age=req.age,
        gender=req.gender,
        activity_level=req.activity_level,
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
    if not MODELS_LOADED:
        return {"error": "ML models not loaded. Run training first."}

    # ── ML inference ──────────────────────────────────────────────────────
    height_m = req.height_cm / 100
    bmi = req.weight_kg / (height_m ** 2)
    gender_encoded = 1 if req.gender.lower() == "male" else 0

    features = np.array([[
        round(float(bmi), 2),
        req.waist_hip_ratio,
        req.shoulder_waist_ratio,
        req.torso_leg_ratio,
        req.body_aspect_ratio,
        req.age,
        gender_encoded,
    ]])

    features_scaled = scaler.transform(features)
    prediction      = body_classifier.predict(features_scaled)[0]
    probabilities   = body_classifier.predict_proba(features_scaled)[0]
    category        = label_encoder.inverse_transform([prediction])[0]
    confidence      = float(probabilities[prediction])

    nutrition = nutrition_calc.get_complete_nutrition_plan(
        weight_kg=req.weight_kg,
        height_cm=req.height_cm,
        age=req.age,
        gender=req.gender,
        category=category,
        activity_level=req.activity_level,
    )

    result_bmi        = round(float(bmi), 1)
    result_confidence = round(confidence * 100, 1)

    # ── Persist to MongoDB (body_scans collection) ─────────────────────────
    scan_doc = {
        "user_id":      req.user_id,
        "scanned_at":   datetime.now(timezone.utc),   # UTC timestamp
        "source":       "camera",
        "bmi":          result_bmi,
        "category":     category,
        "confidence":   result_confidence,
        "pose_quality": req.pose_quality,
        # Snapshot of inputs
        "inputs": {
            "height_cm":      req.height_cm,
            "weight_kg":      req.weight_kg,
            "age":            req.age,
            "gender":         req.gender,
            "activity_level": req.activity_level,
        },
        # Full nutrition plan from the model
        "nutrition_plan": nutrition,
        # Raw landmark features for future reference
        "landmark_features": {
            "waist_hip_ratio":      req.waist_hip_ratio,
            "shoulder_waist_ratio": req.shoulder_waist_ratio,
            "torso_leg_ratio":      req.torso_leg_ratio,
            "body_aspect_ratio":    req.body_aspect_ratio,
        },
    }

    scans = get_scans_collection()
    insert_result = await scans.insert_one(scan_doc)
    scan_id = str(insert_result.inserted_id)

    return {
        "scan_id":        scan_id,
        "bmi":            result_bmi,
        "category":       category,
        "confidence":     result_confidence,
        "pose_quality":   req.pose_quality,
        "source":         "camera",
        "scanned_at":     scan_doc["scanned_at"].isoformat(),
        "nutrition_plan": nutrition,
    }


# ── Scan History for a user ────────────────────────────────────────────────
@router.get("/scan-history/{user_id}")
async def scan_history(user_id: str, limit: int = 10):
    """
    Return the most recent `limit` body scans for user_id,
    newest first, with lightweight fields for the timeline view.
    """
    scans = get_scans_collection()
    cursor = scans.find(
        {"user_id": user_id},
        {
            "_id":         1,
            "scanned_at":  1,
            "bmi":         1,
            "category":    1,
            "confidence":  1,
            "pose_quality": 1,
            "inputs":      1,
            "nutrition_plan.daily_targets": 1,
        },
    ).sort("scanned_at", -1).limit(limit)

    docs = []
    async for doc in cursor:
        doc["scan_id"] = str(doc.pop("_id"))
        doc["scanned_at"] = doc["scanned_at"].isoformat()
        docs.append(doc)

    return {"scans": docs, "count": len(docs)}


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
    if height is not None and weight is not None and age is not None and gender is not None:
        # Fast path: all profile fields provided directly by the frontend
        resolved_user_id = user_id or "anonymous"
        height_cm  = float(height)
        weight_kg  = float(weight)
        resolved_age    = int(age)
        raw_gender = gender.lower()
        resolved_gender: str = "male" if raw_gender not in ("male", "female") else raw_gender

    else:
        # Fallback: call the Node backend to get the user profile
        headers: dict = {}
        if authorization:
            headers["Authorization"] = authorization

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{USER_SERVICE_BASE_URL}/api/users/me",
                    headers=headers,
                    timeout=8.0,
                )
        except httpx.ReadTimeout:
            raise HTTPException(
                status_code=504,
                detail="User service timed out. Pass height/weight/age/gender as query params to avoid this.",
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"User service error: {exc}")

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Failed to fetch user profile: {resp.text}",
            )

        user = resp.json()
        resolved_user_id = str(user.get("_id", "unknown"))

        try:
            height_cm = float(user.get("height") or 170)
        except Exception:
            height_cm = 170.0
        try:
            weight_kg = float(user.get("weight") or 70)
        except Exception:
            weight_kg = 70.0
        try:
            resolved_age = int(user.get("age") or 25)
        except Exception:
            resolved_age = 25

        raw_gender = (user.get("gender") or "male").lower()
        resolved_gender = "male" if raw_gender not in ("male", "female") else raw_gender

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
    """
    Build a 7-day RL-based meal plan for the *current* user.
    This endpoint calls the main NutriSight API at:
        GET http://localhost:5000/api/users/me
    using the same Authorization header (if provided).
    """

    # ── 1) Fetch current user profile from main backend ───────────────────
    headers = {}
    if authorization:
        headers["Authorization"] = authorization

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{USER_SERVICE_BASE_URL}/api/users/me",
            headers=headers,
            timeout=10.0,
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Failed to fetch user profile from main API: {resp.text}",
        )

    user = resp.json()
    # Expected fields (from your sample):
    # _id, name, email, gender, height, weight, age, __v

    # ── 2) Map user JSON to UserProfile for recommender ───────────────────
    raw_gender = (user.get("gender") or "male").lower()
    gender: str = "male" if raw_gender not in ("male", "female") else raw_gender

    raw_height = user.get("height")
    raw_weight = user.get("weight")
    raw_age = user.get("age")

    try:
        height_cm = float(raw_height) if raw_height is not None else 170.0
    except Exception:
        height_cm = 170.0

    try:
        weight_kg = float(raw_weight) if raw_weight is not None else 70.0
    except Exception:
        weight_kg = 70.0

    try:
        age = int(raw_age) if raw_age is not None else 25
    except Exception:
        age = 25

    # Validate goal/activity/diet values
    if goal not in ("weight_loss", "maintenance", "muscle_gain"):
        goal = "maintenance"
    if activity_level not in ("sedentary", "light", "moderate", "very_active", "extra_active"):
        activity_level = "moderate"
    dietary_pref = "veg" if dietary_pref.lower() == "veg" else "non-veg"

    profile = UserProfile(
        user_id=str(user.get("_id", "unknown")),
        height_cm=height_cm,
        weight_kg=weight_kg,
        age=age,
        gender=gender,               # type: ignore[arg-type]
        activity_level=activity_level,  # type: ignore[arg-type]
        goal=goal,                   # type: ignore[arg-type]
        dietary_pref=dietary_pref,   # type: ignore[arg-type]
        allergies=None,
    )

    # ── 3) Generate weekly plan using RL recommender ──────────────────────
    plan = meal_recommender.generate_weekly_plan(profile)

    # ── 4) Inject fiber_g and water_ml into daily_targets ─────────────────
    # fiber: ~14g per 1000 kcal; water: ~35ml per kg body weight
    cal = plan["daily_targets"].get("calories", 2000)
    plan["daily_targets"]["fiber_g"] = round(14 * cal / 1000, 1)
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
    prefs = get_preferences_collection()

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

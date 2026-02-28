import numpy as np
import joblib
import os

_project_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
_models_dir = os.path.join(_project_root, 'models')

# Load once at import time
try:
    body_classifier = joblib.load(os.path.join(_models_dir, 'body_classifier.pkl'))
    scaler = joblib.load(os.path.join(_models_dir, 'scaler.pkl'))
    label_encoder = joblib.load(os.path.join(_models_dir, 'label_encoder.pkl'))
    MODELS_LOADED = True
except Exception as e:
    print(f"⚠️ ML models not loaded: {e}")
    MODELS_LOADED = False

# Import your existing nutrition calculator
import sys
sys.path.insert(0, _project_root)
from utils.nutrition_calculator import NutritionCalculator
nutrition_calc = NutritionCalculator()


def estimate_body_ratios(bmi: float):
    """Estimate body ratios from BMI when no camera is available."""
    if bmi < 18.5:
        return 0.72, 1.45, 0.42, 3.8
    elif bmi < 25:
        return 0.78, 1.35, 0.44, 3.2
    elif bmi < 30:
        return 0.85, 1.20, 0.46, 2.8
    else:
        return 0.92, 1.10, 0.48, 2.5
    # returns: waist_hip, shoulder_waist, torso_leg, body_aspect


def analyze_body(height_cm: float, weight_kg: float, age: int, gender: str, activity_level: str = "moderate"):
    if not MODELS_LOADED:
        return {"error": "ML models not loaded. Train the model first."}

    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)

    waist_hip, shoulder_waist, torso_leg, body_aspect = estimate_body_ratios(bmi)

    gender_encoded = 1 if gender.lower() == "male" else 0

    features = np.array([[
        bmi,
        waist_hip,
        shoulder_waist,
        torso_leg,
        body_aspect,
        age,
        gender_encoded
    ]])

    features_scaled = scaler.transform(features)
    prediction = body_classifier.predict(features_scaled)[0]
    probabilities = body_classifier.predict_proba(features_scaled)[0]

    category = label_encoder.inverse_transform([prediction])[0]
    confidence = float(probabilities[prediction])

    # Get nutrition plan from your existing calculator
    nutrition = nutrition_calc.get_complete_nutrition_plan(
        weight_kg=weight_kg,
        height_cm=height_cm,
        age=age,
        gender=gender,
        category=category,
        activity_level=activity_level
    )

    return {
        "bmi": round(bmi, 1),
        "category": category,
        "confidence": round(confidence * 100, 1),
        "nutrition_plan": nutrition
    }
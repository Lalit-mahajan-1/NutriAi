# recommender/nutrition_engine.py

from dataclasses import dataclass
from typing import Literal


ActivityLevel = Literal["sedentary", "light", "moderate", "very_active", "extra_active"]
Goal = Literal["weight_loss", "maintenance", "muscle_gain"]
Gender = Literal["male", "female"]


@dataclass
class UserProfile:
    user_id: str
    height_cm: float
    weight_kg: float
    age: int
    gender: Gender
    activity_level: ActivityLevel
    goal: Goal = "maintenance"
    target_calories: float | None = None
    target_protein_g: float | None = None
    dietary_pref: Literal["veg", "non-veg"] = "veg"
    allergies: list[str] | None = None   # list of substrings to avoid in dish name

    @property
    def bmi(self) -> float:
        h_m = self.height_cm / 100
        return self.weight_kg / (h_m ** 2)


@dataclass
class MacroTargets:
    calories: float
    protein_g: float
    carbs_g: float
    fats_g: float


ACTIVITY_MULTIPLIERS: dict[ActivityLevel, float] = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "very_active": 1.725,
    "extra_active": 1.9,
}


def compute_bmr(profile: UserProfile) -> float:
    w, h, a = profile.weight_kg, profile.height_cm, profile.age
    if profile.gender == "male":
        return 10 * w + 6.25 * h - 5 * a + 5
    else:
        return 10 * w + 6.25 * h - 5 * a - 161


def compute_tdee(profile: UserProfile) -> float:
    bmr = compute_bmr(profile)
    mult = ACTIVITY_MULTIPLIERS[profile.activity_level]
    return bmr * mult


def adjust_for_goal(tdee: float, goal: Goal) -> float:
    if goal == "weight_loss":
        return max(1200.0, tdee - 400)
    elif goal == "muscle_gain":
        return tdee + 300
    return tdee


def compute_macro_targets(profile: UserProfile) -> MacroTargets:
    tdee = compute_tdee(profile)
    daily_cals = adjust_for_goal(tdee, profile.goal)

    if profile.target_calories is not None:
        daily_cals = profile.target_calories

    # Protein & fats based on body weight
    if profile.target_protein_g is not None:
        protein_g = profile.target_protein_g
    else:
        protein_g = 1.8 * profile.weight_kg  # simple default

    fats_g = 0.8 * profile.weight_kg        # default
    protein_cal = 4 * protein_g
    fat_cal = 9 * fats_g

    remaining_cal = max(0.0, daily_cals - protein_cal - fat_cal)
    carbs_g = remaining_cal / 4

    return MacroTargets(
        calories=round(daily_cals, 1),
        protein_g=round(protein_g, 1),
        carbs_g=round(carbs_g, 1),
        fats_g=round(fats_g, 1),
    )


MEAL_SHARES = {
    "breakfast": 0.25,
    "lunch": 0.35,
    "dinner": 0.30,
    "snack": 0.10,
}


def get_meal_macro_targets(daily: MacroTargets, meal_type: str) -> MacroTargets:
    s = MEAL_SHARES.get(meal_type, 0.25)
    return MacroTargets(
        calories=daily.calories * s,
        protein_g=daily.protein_g * s,
        carbs_g=daily.carbs_g * s,
        fats_g=daily.fats_g * s,
    )
# recommender/meal_recommender.py

from __future__ import annotations
from dataclasses import asdict
from typing import Dict, Any
import pandas as pd

from .nutrition_engine import UserProfile, compute_macro_targets
from .bandit import LinUCBBandit

MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"]


class MealRecommender:
    def __init__(self, food_df: pd.DataFrame, bandit: LinUCBBandit):
        self.food_df = food_df.copy()
        self.bandit = bandit

        # Normalise column names once
        self.food_df.rename(
            columns={
                "Food Name": "Dish Name",
                "Veg/Non-Veg": "Veg_NonVeg",
                "Calories (k)": "Calories (kcal)",
                "Carbohydrate (g)": "Carbs (g)",
                "Carbohydrate": "Carbs (g)",
                "Carbohydrates (g)": "Carbs (g)",
            },
            inplace=True,
        )

        # ── Ensure Category column exists ─────────────────────────────────────
        if "Category" not in self.food_df.columns:
            BREAKFAST_KW = ["oat","porridge","cereal","chai","tea","coffee","cocoa","egg","toast","bread",
                            "sandwich","muffin","pancake","waffle","idli","dosa","upma","poha","paratha",
                            "parantha","chilla","cheela","besan","moong","uttapam","thepla","cornflake",
                            "milk","curd","yoghurt","yogurt","smoothie","juice"]
            SNACK_KW = ["biscuit","cookie","cracker","cake","sweet","halwa","ladoo","barfi","kheer",
                        "pudding","ice cream","dessert","chips","namkeen","bhujia","chakli","murukku",
                        "popcorn","nut","peanut","cashew","almond","walnut","seed","fruit","banana",
                        "apple","mango","orange","grape","berry","melon","chaat","pani puri","bhel",
                        "samosa","pakora","fritter","drink","sharbat","lassi","buttermilk",
                        "espresso","latte","cappuccino"]
            LUNCH_KW  = ["rice","pulao","biryani","khichdi","dal","rajma","chole","sabzi","curry",
                         "sabji","bhaji","paneer","tofu","soya","chicken","fish","mutton","lamb",
                         "prawn","shrimp","meat","salad","soup","wrap","burger","pizza","pasta",
                         "noodle","bowl","thali","sambar","rasam","kadhi"]

            def _cat(name: str) -> str:
                n = name.lower()
                for kw in BREAKFAST_KW:
                    if kw in n: return "breakfast"
                for kw in SNACK_KW:
                    if kw in n: return "snack"
                for kw in LUNCH_KW:
                    if kw in n: return "lunch"
                return "dinner"

            self.food_df["Category"] = self.food_df["Dish Name"].apply(_cat)

        # ── Ensure Veg_NonVeg column exists ───────────────────────────────────
        if "Veg_NonVeg" not in self.food_df.columns:
            NV_KW = ["chicken","fish","mutton","lamb","prawn","shrimp","meat","egg",
                     "keema","seekh","beef","pork","sardine","tuna","salmon","bacon",
                     "sausage","ham","crab","lobster","oyster"]

            def _veg(name: str) -> str:
                n = name.lower()
                return "Non-Veg" if any(kw in n for kw in NV_KW) else "Veg"

            self.food_df["Veg_NonVeg"] = self.food_df["Dish Name"].apply(_veg)


    # ---------- Filtering ----------
    def _filter_foods(
        self,
        profile: UserProfile,
        meal_type: str,
    ) -> pd.DataFrame:
        df = self.food_df

        # Category match
        df = df[df["Category"].str.lower() == meal_type.lower()]

        # Veg / Non-veg preference
        if profile.dietary_pref == "veg":
            df = df[df["Veg_NonVeg"].str.lower() == "veg"]
        else:
            # allow both veg and non-veg by default
            pass

        # Allergy filter (simple substring match in dish name)
        if profile.allergies:
            lower_allergies = [a.lower() for a in profile.allergies]
            mask = ~df["Dish Name"].str.lower().apply(
                lambda name: any(a in name for a in lower_allergies)
            )
            df = df[mask]

        return df

    # ---------- Weekly Plan ----------
    def generate_weekly_plan(self, profile: UserProfile) -> Dict[str, Any]:
        daily_targets = compute_macro_targets(profile)
        weekly_counts: Dict[str, int] = {}

        plan = {
            "user_id": profile.user_id,
            "daily_targets": asdict(daily_targets),
            "days": [],
        }

        for day_idx in range(7):
            day_plan = {"day": day_idx + 1, "meals": {}}

            for meal_type in MEAL_ORDER:
                candidates = self._filter_foods(profile, meal_type)
                if candidates.empty:
                    day_plan["meals"][meal_type] = None
                    continue

                chosen_row = self.bandit.select_dish(
                    profile,
                    daily_targets,
                    meal_type,
                    candidates,
                    weekly_counts,
                    max_per_week=2,
                )
                if chosen_row is None:
                    day_plan["meals"][meal_type] = None
                    continue

                dish_id = chosen_row["Dish Name"]
                weekly_counts[dish_id] = weekly_counts.get(dish_id, 0) + 1

                meal_entry = {
                    "dish_name": dish_id,
                    "calories_kcal": float(chosen_row["Calories (kcal)"]),
                    "protein_g": float(chosen_row["Protein (g)"]),
                    "carbs_g": float(chosen_row["Carbs (g)"]),
                    "fats_g": float(chosen_row["Fats (g)"]),
                    "category": meal_type,
                    "veg_nonveg": chosen_row.get("Veg_NonVeg", ""),
                    "price_inr": float(chosen_row["Price (INR)"]) if "Price (INR)" in chosen_row.index else 0.0,
                }
                day_plan["meals"][meal_type] = meal_entry

            plan["days"].append(day_plan)

        return plan
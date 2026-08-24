# recommender/meal_recommender.py

from __future__ import annotations
from dataclasses import asdict
from typing import Dict, Any
import pandas as pd

from .nutrition_engine import UserProfile, compute_macro_targets
from .bandit import LinUCBBandit

MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"]

# How a day's food budget is split across slots (mirrors calorie shares).
BUDGET_SHARES = {"breakfast": 0.25, "lunch": 0.35, "dinner": 0.30, "snack": 0.10}

# A slot may borrow a little headroom; overspend is clawed back from later
# slots because caps are computed from the *remaining* budget.
SLOT_FLEX = 1.15

# Weight of the protein-per-rupee bonus in bandit scoring under budget mode.
VALUE_WEIGHT = 0.25

# A dish may appear at most this many times per week (variety constraint).
MAX_PER_WEEK = 2


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

    # ---------- Cheaper swap ----------
    def _find_cheaper_swap(
        self,
        profile: UserProfile,
        meal_type: str,
        chosen_row,
    ) -> Dict[str, Any] | None:
        """
        Find a nutritionally similar dish in the same slot that costs
        meaningfully less (≥15% cheaper, calories within ±30%).
        Returns the best protein-per-rupee option, or None.
        """
        if "Price (INR)" not in self.food_df.columns:
            return None

        chosen_price = float(chosen_row["Price (INR)"])
        chosen_cal = float(chosen_row["Calories (kcal)"])
        if chosen_price <= 0:
            return None

        candidates = self._filter_foods(profile, meal_type)
        best = None
        best_value = -1.0
        for _, row in candidates.iterrows():
            dish_id = row["Dish Name"]
            if dish_id == chosen_row["Dish Name"]:
                continue
            if self.bandit.dislikes.get((profile.user_id, dish_id), 0) > 0:
                continue
            price = float(row["Price (INR)"])
            cal = float(row["Calories (kcal)"])
            if price > chosen_price * 0.85 or price <= 0:
                continue
            if chosen_cal > 0 and abs(cal - chosen_cal) / chosen_cal > 0.30:
                continue
            value = float(row["Protein (g)"]) / price
            if value > best_value:
                best_value = value
                best = row

        if best is None:
            return None
        return {
            "dish_name": best["Dish Name"],
            "price_inr": round(float(best["Price (INR)"]), 2),
            "calories_kcal": float(best["Calories (kcal)"]),
            "protein_g": float(best["Protein (g)"]),
            "carbs_g": float(best["Carbs (g)"]),
            "fats_g": float(best["Fats (g)"]),
            "veg_nonveg": best.get("Veg_NonVeg", ""),
            "savings_inr": round(chosen_price - float(best["Price (INR)"]), 2),
        }

    # ---------- Weekly Plan ----------
    def generate_weekly_plan(
        self,
        profile: UserProfile,
        daily_budget_inr: float | None = None,
    ) -> Dict[str, Any]:
        daily_targets = compute_macro_targets(profile)
        weekly_counts: Dict[str, int] = {}

        budget = daily_budget_inr if daily_budget_inr else profile.daily_budget_inr
        if budget is not None and budget <= 0:
            budget = None

        plan = {
            "user_id": profile.user_id,
            "daily_targets": asdict(daily_targets),
            "days": [],
        }

        weekly_cost = 0.0
        days_over_budget = 0

        # Cheapest *available* dish per slot — used to reserve room for the
        # rest of the day so early slots can't spend the whole budget.
        # Recomputed each day because the variety cap (MAX_PER_WEEK) retires
        # the cheapest dishes as the week progresses.
        def compute_min_slot_prices(counts: Dict[str, int]) -> Dict[str, float]:
            mins: Dict[str, float] = {}
            for mt in MEAL_ORDER:
                cands = self._filter_foods(profile, mt)
                if cands.empty or "Price (INR)" not in cands.columns:
                    mins[mt] = 0.0
                    continue
                avail = cands[cands["Dish Name"].map(
                    lambda dn: counts.get(dn, 0) < MAX_PER_WEEK
                )]
                src = avail if not avail.empty else cands
                mins[mt] = float(src["Price (INR)"].min())
            return mins

        min_feasible_day: float | None = None
        min_slot_price: Dict[str, float] = {}

        for day_idx in range(7):
            day_plan = {"day": day_idx + 1, "meals": {}}
            day_cost = 0.0
            remaining_budget = budget if budget is not None else None
            remaining_shares = sum(BUDGET_SHARES[m] for m in MEAL_ORDER)

            if budget is not None:
                min_slot_price = compute_min_slot_prices(weekly_counts)
                if min_feasible_day is None:
                    min_feasible_day = sum(min_slot_price.values())

            for slot_idx, meal_type in enumerate(MEAL_ORDER):
                slot_share = BUDGET_SHARES[meal_type]
                price_cap = None
                if remaining_budget is not None and remaining_shares > 0:
                    share_cap = remaining_budget * (slot_share / remaining_shares) * SLOT_FLEX
                    reserve = sum(min_slot_price[m] for m in MEAL_ORDER[slot_idx + 1:])
                    reserve_cap = remaining_budget - reserve
                    # Never cap below the cheapest dish in this slot, or the
                    # slot would go empty even when the budget is infeasible.
                    price_cap = max(min(share_cap, reserve_cap), min_slot_price[meal_type])
                remaining_shares -= slot_share

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
                    max_per_week=MAX_PER_WEEK,
                    price_cap=price_cap,
                    value_weight=VALUE_WEIGHT if budget is not None else 0.0,
                )
                if chosen_row is None:
                    day_plan["meals"][meal_type] = None
                    continue

                dish_id = chosen_row["Dish Name"]
                weekly_counts[dish_id] = weekly_counts.get(dish_id, 0) + 1

                price = float(chosen_row["Price (INR)"]) if "Price (INR)" in chosen_row.index else 0.0
                day_cost += price
                if remaining_budget is not None:
                    remaining_budget = max(remaining_budget - price, 0.0)

                meal_entry = {
                    "dish_name": dish_id,
                    "calories_kcal": float(chosen_row["Calories (kcal)"]),
                    "protein_g": float(chosen_row["Protein (g)"]),
                    "carbs_g": float(chosen_row["Carbs (g)"]),
                    "fats_g": float(chosen_row["Fats (g)"]),
                    "category": meal_type,
                    "veg_nonveg": chosen_row.get("Veg_NonVeg", ""),
                    "price_inr": price,
                    "cheaper_swap": self._find_cheaper_swap(profile, meal_type, chosen_row),
                }
                day_plan["meals"][meal_type] = meal_entry

            day_plan["day_cost_inr"] = round(day_cost, 2)
            if budget is not None and day_cost > budget:
                days_over_budget += 1
            weekly_cost += day_cost
            plan["days"].append(day_plan)

        plan["plan_cost"] = {
            "weekly_cost_inr": round(weekly_cost, 2),
            "avg_day_cost_inr": round(weekly_cost / 7, 2),
            "daily_budget_inr": round(budget, 2) if budget is not None else None,
            "weekly_budget_inr": round(budget * 7, 2) if budget is not None else None,
            "within_budget": (days_over_budget == 0) if budget is not None else None,
            "days_over_budget": days_over_budget if budget is not None else None,
            # Cheapest possible day with one dish per slot — lets the UI warn
            # when the user's budget is below anything the dataset can offer.
            "min_feasible_day_inr": round(min_feasible_day, 2) if min_feasible_day is not None else None,
        }

        return plan
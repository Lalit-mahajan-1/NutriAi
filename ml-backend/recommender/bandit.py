# recommender/bandit.py

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Dict, Tuple
import numpy as np

from .nutrition_engine import UserProfile, MacroTargets, get_meal_macro_targets


@dataclass
class ArmState:
    """LinUCB state for a single dish (arm)."""
    A: np.ndarray  # d x d
    b: np.ndarray  # d

    @classmethod
    def create(cls, d: int) -> "ArmState":
        return cls(A=np.eye(d), b=np.zeros(d))

    def to_serializable(self) -> dict:
        return {"A": self.A.tolist(), "b": self.b.tolist()}

    @classmethod
    def from_serializable(cls, data: dict) -> "ArmState":
        return cls(A=np.array(data["A"]), b=np.array(data["b"]))


class LinUCBBandit:
    """
    Per-user, per-dish contextual bandit with LinUCB.
    """

    def __init__(self, d: int, alpha: float = 0.4):
        self.d = d
        self.alpha = alpha
        # state[user_id][dish_id] = ArmState
        self.state: Dict[str, Dict[str, ArmState]] = {}
        # simple feedback counters
        self.likes: Dict[Tuple[str, str], int] = {}
        self.dislikes: Dict[Tuple[str, str], int] = {}

    # ---------- Utilities ----------
    def _get_user_arms(self, user_id: str) -> Dict[str, ArmState]:
        if user_id not in self.state:
            self.state[user_id] = {}
        return self.state[user_id]

    # ---------- Context construction ----------
    @staticmethod
    def build_context(
        profile: UserProfile,
        daily_targets: MacroTargets,
        meal_type: str,
        dish_row,
    ) -> np.ndarray:
        """
        Build feature vector x for LinUCB.
        """
        # Basic user features
        bmi_norm = min(max((profile.bmi - 15) / 20, 0), 1)  # ~[0,1]
        gender_flag = 1.0 if profile.gender == "male" else 0.0

        # Meal type one-hot
        meal_types = ["breakfast", "lunch", "dinner", "snack"]
        meal_onehot = [1.0 if meal_type == mt else 0.0 for mt in meal_types]

        # Dish macros vs daily targets
        cal = float(dish_row["Calories (kcal)"])
        prot = float(dish_row["Protein (g)"])
        carbs = float(dish_row["Carbs (g)"])
        fats = float(dish_row["Fats (g)"])

        cal_frac = cal / max(1.0, daily_targets.calories)
        prot_frac = prot / max(1.0, daily_targets.protein_g)
        carb_frac = carbs / max(1.0, daily_targets.carbs_g)
        fat_frac = fats / max(1.0, daily_targets.fats_g)

        # Bias term
        bias = 1.0

        x = np.array(
            [bias, bmi_norm, gender_flag]
            + meal_onehot
            + [cal_frac, prot_frac, carb_frac, fat_frac],
            dtype=float,
        )
        return x  # shape (d,)

    @staticmethod
    def compute_macro_fit(
        meal_targets: MacroTargets,
        cal: float,
        prot: float,
        carbs: float,
        fats: float,
    ) -> float:
        """
        Macro fit score in [0,1]. 1 = perfect; 0 = very off.
        """
        def rel_err(v, t):
            if t <= 0:
                return 0.0
            return abs(v - t) / t

        errs = [
            rel_err(cal, meal_targets.calories),
            rel_err(prot, meal_targets.protein_g),
            rel_err(carbs, meal_targets.carbs_g),
            rel_err(fats, meal_targets.fats_g),
        ]
        mean_err = sum(errs) / len(errs)
        return max(0.0, 1.0 - mean_err)  # simple linear mapping

    # ---------- Selection ----------
    def select_dish(
        self,
        profile: UserProfile,
        daily_targets: MacroTargets,
        meal_type: str,
        candidate_df,
        weekly_counts: Dict[str, int],
        max_per_week: int = 2,
    ):
        """
        Select best dish among candidates for this user & meal slot.
        """
        user_arms = self._get_user_arms(profile.user_id)

        # Filter out hard constraints (disliked meals & diversity)
        filtered_rows = []
        for _, row in candidate_df.iterrows():
            dish_id = row["Dish Name"]
            key = (profile.user_id, dish_id)

            if self.dislikes.get(key, 0) > 0:
                continue  # never suggest explicitly disliked meals

            if weekly_counts.get(dish_id, 0) >= max_per_week:
                continue  # diversity constraint

            filtered_rows.append(row)

        if not filtered_rows:
            return None  # caller should handle

        # Score with LinUCB
        best_score = -1e9
        best_row = None

        for row in filtered_rows:
            dish_id = row["Dish Name"]
            x = self.build_context(profile, daily_targets, meal_type, row)
            if dish_id not in user_arms:
                user_arms[dish_id] = ArmState.create(self.d)

            arm = user_arms[dish_id]
            A_inv = np.linalg.inv(arm.A)
            theta = A_inv @ arm.b

            mean = float(theta.T @ x)
            var = float(np.sqrt(x.T @ A_inv @ x))
            score = mean + self.alpha * var

            # Optional small bonus for items rarely seen (implicit exploration)
            seen = self.likes.get((profile.user_id, dish_id), 0) + \
                   self.dislikes.get((profile.user_id, dish_id), 0)
            if seen == 0:
                score += 0.05

            if score > best_score:
                best_score = score
                best_row = row

        return best_row

    # ---------- Update ----------
    def update(
        self,
        profile: UserProfile,
        daily_targets: MacroTargets,
        meal_type: str,
        dish_row,
        feedback: int,
    ):
        """
        Update bandit with user feedback.
        feedback: +1 like, 0 neutral, -1 dislike
        """
        dish_id = dish_row["Dish Name"]
        key = (profile.user_id, dish_id)
        user_arms = self._get_user_arms(profile.user_id)

        if dish_id not in user_arms:
            user_arms[dish_id] = ArmState.create(self.d)
        arm = user_arms[dish_id]

        # Convert explicit feedback to [0,1]
        if feedback > 0:
            fb_score = 1.0
            self.likes[key] = self.likes.get(key, 0) + 1
        elif feedback < 0:
            fb_score = 0.0
            self.dislikes[key] = self.dislikes.get(key, 0) + 1
        else:
            fb_score = 0.5

        # Macro fit for the meal
        meal_targets = get_meal_macro_targets(daily_targets, meal_type)
        cal = float(dish_row["Calories (kcal)"])
        prot = float(dish_row["Protein (g)"])
        carbs = float(dish_row["Carbs (g)"])
        fats = float(dish_row["Fats (g)"])
        macro_fit = self.compute_macro_fit(meal_targets, cal, prot, carbs, fats)

        reward = 0.7 * fb_score + 0.3 * macro_fit
        reward = float(max(0.0, min(1.0, reward)))

        # Context
        x = self.build_context(profile, daily_targets, meal_type, dish_row)

        # LinUCB update
        x = x.reshape(-1, 1)  # d x 1
        arm.A += x @ x.T
        arm.b += reward * x.flatten()

    # ---------- Persistence ----------
    def save(self, path: str):
        serializable = {
            "d": self.d,
            "alpha": self.alpha,
            "state": {
                uid: {dish: arm.to_serializable() for dish, arm in arms.items()}
                for uid, arms in self.state.items()
            },
            "likes": {f"{u}||{d}": c for (u, d), c in self.likes.items()},
            "dislikes": {f"{u}||{d}": c for (u, d), c in self.dislikes.items()},
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(serializable, f)

    @classmethod
    def load(cls, path: str) -> "LinUCBBandit":
        import os
        if not os.path.exists(path):
            raise FileNotFoundError(path)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        bandit = cls(d=data["d"], alpha=data["alpha"])
        for uid, arms in data["state"].items():
            bandit.state[uid] = {
                dish: ArmState.from_serializable(arm_data)
                for dish, arm_data in arms.items()
            }
        for k, v in data["likes"].items():
            u, d = k.split("||", 1)
            bandit.likes[(u, d)] = v
        for k, v in data["dislikes"].items():
            u, d = k.split("||", 1)
            bandit.dislikes[(u, d)] = v
        return bandit
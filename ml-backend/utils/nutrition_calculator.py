import json


class NutritionCalculator:
    """
    Calculate daily nutrition requirements based on body classification.

    References
    ----------
    - ICMR Dietary Guidelines for Indians (2020)
    - Harris-Benedict Equation (Revised — Roza & Shizgal 1984)
    - WHO BMI Classification
    """

    def __init__(self):
        # ── BMR formulas ────────────────────────────────────────────────────
        self.bmr_formulas = {
            'male':   lambda W, H, A: 88.362  + (13.397 * W) + (4.799 * H) - (5.677 * A),
            'female': lambda W, H, A: 447.593 + (9.247  * W) + (3.098 * H) - (4.330 * A),
        }

        # ── Activity factors ────────────────────────────────────────────────
        self.activity_factors = {
            'sedentary':   1.2,
            'light':       1.375,
            'moderate':    1.55,
            'active':      1.725,
            'very_active': 1.9,
        }

        # ── Calorie adjustments (kcal/day vs TDEE) ──────────────────────────
        self.calorie_adjustments = {
            'under_weight':  400,
            'normal':          0,
            'overweight':   -400,
            'obese':        -600,
            'extremely_obese': -800,
        }

        # ── Protein multipliers (g / kg body weight) ────────────────────────
        self.protein_multipliers = {
            'under_weight': 1.8,
            'normal':       1.0,
            'overweight':   1.4,
            'obese':        1.6,
            'extremely_obese': 1.6,
        }

        # ── Carbohydrate target (fraction of total calories) ──────────────
        self.carb_percentages = {
            'under_weight': 0.55,
            'normal':       0.50,
            'overweight':   0.40,
            'obese':        0.35,
            'extremely_obese': 0.30,
        }

        # ── Fat target (same fraction for all categories) ─────────────────
        self.fat_percentage = 0.30

        # ── Fibre (g/day, WHO) ────────────────────────────────────────────
        self.fiber_target = 30

        # ── Dietary recommendations per category ──────────────────────────
        self._recommendations = {
            'under_weight': [
                'Focus on calorie-dense, nutrient-rich foods',
                'Eat 5–6 small meals throughout the day',
                'Include healthy fats: nuts, avocado, olive oil',
                'High-protein foods: eggs, chicken, fish, dal, paneer',
                'Add strength training to build muscle mass',
                'Consult a registered dietitian for a personalised plan',
            ],
            'normal': [
                'Maintain a balanced diet with variety',
                'Include all food groups in appropriate portions',
                'Stay physically active (30–60 min daily)',
                'Drink adequate water throughout the day',
                'Practice mindful eating and portion control',
                'Regular meal timing — avoid long gaps',
            ],
            'overweight': [
                'Create a moderate calorie deficit (300–500 kcal)',
                'Increase protein intake for satiety',
                'Reduce refined carbs, sugar, and ultra-processed food',
                'Add more vegetables and dietary fibre',
                'Mix cardio and strength training',
                'Track food intake for greater self-awareness',
            ],
            'obese': [
                'Create a sustainable calorie deficit (500–750 kcal)',
                'High-protein diet to preserve lean muscle',
                'Low-carb approach can help jumpstart fat loss',
                'Focus on whole, minimally processed foods',
                'Begin with low-impact exercise; progress gradually',
                'Consider medical consultation for a comprehensive plan',
            ],
            'extremely_obese': [
                'Create an aggressive calorie deficit securely under medical supervision',
                'High-protein diet to preserve lean muscle',
                'Ensure micronutrient density is maintained with lower calories',
                'Focus on whole, minimally processed foods',
                'Begin with low-impact exercise; progress gradually',
                'Medical consultation is strongly recommended for a comprehensive plan',
            ],
        }

    # ── Core calculation helpers ─────────────────────────────────────────

    def calculate_bmr(self, weight_kg: float, height_cm: float,
                      age: int, gender: str) -> float:
        formula = self.bmr_formulas.get(gender.lower())
        if formula is None:
            raise ValueError(f'Invalid gender: {gender!r}. Use "male" or "female".')
        return formula(weight_kg, height_cm, age)

    def calculate_tdee(self, bmr: float, activity_level: str = 'moderate') -> float:
        factor = self.activity_factors.get(activity_level, 1.55)
        return bmr * factor

    def calculate_daily_calories(self, tdee: float, category: str) -> int:
        return int(tdee + self.calorie_adjustments.get(category, 0))

    def calculate_protein(self, weight_kg: float, category: str) -> int:
        return int(weight_kg * self.protein_multipliers.get(category, 1.0))

    def calculate_carbs(self, daily_calories: int, category: str) -> int:
        pct = self.carb_percentages.get(category, 0.50)
        return int((daily_calories * pct) / 4)      # 4 kcal / g

    def calculate_fats(self, daily_calories: int) -> int:
        return int((daily_calories * self.fat_percentage) / 9)  # 9 kcal / g

    def calculate_water(self, weight_kg: float) -> int:
        """33 ml / kg; minimum 3000ml, rounded to nearest 500ml interval."""
        raw_ml = weight_kg * 33
        return max(3000, round(raw_ml / 500) * 500)

    # ── Main public API ──────────────────────────────────────────────────

    def get_complete_nutrition_plan(
        self,
        weight_kg: float,
        height_cm: float,
        age: int,
        gender: str,
        category: str,
        activity_level: str = 'moderate'
    ) -> dict:
        """
        Return a complete nutrition plan for the given inputs.

        Parameters
        ----------
        weight_kg      : body weight in kg
        height_cm      : height in cm
        age            : age in years
        gender         : 'male' or 'female'
        category       : body classification label
        activity_level : one of sedentary / light / moderate / active / very_active

        Returns
        -------
        dict with body_metrics, energy_expenditure, daily_targets,
        macronutrient_distribution, and recommendations
        """
        bmr            = self.calculate_bmr(weight_kg, height_cm, age, gender)
        tdee           = self.calculate_tdee(bmr, activity_level)
        daily_calories = self.calculate_daily_calories(tdee, category)
        daily_protein  = self.calculate_protein(weight_kg, category)
        daily_carbs    = self.calculate_carbs(daily_calories, category)
        daily_fats     = self.calculate_fats(daily_calories)
        daily_water    = self.calculate_water(weight_kg)

        height_m = height_cm / 100
        bmi      = round(weight_kg / (height_m ** 2), 2)

        return {
            'body_metrics': {
                'weight_kg': weight_kg,
                'height_cm': height_cm,
                'bmi':       bmi,
                'category':  category,
                'age':       age,
                'gender':    gender,
            },
            'energy_expenditure': {
                'bmr':            int(bmr),
                'tdee':           int(tdee),
                'activity_level': activity_level,
            },
            'daily_targets': {
                'calories':   daily_calories,
                'protein_g':  daily_protein,
                'carbs_g':    daily_carbs,
                'fats_g':     daily_fats,
                'fiber_g':    self.fiber_target,
                'water_ml':   daily_water,
            },
            'macronutrient_distribution': {
                'protein_pct': round((daily_protein * 4 / daily_calories) * 100, 1),
                'carbs_pct':   round((daily_carbs   * 4 / daily_calories) * 100, 1),
                'fats_pct':    round((daily_fats     * 9 / daily_calories) * 100, 1),
            },
            'recommendations': self._recommendations.get(category, []),
        }


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    calc = NutritionCalculator()

    test_cases = [
        dict(weight_kg=50, height_cm=165, age=22, gender='female',
             category='under_weight'),
        dict(weight_kg=72, height_cm=175, age=25, gender='male',
             category='normal'),
        dict(weight_kg=85, height_cm=170, age=35, gender='male',
             category='overweight'),
        dict(weight_kg=100, height_cm=168, age=40, gender='female',
             category='obese'),
        dict(weight_kg=130, height_cm=162, age=28, gender='female',
             category='extremely_obese'),
    ]

    for tc in test_cases:
        plan = calc.get_complete_nutrition_plan(**tc, activity_level='moderate')
        t    = plan['daily_targets']
        m    = plan['body_metrics']
        print(f"\n[{m['category'].upper():15s}]  BMI={m['bmi']:.1f}"
              f"  Calories={t['calories']} kcal"
              f"  P={t['protein_g']}g  C={t['carbs_g']}g  F={t['fats_g']}g"
              f"  Water={t['water_ml']}ml")

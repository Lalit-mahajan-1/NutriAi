import httpx
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("USDA_API_KEY")
BASE_URL = "https://api.nal.usda.gov/fdc/v1"


async def get_nutrition(meal_name: str, weight_grams: float):
    async with httpx.AsyncClient() as client:
        # Step 1: Search the food
        res = await client.get(f"{BASE_URL}/foods/search", params={
            "api_key": API_KEY,
            "query": meal_name,
            "pageSize": 1
        })
        data = res.json()

        if not data.get("foods"):
            return {"error": f"No results found for '{meal_name}'"}

        food = data["foods"][0]
        nutrients = {n["nutrientName"]: n["value"] for n in food.get("foodNutrients", [])}

        # Step 2: Scale from per-100g to actual weight
        f = weight_grams / 100

        def g(name):
            return round(nutrients.get(name, 0) * f, 2)

        return {
            "food_name": meal_name,
            "matched_food": food.get("description"),
            "weight_grams": weight_grams,
            "macronutrients": {
                "calories_kcal": g("Energy"),
                "protein_g": g("Protein"),
                "fat_g": g("Total lipid (fat)"),
                "carbs_g": g("Carbohydrate, by difference"),
                "fiber_g": g("Fiber, total dietary"),
                "sugar_g": g("Sugars, total including NLEA"),
            },
            "minerals": {
                "calcium_mg": g("Calcium, Ca"),
                "iron_mg": g("Iron, Fe"),
                "magnesium_mg": g("Magnesium, Mg"),
                "potassium_mg": g("Potassium, K"),
                "sodium_mg": g("Sodium, Na"),
                "zinc_mg": g("Zinc, Zn"),
                "phosphorus_mg": g("Phosphorus, P"),
            },
            "vitamins": {
                "vitamin_a_mcg": g("Vitamin A, RAE"),
                "vitamin_c_mg": g("Vitamin C, total ascorbic acid"),
                "vitamin_d_mcg": g("Vitamin D (D2 + D3)"),
                "vitamin_e_mg": g("Vitamin E (alpha-tocopherol)"),
                "vitamin_k_mcg": g("Vitamin K (phylloquinone)"),
                "vitamin_b6_mg": g("Vitamin B-6"),
                "vitamin_b12_mcg": g("Vitamin B-12"),
                "folate_mcg": g("Folate, total"),
            },
            "other": {
                "cholesterol_mg": g("Cholesterol"),
                "water_g": g("Water"),
            }
        }
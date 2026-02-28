"""
Enrich dataset/sample.csv with 'Category' and 'Veg_NonVeg' columns.
Run once from the ml-backend directory:
    py enrich_csv.py
"""
import pandas as pd
import re

df = pd.read_csv("dataset/sample.csv")

# ── Normalise carbs column name ───────────────────────────────────────────────
if "Carbohydrates (g)" in df.columns:
    df.rename(columns={"Carbohydrates (g)": "Carbs (g)"}, inplace=True)

# ── Category keywords (checked against lowercased dish name) ─────────────────
BREAKFAST_KW = [
    "oat", "porridge", "cereal", "chai", "tea", "coffee", "cocoa",
    "egg", "toast", "bread", "sandwich", "muffin", "pancake", "waffle",
    "idli", "dosa", "upma", "poha", "paratha", "parantha", "roti", "chilla",
    "cheela", "besan", "moong", "uttapam", "thepla", "cornflake",
    "milk", "curd", "yoghurt", "yogurt", "smoothie", "juice",
]

LUNCH_KW = [
    "rice", "pulao", "biryani", "khichdi", "dal", "rajma", "chole",
    "sabzi", "curry", "sabji", "bhaji", "paneer", "tofu", "soya",
    "chicken", "fish", "mutton", "lamb", "prawn", "shrimp", "meat",
    "salad", "soup", "wrap", "burger", "pizza", "pasta", "noodle",
    "bowl", "thali", "sambar", "rasam", "kadhi",
]

DINNER_KW = [
    "dinner", "roti", "chapati", "naan", "puri", "bhatura",
    "dal makhani", "palak", "mixed veg", "aloo", "gobhi", "bhindi",
    "baingan", "lauki", "tinda", "karela", "methi",
    "keema", "kofta", "seekh", "tandoor", "grilled", "roast",
]

SNACK_KW = [
    "biscuit", "cookie", "cracker", "cake", "sweet", "halwa",
    "ladoo", "barfi", "kheer", "pudding", "ice cream", "dessert",
    "chips", "namkeen", "bhujia", "chakli", "murukku", "popcorn",
    "nut", "peanut", "cashew", "almond", "walnut", "seed", "fruit",
    "banana", "apple", "mango", "orange", "grape", "berry", "melon",
    "chaat", "pani puri", "bhel", "samosa", "pakora", "fritter",
    "drink", "sharbat", "lassi", "buttermilk",
    "espreso", "espresso", "latte", "cappuccino",
]

NON_VEG_KW = [
    "chicken", "fish", "mutton", "lamb", "prawn", "shrimp", "meat",
    "egg", "keema", "seekh", "beef", "pork", "sardine", "tuna", "salmon",
    "bacon", "sausage", "ham", "crab", "lobster", "oyster",
]


def classify_category(name: str) -> str:
    n = name.lower()
    # Check in priority order: breakfast → snack first (beverages/sweets), then lunch/dinner
    for kw in BREAKFAST_KW:
        if kw in n:
            return "breakfast"
    for kw in SNACK_KW:
        if kw in n:
            return "snack"
    for kw in LUNCH_KW:
        if kw in n:
            return "lunch"
    for kw in DINNER_KW:
        if kw in n:
            return "dinner"
    # Default: distribute by row index for balance
    return "lunch"


def classify_diet(name: str) -> str:
    n = name.lower()
    for kw in NON_VEG_KW:
        if kw in n:
            return "Non-Veg"
    return "Veg"


df["Category"] = df["Dish Name"].apply(classify_category)
df["Veg_NonVeg"] = df["Dish Name"].apply(classify_diet)

# ── Show distribution ─────────────────────────────────────────────────────────
print("Category distribution:")
print(df["Category"].value_counts())
print("\nDiet distribution:")
print(df["Veg_NonVeg"].value_counts())
print(f"\nTotal rows: {len(df)}")

# ── Save enriched CSV ─────────────────────────────────────────────────────────
df.to_csv("dataset/sample.csv", index=False)
print("\n✅ dataset/sample.csv updated with Category and Veg_NonVeg columns.")

// API client for NutriSight Backend
// ─── ML Backend (FastAPI, port 8000) ───────────────────────────────────────
const ML_URL = "http://localhost:8000/api";

export interface MealEntry {
  dish_name: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  category: string;
  veg_nonveg: string;
  price_inr?: number;
}

export interface DayPlan {
  day: number;
  meals: {
    breakfast: MealEntry | null;
    lunch: MealEntry | null;
    dinner: MealEntry | null;
    snack: MealEntry | null;
  };
}

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
  water_ml: number;
}

export interface WeeklyPlan {
  user_id: string;
  daily_targets: MacroTargets;
  days: DayPlan[];
}

export interface MealPreference {
  user_id: string;
  dish_name: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  category: string;
  veg_nonveg: string;
  liked_at: string;
}

export interface MealNutrition {
  food_name: string;
  matched_food: string;
  weight_grams: number;
  macronutrients: {
    calories_kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
    sugar_g: number;
  };
  minerals: {
    calcium_mg: number;
    iron_mg: number;
    magnesium_mg: number;
    potassium_mg: number;
    sodium_mg: number;
    zinc_mg: number;
    phosphorus_mg: number;
  };
  vitamins: {
    vitamin_a_mcg: number;
    vitamin_c_mg: number;
    vitamin_d_mcg: number;
    vitamin_e_mg: number;
    vitamin_k_mcg: number;
    vitamin_b6_mg: number;
    vitamin_b12_mcg: number;
    folate_mcg: number;
  };
  other: { cholesterol_mg: number; water_g: number };
  error?: string;
}

export interface BodyAnalysis {
  bmi: number;
  category: "under_weight" | "normal" | "overweight" | "obese" | "extremely_obese";
  confidence: number;
  nutrition_plan: {
    body_metrics: { weight_kg: number; height_cm: number; bmi: number; category: string; age: number; gender: string };
    energy_expenditure: { bmr: number; tdee: number; activity_level: string };
    daily_targets: { calories: number; protein_g: number; carbs_g: number; fats_g: number; fiber_g: number; water_ml: number };
    macronutrient_distribution: { protein_pct: number; carbs_pct: number; fats_pct: number };
    recommendations: string[];
  };
  error?: string;
}

export interface ScanRecord {
  scan_id: string;
  scanned_at: string;          // ISO 8601 UTC
  bmi: number;
  category: string;
  confidence: number;
  pose_quality?: number;
  inputs: { height_cm: number; weight_kg: number; age: number; gender: string; activity_level: string };
  nutrition_plan?: { daily_targets: { calories: number; protein_g: number; carbs_g: number; fats_g: number; fiber_g: number; water_ml: number } };
}

export const mlApi = {
  analyze: (meal_name: string, weight_grams: number) =>
    fetch(`${ML_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meal_name, weight_grams }),
    }).then(r => r.json() as Promise<MealNutrition>),

  bodyAnalyze: (height_cm: number, weight_kg: number, age: number, gender: string, activity_level: string) =>
    fetch(`${ML_URL}/body-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ height_cm, weight_kg, age, gender, activity_level }),
    }).then(r => r.json() as Promise<BodyAnalysis>),

  cameraAnalyze: (payload: {
    user_id: string;
    height_cm: number; weight_kg: number; age: number; gender: string; activity_level: string;
    waist_hip_ratio: number; shoulder_waist_ratio: number; torso_leg_ratio: number; body_aspect_ratio: number;
    pose_quality?: number;
  }) =>
    fetch(`${ML_URL}/camera-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => r.json() as Promise<BodyAnalysis & { scan_id: string; scanned_at: string }>),

  getScanHistory: (user_id: string, limit = 10) =>
    fetch(`${ML_URL}/scan-history/${user_id}?limit=${limit}`)
      .then(r => r.json() as Promise<{ scans: ScanRecord[]; count: number }>),

  // ── Recommendation Engine (ML backend /recommender) ─────────────────
  /** Optional profile avoids ML backend calling Node user service (faster, no timeout). */
  getWeeklyPlan: (
    token: string,
    goal: "weight_loss" | "maintenance" | "muscle_gain" = "maintenance",
    activityLevel: string = "moderate",
    dietaryPref: "veg" | "non-veg" = "veg",
    profile?: { height?: number | null; weight?: number | null; age?: number | null; gender?: string | null; user_id?: string } | null,
  ) => {
    const params = new URLSearchParams({
      goal,
      activity_level: activityLevel,
      dietary_pref: dietaryPref,
    });
    if (profile?.height != null && profile?.weight != null && profile?.age != null && profile?.gender != null) {
      params.set("height", String(profile.height));
      params.set("weight", String(profile.weight));
      params.set("age", String(profile.age));
      params.set("gender", profile.gender);
      if (profile.user_id) params.set("user_id", profile.user_id);
    }
    return fetch(`${ML_URL}/weekly-plan?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) {
        const msg = (data?.detail ?? data?.message ?? "Failed to load recommendations") as string;
        throw new Error(Array.isArray(msg) ? msg.join(" ") : msg);
      }
      return data as WeeklyPlan;
    });
  },

  getPreferences: (userId: string) =>
    fetch(`${ML_URL}/preferences/${userId}`)
      .then(r => r.json() as Promise<{ preferences: MealPreference[]; count: number }>),

  likeMeal: (token: string, meal: Omit<MealPreference, "liked_at">) =>
    fetch(`${ML_URL}/preferences/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(meal),
    }).then(r => r.json()),

  unlikeMeal: (token: string, userId: string, dishName: string) =>
    fetch(`${ML_URL}/preferences/unlike`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId, dish_name: dishName }),
    }).then(r => r.json()),

  /** Sends -1 feedback to the LinUCB bandit + stores in MongoDB meal_dislikes */
  dislikeMeal: (token: string, meal: Omit<MealPreference, "liked_at">) =>
    fetch(`${ML_URL}/preferences/dislike`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(meal),
    }).then(r => r.json()),

  /** Remove a dislike (undo dislike) */
  undislikeMeal: (token: string, userId: string, dishName: string) =>
    fetch(`${ML_URL}/preferences/unlike`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId, dish_name: dishName }),
    }).then(r => r.json()),

  getDislikes: (userId: string) =>
    fetch(`${ML_URL}/preferences/dislikes/${userId}`)
      .then(r => r.json() as Promise<{ dislikes: MealPreference[]; count: number }>),

  /** Returns all dish → price (INR) from sample.csv */
  getMealPrices: () =>
    fetch(`${ML_URL}/meal-prices`)
      .then(r => r.json() as Promise<{ prices: Record<string, number>; count: number; avg_inr: number; min_inr: number; max_inr: number }>),
};

// ─── Main Backend (Express, port 5000) ────────────────────────────────────
const BASE_URL = "http://localhost:5000/api";

interface AuthResponse {
  _id: string;
  name: string;
  email: string;
  token: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  height: number | null;
  weight: number | null;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiError {
  message: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("nutrisight_token");

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as ApiError).message || "Something went wrong");
  }

  return data as T;
}

export const authApi = {
  signup: (name: string, email: string, password: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

export const userApi = {
  getProfile: () => request<UserProfile>("/users/me"),

  updateProfile: (data: Partial<Omit<UserProfile, "_id" | "email" | "createdAt" | "updatedAt">>) =>
    request<UserProfile>("/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getUserById: (userId: string) =>
    request<UserProfile>(`/users/${userId}`),
};

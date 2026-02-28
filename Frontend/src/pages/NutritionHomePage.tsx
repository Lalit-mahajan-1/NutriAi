/**
 * NutriSight — Nutrition Home Page  (/home/:userId)
 *
 * Two ML API calls:
 *  1. POST /api/body-analyze  → BMI, body category, TDEE, daily macro targets, recommendations
 *  2. POST /api/analyze       → Per-meal nutrition lookup (macros + minerals + vitamins)
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { mlApi, BodyAnalysis, MealNutrition } from "@/lib/api";
import CameraSection from "@/components/CameraSection";

// ── helpers ─────────────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  under_weight:    { label: "Underweight",      color: "#3B82F6", bg: "rgba(59,130,246,.1)",  emoji: "📉" },
  normal:          { label: "Healthy Weight",   color: "#22C55E", bg: "rgba(34,197,94,.1)",   emoji: "✅" },
  overweight:      { label: "Overweight",       color: "#F59E0B", bg: "rgba(245,158,11,.1)",  emoji: "⚠️" },
  obese:           { label: "Obese",            color: "#EF4444", bg: "rgba(239,68,68,.1)",   emoji: "🔴" },
  extremely_obese: { label: "Extremely Obese",  color: "#DC2626", bg: "rgba(220,38,38,.1)",   emoji: "🚨" },
};

const BMI_COLOR = (bmi: number) =>
  bmi < 18.5 ? "#3B82F6" : bmi < 25 ? "#22C55E" : bmi < 30 ? "#F59E0B" : "#EF4444";

const QUICK_MEALS = ["Dal Rice", "Paneer Bhurji", "Rajma Chawal", "Egg Curry", "Poha", "Curd Rice", "Chicken Curry", "Idli"];

// ── MacroBar ─────────────────────────────────────────────────────────────────
const MacroBar = ({ label, pct, color, value, unit }: { label: string; pct: number; color: string; value: number; unit: string }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#5C3D2E" }}>{label}</span>
      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#8B6855" }}>{value}{unit} <span style={{ color: "#B09080" }}>({pct}%)</span></span>
    </div>
    <div style={{ height: 8, background: "rgba(212,168,138,.25)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.min(pct, 100)}%`,
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        borderRadius: 99,
        transition: "width 1s cubic-bezier(.22,1,.36,1)",
      }} />
    </div>
  </div>
);

// ── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, unit, emoji, color }: { label: string; value: string | number; unit?: string; emoji: string; color: string }) => (
  <div style={{
    background: "#fff", borderRadius: 18, padding: "18px 20px",
    border: `1px solid ${color}33`,
    boxShadow: `0 4px 18px ${color}15`,
    display: "flex", flexDirection: "column", gap: 4,
  }}>
    <div style={{ fontSize: 24 }}>{emoji}</div>
    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color, lineHeight: 1.1 }}>
      {value}<span style={{ fontSize: 13, fontWeight: 400, color: "#A07060", marginLeft: 3 }}>{unit}</span>
    </div>
    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#8B6855", fontWeight: 500 }}>{label}</div>
  </div>
);

// ── NutritionRow ─────────────────────────────────────────────────────────────
const NutrRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{
    display: "flex", justifyContent: "space-between",
    padding: "8px 0", borderBottom: "1px solid rgba(212,168,138,.18)",
    fontFamily: "'DM Sans',sans-serif", fontSize: 13,
  }}>
    <span style={{ color: "#7A5040" }}>{label}</span>
    <span style={{ fontWeight: 700, color: "#3D1F0A" }}>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function NutritionHomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [bodyData,   setBodyData]   = useState<BodyAnalysis | null>(null);
  const [bodyError,  setBodyError]  = useState("");
  const [bodyLoading,setBodyLoading]= useState(false);

  const [mealName,   setMealName]   = useState("Dal Rice");
  const [mealWeight, setMealWeight] = useState(300);
  const [mealData,   setMealData]   = useState<MealNutrition | null>(null);
  const [mealError,  setMealError]  = useState("");
  const [mealLoading,setMealLoading]= useState(false);

  // Auto-fetch body analysis if profile is complete
  const runBodyAnalysis = useCallback(async () => {
    if (!profile?.height || !profile?.weight || !profile?.age || !profile?.gender) return;
    setBodyLoading(true);
    setBodyError("");
    try {
      const res = await mlApi.bodyAnalyze(
        profile.height,
        profile.weight,
        profile.age,
        profile.gender,
        profile.activityLevel ?? "moderate"
      );
      if (res.error) setBodyError(res.error);
      else setBodyData(res);
    } catch {
      setBodyError("Could not reach the ML backend. Is it running on port 8000?");
    } finally {
      setBodyLoading(false);
    }
  }, [profile]);

  useEffect(() => { runBodyAnalysis(); }, [runBodyAnalysis]);

  const runMealAnalysis = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!mealName.trim()) return;
    setMealLoading(true);
    setMealError("");
    setMealData(null);
    try {
      const res = await mlApi.analyze(mealName.trim(), mealWeight);
      if (res.error) setMealError(res.error);
      else setMealData(res);
    } catch {
      setMealError("Could not reach the ML backend. Is it running on port 8000?");
    } finally {
      setMealLoading(false);
    }
  };

  const catMeta = bodyData ? (CATEGORY_META[bodyData.category] ?? CATEGORY_META["normal"]) : null;
  const plan    = bodyData?.nutrition_plan;
  const targets = plan?.daily_targets;
  const macros  = plan?.macronutrient_distribution;
  const energy  = plan?.energy_expenditure;

  const profileIncomplete = !profile?.height || !profile?.weight || !profile?.age || !profile?.gender;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFF5EE",
      fontFamily: "'Playfair Display',serif",
      paddingBottom: 60,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        .meal-input {
          flex: 1; padding: 12px 16px; border-radius: 14px;
          border: 1.5px solid rgba(212,168,138,.4); background: #fff;
          font-family: 'DM Sans',sans-serif; font-size: 15px; color: #3D1F0A;
          outline: none; transition: border-color .2s, box-shadow .2s;
        }
        .meal-input:focus { border-color: #E8734A; box-shadow: 0 0 0 3px rgba(232,115,74,.15); }
        .analyze-btn {
          padding: 12px 24px; border: none; border-radius: 14px;
          background: linear-gradient(135deg,#E8734A,#C4522E); color: #fff;
          font-family: 'DM Sans',sans-serif; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all .25s; box-shadow: 0 4px 16px rgba(232,115,74,.35);
          white-space: nowrap;
        }
        .analyze-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(232,115,74,.45); }
        .analyze-btn:disabled { opacity: .65; cursor: not-allowed; }
        .quick-pill {
          padding: 6px 14px; border-radius: 99px;
          border: 1.5px solid rgba(212,168,138,.4); background: #fff;
          font-family: 'DM Sans',sans-serif; font-size: 12px; font-weight: 500; color: #7A5040;
          cursor: pointer; transition: all .2s; white-space: nowrap;
        }
        .quick-pill:hover { border-color: #E8734A; color: #E8734A; background: rgba(232,115,74,.06); }
        .section { background: #fff; border-radius: 24px; padding: 28px; box-shadow: 0 4px 24px rgba(92,61,46,.08); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg,#E8734A,#C4522E)",
        padding: "36px 24px 52px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position:"absolute", width:400, height:400, top:-120, right:-80, background:"rgba(255,200,150,.14)", borderRadius:"50%", pointerEvents:"none" }} />
        <div style={{ maxWidth: 960, margin: "0 auto", position: "relative" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:"rgba(255,220,200,.8)", letterSpacing:2, textTransform:"uppercase", margin:"0 0 6px" }}>
                🍛 NutriSight AI
              </p>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(26px,4vw,40px)", fontWeight:900, color:"#fff", letterSpacing:"-1px", margin:0, lineHeight:1.1 }}>
                Welcome back, <span style={{ fontStyle:"italic" }}>{user?.name?.split(" ")[0]}</span>
              </h1>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"rgba(255,220,200,.85)", margin:"8px 0 0" }}>
                Your AI-powered nutrition dashboard
              </p>
            </div>
            <button
              onClick={() => user?._id && navigate(`/profile/${user._id}`)}
              style={{
                background:"rgba(255,255,255,.2)", border:"1px solid rgba(255,255,255,.35)",
                borderRadius:14, padding:"10px 18px",
                fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:"#fff",
                cursor:"pointer", display:"flex", alignItems:"center", gap:8,
              }}
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>

        {/* ── Profile incomplete banner ──────────────────── */}
        {profileIncomplete && (
          <div style={{
            marginTop: 16,
            background: "rgba(232,115,74,.12)", border: "1px solid rgba(232,115,74,.3)",
            borderRadius: 16, padding: "14px 18px",
            fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#C4522E",
            display:"flex", alignItems:"center", gap:12,
            animation:"fadeUp .4s both",
          }}>
            <span style={{ fontSize:22 }}>⚡</span>
            <div>
              <strong>Complete your profile</strong> to unlock your personalized body analysis & nutrition plan.{" "}
              <button
                onClick={() => user?._id && navigate(`/profile/${user._id}`)}
                style={{ background:"none", border:"none", color:"#E8734A", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:13, textDecoration:"underline" }}
              >
                Add height, weight, age & gender →
              </button>
            </div>
          </div>
        )}

        {/* ── BODY ANALYSIS ─────────────────────────────── */}
        <div style={{ marginTop: 20, animation: "fadeUp .5s .1s both" }} className="section">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color:"#3D1F0A", margin:0 }}>
              🧬 Body Analysis
            </h2>
            {!profileIncomplete && (
              <button onClick={runBodyAnalysis} disabled={bodyLoading} className="analyze-btn" style={{ padding:"8px 18px", fontSize:13 }}>
                {bodyLoading ? "Analyzing…" : "↻ Refresh"}
              </button>
            )}
          </div>

          {bodyLoading && (
            <div style={{ display:"flex", alignItems:"center", gap:14, padding:"24px 0", color:"#8B6855", fontFamily:"'DM Sans',sans-serif" }}>
              <div style={{ width:28, height:28, border:"3px solid rgba(232,115,74,.25)", borderTop:"3px solid #E8734A", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
              Running ML body analysis…
            </div>
          )}

          {bodyError && (
            <div style={{ background:"rgba(220,60,60,.08)", border:"1px solid rgba(220,60,60,.2)", borderRadius:12, padding:"12px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#C0392B" }}>
              ⚠️ {bodyError}
            </div>
          )}

          {bodyData && !bodyLoading && catMeta && plan && targets && macros && energy && (
            <div style={{ animation:"fadeUp .4s both" }}>
              {/* Top row: BMI + category + stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:24 }}>
                {/* BMI card */}
                <div style={{
                  background:`linear-gradient(135deg,${BMI_COLOR(bodyData.bmi)}15,${BMI_COLOR(bodyData.bmi)}08)`,
                  border:`1.5px solid ${BMI_COLOR(bodyData.bmi)}40`,
                  borderRadius:18, padding:"18px 20px", gridColumn:"span 2",
                  display:"flex", alignItems:"center", gap:16,
                }}>
                  <div style={{
                    width:72, height:72, borderRadius:"50%",
                    background:`linear-gradient(135deg,${BMI_COLOR(bodyData.bmi)},${BMI_COLOR(bodyData.bmi)}bb)`,
                    display:"flex",flexDirection:"column", alignItems:"center", justifyContent:"center",
                    color:"#fff", flexShrink:0,
                    boxShadow:`0 6px 20px ${BMI_COLOR(bodyData.bmi)}40`,
                  }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, lineHeight:1 }}>{bodyData.bmi}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9, fontWeight:700, letterSpacing:1, opacity:.9 }}>BMI</div>
                  </div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:22 }}>{catMeta.emoji}</span>
                      <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:900, color:catMeta.color }}>{catMeta.label}</span>
                    </div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#8B6855" }}>
                      ML Confidence: <strong style={{ color:"#5C3D2E" }}>{bodyData.confidence}%</strong>
                      {" · "}Activity: <strong style={{ color:"#5C3D2E" }}>{energy.activity_level.replace("_"," ")}</strong>
                    </div>
                  </div>
                </div>

                <StatCard label="Daily Calories"  value={targets.calories}   unit="kcal" emoji="🔥" color="#E8734A" />
                <StatCard label="BMR"              value={energy.bmr}         unit="kcal" emoji="⚡" color="#A855F7" />
                <StatCard label="TDEE"             value={energy.tdee}        unit="kcal" emoji="💨" color="#3B82F6" />
                <StatCard label="Daily Protein"    value={targets.protein_g}  unit="g"    emoji="💪" color="#22C55E" />
                <StatCard label="Daily Water"      value={Math.round(targets.water_ml/1000*10)/10} unit="L" emoji="💧" color="#06B6D4" />
                <StatCard label="Fiber Target"     value={targets.fiber_g}    unit="g"    emoji="🌾" color="#78716C" />
              </div>

              {/* Macro distribution */}
              <div style={{ background:"#FFF8F5", borderRadius:16, padding:"20px 22px", marginBottom:22 }}>
                <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:"#3D1F0A", margin:"0 0 16px" }}>
                  Macronutrient Targets
                </h3>
                <MacroBar label="Protein" pct={macros.protein_pct} color="#22C55E" value={targets.protein_g} unit="g" />
                <MacroBar label="Carbohydrates" pct={macros.carbs_pct} color="#E8734A" value={targets.carbs_g} unit="g" />
                <MacroBar label="Fats" pct={macros.fats_pct} color="#A855F7" value={targets.fats_g} unit="g" />
              </div>

              {/* Recommendations */}
              <div>
                <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:"#3D1F0A", margin:"0 0 12px" }}>
                  📋 Personalized Recommendations
                </h3>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:10 }}>
                  {plan.recommendations.map((rec, i) => (
                    <div key={i} style={{
                      display:"flex", alignItems:"flex-start", gap:10,
                      background:"#fff", border:"1px solid rgba(212,168,138,.25)",
                      borderRadius:12, padding:"10px 14px",
                    }}>
                      <span style={{ color:"#E8734A", fontWeight:700, flexShrink:0, marginTop:1 }}>→</span>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#5C3D2E", lineHeight:1.5 }}>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!bodyData && !bodyLoading && !bodyError && !profileIncomplete && (
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#A07060", padding:"12px 0" }}>
              Click Refresh to run your body analysis.
            </div>
          )}
        </div>

        {/* ── CAMERA LIVE TRACKING ─────────────────────── */}
        <div style={{ marginTop: 20 }}>
          <CameraSection
            userId={user?._id ?? ""}
            profile={profile}
            activityLevel={profile?.activityLevel ?? "moderate"}
            onResult={(res) => {
              setBodyData(res);
            }}
          />
        </div>

        {/* ── MEAL ANALYZER ─────────────────────────────── */}
        <div style={{ marginTop: 20, animation:"fadeUp .5s .2s both" }} className="section">
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color:"#3D1F0A", margin:"0 0 6px" }}>
            🥗 Meal Nutrition Analyzer
          </h2>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#8B6855", margin:"0 0 18px" }}>
            Search any food and get detailed nutritional breakdown (powered by USDA database)
          </p>

          {/* Quick meals */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
            {QUICK_MEALS.map(m => (
              <button key={m} className="quick-pill" onClick={() => setMealName(m)}>{m}</button>
            ))}
          </div>

          {/* Search form */}
          <form onSubmit={runMealAnalysis} style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
            <input
              className="meal-input"
              value={mealName}
              onChange={e => setMealName(e.target.value)}
              placeholder="e.g. Rajma Chawal, Egg Curry…"
            />
            <input
              className="meal-input"
              type="number" min={10} max={2000} step={10}
              value={mealWeight}
              onChange={e => setMealWeight(Number(e.target.value))}
              placeholder="Weight (g)"
              style={{ maxWidth: 120 }}
            />
            <button className="analyze-btn" type="submit" disabled={mealLoading}>
              {mealLoading ? (
                <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,.4)", borderTop:"2px solid #fff", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} />
                  Analyzing…
                </span>
              ) : "Analyze →"}
            </button>
          </form>

          {mealError && (
            <div style={{ background:"rgba(220,60,60,.08)", border:"1px solid rgba(220,60,60,.2)", borderRadius:12, padding:"12px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#C0392B", marginBottom:16 }}>
              ⚠️ {mealError}
            </div>
          )}

          {mealData && !mealLoading && (
            <div style={{ animation:"fadeUp .4s both" }}>
              {/* Header */}
              <div style={{ background:"linear-gradient(135deg,rgba(232,115,74,.08),rgba(232,115,74,.04))", border:"1px solid rgba(232,115,74,.2)", borderRadius:16, padding:"16px 20px", marginBottom:20 }}>
                <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900, color:"#3D1F0A", margin:"0 0 4px" }}>
                  {mealData.matched_food}
                </h3>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#8B6855", margin:0 }}>
                  Serving: {mealData.weight_grams}g
                </p>
              </div>

              {/* Calorie hero */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:12, marginBottom:22 }}>
                <StatCard label="Calories"  value={mealData.macronutrients.calories_kcal} unit="kcal" emoji="🔥" color="#E8734A" />
                <StatCard label="Protein"   value={mealData.macronutrients.protein_g}     unit="g"    emoji="💪" color="#22C55E" />
                <StatCard label="Carbs"     value={mealData.macronutrients.carbs_g}       unit="g"    emoji="🌾" color="#F59E0B" />
                <StatCard label="Fat"       value={mealData.macronutrients.fat_g}         unit="g"    emoji="🫙" color="#A855F7" />
                <StatCard label="Fiber"     value={mealData.macronutrients.fiber_g}       unit="g"    emoji="🌿" color="#10B981" />
                <StatCard label="Sugar"     value={mealData.macronutrients.sugar_g}       unit="g"    emoji="🍬" color="#F43F5E" />
              </div>

              {/* Minerals + Vitamins */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div style={{ background:"#FFF8F5", borderRadius:16, padding:"18px 20px" }}>
                  <h4 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:"#3D1F0A", margin:"0 0 12px" }}>⚗️ Minerals</h4>
                  <NutrRow label="Calcium"    value={`${mealData.minerals.calcium_mg} mg`} />
                  <NutrRow label="Iron"        value={`${mealData.minerals.iron_mg} mg`} />
                  <NutrRow label="Magnesium"  value={`${mealData.minerals.magnesium_mg} mg`} />
                  <NutrRow label="Potassium"  value={`${mealData.minerals.potassium_mg} mg`} />
                  <NutrRow label="Sodium"     value={`${mealData.minerals.sodium_mg} mg`} />
                  <NutrRow label="Zinc"       value={`${mealData.minerals.zinc_mg} mg`} />
                  <NutrRow label="Phosphorus" value={`${mealData.minerals.phosphorus_mg} mg`} />
                </div>
                <div style={{ background:"#FFF8F5", borderRadius:16, padding:"18px 20px" }}>
                  <h4 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:"#3D1F0A", margin:"0 0 12px" }}>💊 Vitamins</h4>
                  <NutrRow label="Vitamin A"   value={`${mealData.vitamins.vitamin_a_mcg} mcg`} />
                  <NutrRow label="Vitamin C"   value={`${mealData.vitamins.vitamin_c_mg} mg`} />
                  <NutrRow label="Vitamin D"   value={`${mealData.vitamins.vitamin_d_mcg} mcg`} />
                  <NutrRow label="Vitamin E"   value={`${mealData.vitamins.vitamin_e_mg} mg`} />
                  <NutrRow label="Vitamin B6"  value={`${mealData.vitamins.vitamin_b6_mg} mg`} />
                  <NutrRow label="Vitamin B12" value={`${mealData.vitamins.vitamin_b12_mcg} mcg`} />
                  <NutrRow label="Folate"      value={`${mealData.vitamins.folate_mcg} mcg`} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

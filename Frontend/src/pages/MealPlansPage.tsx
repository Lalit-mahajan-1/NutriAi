import { useSectionAnimation } from "@/hooks/useSectionAnimation";
import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { mlApi, WeeklyPlan, MealEntry, MealPreference } from "@/lib/api";

/* ── Sticker assets ── */
import sticker1 from "@/assets/salad.png";
import sticker2 from "@/assets/chilla.png";
import sticker3 from "@/assets/idli.png";
import sticker4 from "@/assets/raita.png";
import sticker5 from "@/assets/dosa.png";
import sticker6 from "@/assets/oats.png";

// ── Types ────────────────────────────────────────────────────────────────────
type Goal     = "weight_loss" | "maintenance" | "muscle_gain";
type Diet     = "veg" | "non-veg";
type Reaction = "liked" | "disliked" | null;
type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as const;

const GOAL_LABELS: Record<Goal, string> = {
  weight_loss: "🔥 Weight Loss",
  maintenance: "⚖️ Maintenance",
  muscle_gain: "💪 Muscle Gain",
};

const MEAL_EMOJIS: Record<string, string> = {
  breakfast:"🌅", lunch:"☀️", snack:"🍎", dinner:"🌙",
};

/** Deduplicate all meals across 7 days (unique dish_name) */
function collectAllMeals(plan: WeeklyPlan): MealEntry[] {
  const seen = new Set<string>();
  const out: MealEntry[] = [];
  for (const day of plan.days) {
    for (const m of Object.values(day.meals)) {
      if (m && !seen.has(m.dish_name)) { seen.add(m.dish_name); out.push(m); }
    }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════
export default function MealPlansPage() {
  const ref = useSectionAnimation(true);
  const { user, token, isAuthenticated } = useAuth();

  // ── ML settings ──────────────────────────────────────────────────
  const [goal, setGoal]         = useState<Goal>("maintenance");
  const [diet, setDiet]         = useState<Diet>("veg");
  const [activity, setActivity] = useState("moderate");

  // ── Plan data ─────────────────────────────────────────────────────
  const [plan, setPlan]         = useState<WeeklyPlan | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── Reactions ─────────────────────────────────────────────────────
  const [reactions, setReactions]         = useState<Record<string, Reaction>>({});
  const [reactionLoading, setRxnLoading]  = useState<Set<string>>(new Set());

  // ── Fetch plan ────────────────────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      setPlan(await mlApi.getWeeklyPlan(token, goal, activity, diet));
    } catch {
      setError("ML server unreachable — check that it's running on :8000");
    } finally {
      setLoading(false);
    }
  }, [token, goal, diet, activity]);

  // ── Fetch reactions ───────────────────────────────────────────────
  const fetchReactions = useCallback(async () => {
    if (!user) return;
    try {
      const [ld, dd] = await Promise.all([
        mlApi.getPreferences(user._id),
        mlApi.getDislikes(user._id),
      ]);
      const map: Record<string, Reaction> = {};
      for (const p of (ld.preferences as MealPreference[])) map[p.dish_name] = "liked";
      for (const d of (dd.dislikes   as MealPreference[])) map[d.dish_name] = "disliked";
      setReactions(map);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) { fetchPlan(); fetchReactions(); }
  }, [isAuthenticated, fetchPlan, fetchReactions]);

  // ── Reaction toggle ───────────────────────────────────────────────
  const toggleReaction = async (meal: MealEntry, action: "liked" | "disliked") => {
    if (!token || !user) return;
    const key     = meal.dish_name;
    const current = reactions[key] ?? null;
    if (reactionLoading.has(key)) return;

    const next: Reaction = current === action ? null : action;
    setReactions(prev => ({ ...prev, [key]: next }));
    setRxnLoading(prev => new Set(prev).add(key));

    const payload = {
      user_id: user._id, dish_name: meal.dish_name,
      calories_kcal: meal.calories_kcal, protein_g: meal.protein_g,
      carbs_g: meal.carbs_g, fats_g: meal.fats_g,
      category: meal.category, veg_nonveg: meal.veg_nonveg,
    };

    try {
      if      (next === "liked")    await mlApi.likeMeal(token, payload);
      else if (next === "disliked") await mlApi.dislikeMeal(token, payload);
      else if (current === "liked") await mlApi.unlikeMeal(token, user._id, key);
      else                          await mlApi.undislikeMeal(token, user._id, key);
    } catch {
      setReactions(prev => ({ ...prev, [key]: current }));
    } finally {
      setRxnLoading(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  // ── Derived ───────────────────────────────────────────────────────
  const allMeals   = plan ? collectAllMeals(plan) : [];
  const targets    = plan?.daily_targets;
  const likedMeals = allMeals.filter(m => reactions[m.dish_name] === "liked");
  const likeCnt    = Object.values(reactions).filter(r => r === "liked").length;
  const dislikeCnt = Object.values(reactions).filter(r => r === "disliked").length;

  // ═══════════════════════════════════════════════════════════════════
  return (
    <section
      ref={ref}
      className="section-fade min-h-screen py-12 px-4"
      style={{ background:"linear-gradient(160deg,#FFF0E8 0%,#FFE4D0 40%,#FFF8F3 70%,#FFEADB 100%)", fontFamily:"'DM Sans',sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Fraunces:ital,wght@0,800;0,900;1,800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}

        /* ── Layout ── */
        .pw { max-width:1120px; margin:0 auto; display:flex; flex-direction:column; gap:22px; }

        /* ── Shared card ── */
        .card { background:rgba(255,255,255,.78); backdrop-filter:blur(18px); border:1px solid rgba(255,140,80,.15); border-radius:24px; padding:22px 20px; }

        /* ── Section title ── */
        .stitle { font-family:'Fraunces',serif; font-size:1.05rem; font-weight:900; color:#2D1206; margin:0 0 14px; }

        /* ── Pill button ── */
        .pill { border:1.5px solid rgba(255,120,60,.22); border-radius:11px; padding:6px 14px; background:transparent; font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600; color:#8A4828; cursor:pointer; transition:all .2s; white-space:nowrap; flex-shrink:0; }
        .pill:hover { background:rgba(255,255,255,.8); }
        .pill.on { background:linear-gradient(135deg,#FF8C5A,#FF5C1A); color:#fff; border-color:transparent; box-shadow:0 4px 14px rgba(255,92,26,.32); }

        /* ── Generate button ── */
        .gen-btn { display:flex; align-items:center; gap:6px; padding:8px 20px; background:linear-gradient(135deg,#FF8C5A,#FF5C1A); border:none; border-radius:12px; color:#fff; font-family:'DM Sans',sans-serif; font-weight:800; font-size:12.5px; cursor:pointer; box-shadow:0 4px 14px rgba(255,92,26,.3); transition:all .2s; white-space:nowrap; }
        .gen-btn:disabled { opacity:.5; cursor:default; }
        .gen-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 7px 20px rgba(255,92,26,.38); }
        @keyframes spin { to{ transform:rotate(360deg); } }
        .spinning { animation:spin .75s linear infinite; }

        /* ── ptag ── */
        .ptag { display:inline-block; background:rgba(255,92,26,.1); border:1.5px solid rgba(255,92,26,.22); color:#CC4A10; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; padding:4px 14px; border-radius:30px; margin-bottom:10px; }

        /* ═══════════════════════════════
           PLANNER BOARD
        ═══════════════════════════════ */
        .board {
          position:relative;
          padding:52px 36px 72px;
          border-radius:44px;
          background:
            radial-gradient(circle at 20% 15%, rgba(255,255,255,.35), rgba(255,255,255,.12) 20%, transparent 40%),
            radial-gradient(circle at 85% 80%, rgba(0,0,0,.15), transparent 40%),
            linear-gradient(145deg,#f7b7a3 0%,#e77a54 35%,#ce5c37 65%,#a84427 100%);
          box-shadow:0 40px 90px rgba(206,92,55,.32), inset 0 1px 0 rgba(255,255,255,.25);
          overflow:visible;
        }

        .board-title { font-family:'Great Vibes',cursive; font-size:clamp(2.4rem,5vw,3.8rem); color:#fff; text-align:center; margin-bottom:42px; text-shadow:0 2px 14px rgba(0,0,0,.16); }

        /* ── Day grid ── */
        .dgrid { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
        @media(max-width:860px){ .dgrid{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:520px){ .dgrid{ grid-template-columns:1fr; } }
        .dcard { background:#F6F1EC; border-radius:26px; padding:20px 16px 18px; border:3px solid rgba(255,255,255,.4); display:flex; flex-direction:column; gap:10px; transition:.28s ease; }
        .dcard:hover { transform:translateY(-6px); box-shadow:0 20px 44px rgba(0,0,0,.17); }
        .dcard.sun { grid-column:span 3; }
        @media(max-width:860px){ .dcard.sun{ grid-column:span 2; } }
        @media(max-width:520px){ .dcard.sun{ grid-column:span 1; } }

        .day-label { font-size:1.25rem; font-weight:800; text-align:center; color:#3A1E0E; }
        .day-cost  { font-size:0.67rem; font-weight:700; color:rgba(58,30,14,.42); text-align:center; margin-top:-6px; }

        /* ── Meal slot inside day card ── */
        .mslot2 { background:rgba(255,255,255,.68); border-radius:14px; padding:10px 12px; border:1px solid rgba(200,160,130,.18); }
        .ms-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
        .ms-label  { font-size:0.6rem; font-weight:800; color:#A04E2A; text-transform:uppercase; letter-spacing:.6px; }
        .ms-price  { font-size:0.65rem; font-weight:800; color:#FF6B3D; }
        .ms-dish   { font-size:0.85rem; font-weight:700; color:#2D1206; }
        .ms-dish.empty { color:rgba(45,18,6,.3); font-weight:400; font-style:italic; }
        .ms-meta   { font-size:0.68rem; color:#8A4828; margin-top:3px; }

        /* compact like/dislike */
        .rxn-mini { display:flex; gap:4px; margin-top:5px; }
        .rxm { width:24px; height:24px; border-radius:50%; border:1.5px solid transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; flex-shrink:0; }
        .rxm:disabled { opacity:.35; cursor:default; }
        .rxm:hover:not(:disabled) { transform:scale(1.22); }
        .rxm.lk  { background:rgba(34,197,94,.08); border-color:rgba(34,197,94,.2); }
        .rxm.lk.on  { background:rgba(34,197,94,.2); border-color:rgba(34,197,94,.45); }
        .rxm.dk  { background:rgba(239,68,68,.08); border-color:rgba(239,68,68,.2); }
        .rxm.dk.on  { background:rgba(239,68,68,.2); border-color:rgba(239,68,68,.45); }

        /* ── Nutrition bar inside board ── */
        .nutri-bar { background:rgba(255,255,255,.2); border-radius:18px; padding:16px 20px; margin-top:24px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .nchip { background:rgba(255,255,255,.22); border-radius:13px; padding:10px 14px; text-align:center; min-width:76px; }
        .nchip-v { font-family:'Fraunces',serif; font-size:1.05rem; font-weight:900; color:#fff; line-height:1; }
        .nchip-l { font-size:0.58rem; font-weight:700; color:rgba(255,255,255,.72); margin-top:3px; text-transform:uppercase; letter-spacing:.5px; }

        /* ── Stickers ── */
        .stkr { position:absolute; pointer-events:none; opacity:.95; filter:drop-shadow(0 7px 16px rgba(0,0,0,.22)); }
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-9px) rotate(3deg)} }
        .s1{animation:float 6s   ease-in-out infinite     ;width:114px;top:-36px ;right:76px ;z-index:5}
        .s2{animation:float 7s   ease-in-out infinite 1s  ;width:90px ;bottom:-30px;left:52px;z-index:3}
        .s3{animation:float 5.5s ease-in-out infinite .5s ;width:106px;top:44%  ;right:-36px;z-index:4}
        .s4{animation:float 8s   ease-in-out infinite 2s  ;width:80px ;bottom:36px;right:116px;z-index:2}
        .s5{animation:float 6.5s ease-in-out infinite 1.5s;width:96px ;top:132px;left:-30px;z-index:3}
        .s6{animation:float 7.5s ease-in-out infinite .8s ;width:122px;bottom:-42px;right:-26px;z-index:6}

        /* ═══════════════════════════════
           RECOMMENDATIONS LIST
        ═══════════════════════════════ */
        .rcard { display:flex; align-items:center; gap:14px; background:rgba(255,255,255,.7); border:1.5px solid rgba(255,140,80,.14); border-radius:18px; padding:14px 16px; transition:all .28s cubic-bezier(.34,1.56,.64,1); }
        .rcard:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(220,90,40,.1); background:rgba(255,255,255,.95); }
        .rcard.liked    { border-color:rgba(34,197,94,.35);  background:rgba(242,255,247,.85); }
        .rcard.disliked { border-color:rgba(239,68,68,.25);  background:rgba(255,245,245,.8); }

        .rico { width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:1.4rem; flex-shrink:0; }

        .rxn-wrap { display:flex; gap:6px; flex-shrink:0; }
        .rxn { width:34px; height:34px; border-radius:50%; border:1.5px solid transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; flex-shrink:0; }
        .rxn:hover { transform:scale(1.18); }
        .rxn:disabled { opacity:.4; cursor:default; transform:none; }
        .rxn.lbtn  { background:rgba(34,197,94,.08); border-color:rgba(34,197,94,.22); }
        .rxn.lbtn.on { background:rgba(34,197,94,.18); border-color:rgba(34,197,94,.45); }
        .rxn.dbtn  { background:rgba(239,68,68,.08); border-color:rgba(239,68,68,.22); }
        .rxn.dbtn.on { background:rgba(239,68,68,.18); border-color:rgba(239,68,68,.45); }

        .vbadge { font-size:0.58rem; font-weight:800; padding:2px 7px; border-radius:8px; text-transform:uppercase; letter-spacing:.5px; }

        /* ── skeleton ── */
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .skel { animation:shimmer 1.6s ease-in-out infinite; background:linear-gradient(90deg,rgba(255,140,80,.08) 25%,rgba(255,140,80,.2) 50%,rgba(255,140,80,.08) 75%); background-size:200% 100%; border-radius:13px; }

        /* ── fade-up ── */
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .35s cubic-bezier(.34,1.56,.64,1) both}

        /* ── tip box ── */
        .tip-box { font-size:0.72rem; color:#8A4828; background:rgba(255,92,26,.06); border:1px solid rgba(255,92,26,.14); border-radius:10px; padding:8px 12px; margin-bottom:14px; line-height:1.55; }

        /* ── favourites row ── */
        .fav-row { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:rgba(255,255,255,.62); border:1px solid rgba(34,197,94,.2); border-radius:14px; }
        .fav-name { font-weight:700; color:#2D1206; font-size:0.86rem; }
        .fav-meta { font-size:0.7rem; color:#8A4828; margin-top:2px; }

        select.ctrl-s { appearance:none; background:rgba(255,255,255,.8); border:1.5px solid rgba(255,120,60,.22); border-radius:11px; padding:6px 28px 6px 12px; font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600; color:#8A4828; cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238A4828'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; }
        select.ctrl-s:focus { outline:none; border-color:rgba(255,92,26,.5); }
      `}</style>

      <div className="pw">

        {/* ── PAGE HEADER ── */}
        <div>
          <div className="ptag">🤖 AI Meal Intelligence</div>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:"clamp(2rem,5.5vw,3rem)", fontWeight:900, color:"#2D1206", lineHeight:1.08, letterSpacing:"-1.5px", marginBottom:6 }}>
            Your{" "}
            <span style={{ fontStyle:"italic", background:"linear-gradient(135deg,#FF8C5A,#FF3D00)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              AI Meal Plans
            </span>
          </h1>
          <p style={{ color:"#8A4828", fontSize:"0.9rem", lineHeight:1.65, maxWidth:600 }}>
            RL-powered 7-day recommendations · rate meals to make the model smarter · prices from the nutrition dataset
          </p>
        </div>

        {/* ── NOT SIGNED IN ── */}
        {!isAuthenticated && (
          <div className="card" style={{ textAlign:"center", padding:"40px 24px" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:12 }}>🔐</div>
            <div style={{ fontFamily:"'Fraunces',serif", fontWeight:800, fontSize:"1.1rem", color:"#2D1206", marginBottom:8 }}>Sign in to get your plan</div>
            <div style={{ color:"#8A4828", fontSize:"0.85rem" }}>Log in to generate a personalised 7-day plan from your profile data.</div>
          </div>
        )}

        {isAuthenticated && (
          <>
            {/* ── CONTROLS ── */}
            <div className="card">
              <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end" }}>

                {/* Goal */}
                <div>
                  <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#B06040", letterSpacing:".6px", textTransform:"uppercase", marginBottom:5 }}>Goal</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {(["weight_loss","maintenance","muscle_gain"] as Goal[]).map(g => (
                      <button key={g} className={`pill${goal===g?" on":""}`} onClick={() => setGoal(g)}>
                        {GOAL_LABELS[g]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diet */}
                <div>
                  <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#B06040", letterSpacing:".6px", textTransform:"uppercase", marginBottom:5 }}>Diet</div>
                  <div style={{ display:"flex", gap:6 }}>
                    {(["veg","non-veg"] as Diet[]).map(d => (
                      <button key={d} className={`pill${diet===d?" on":""}`} onClick={() => setDiet(d)}>
                        {d==="veg"?"🌿 Veg":"🍗 Non-Veg"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity */}
                <div>
                  <div style={{ fontSize:"0.58rem", fontWeight:800, color:"#B06040", letterSpacing:".6px", textTransform:"uppercase", marginBottom:5 }}>Activity</div>
                  <select className="ctrl-s" value={activity} onChange={e => setActivity(e.target.value)}>
                    {[["sedentary","Sedentary"],["light","Light"],["moderate","Moderate"],["very_active","Very Active"],["extra_active","Extra Active"]].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                <button className="gen-btn" disabled={loading} onClick={fetchPlan} style={{ marginLeft:"auto" }}>
                  <RefreshCw size={13} className={loading ? "spinning" : ""} />
                  {loading ? "Generating…" : "✨ Generate AI Plan"}
                </button>
              </div>
            </div>

            {/* ── ERROR ── */}
            {error && (
              <div style={{ background:"rgba(239,68,68,.08)", border:"1.5px solid rgba(239,68,68,.25)", borderRadius:14, padding:"10px 16px", fontSize:13, color:"#DC2626", fontWeight:600 }}>
                ⚠️ {error}
              </div>
            )}

            {/* ── PLANNER BOARD ── */}
            <div className="board">
              <div className="board-title">Weekly Meal Planner</div>

              {/* loading skeletons on the board */}
              {loading ? (
                <div className="dgrid">
                  {DAY_LABELS.map(d => (
                    <div key={d} className={`dcard${d==="Sun"?" sun":""}`}>
                      <div className="day-label">{d}</div>
                      {[1,2,3,4].map(i => <div key={i} className="skel" style={{ height:54 }} />)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dgrid">
                  {DAY_LABELS.map((dayLabel, dayIdx) => {
                    const dayData   = plan?.days[dayIdx];
                    const dayMeals  = dayData?.meals ?? {};
                    const dayCost   = (["breakfast","lunch","snack","dinner"] as MealSlot[])
                      .reduce((s, t) => s + (dayMeals[t]?.price_inr ?? 0), 0);

                    return (
                      <div key={dayLabel} className={`dcard fu${dayLabel==="Sun"?" sun":""}`} style={{ animationDelay:`${dayIdx*0.06}s` }}>
                        <div className="day-label">{dayLabel}</div>
                        {dayCost > 0 && <div className="day-cost">~₹{Math.round(dayCost)} / day</div>}

                        {(["breakfast","lunch","snack","dinner"] as MealSlot[]).map(slot => {
                          const m    = dayMeals[slot] ?? null;
                          const rx   = m ? (reactions[m.dish_name] ?? null) : null;
                          const busy = m ? reactionLoading.has(m.dish_name) : false;

                          return (
                            <div key={slot} className="mslot2">
                              <div className="ms-header">
                                <span className="ms-label">{MEAL_EMOJIS[slot]} {slot}</span>
                                {m?.price_inr && m.price_inr > 0 && (
                                  <span className="ms-price">₹{Math.round(m.price_inr)}</span>
                                )}
                              </div>

                              {m ? (
                                <>
                                  <div className="ms-dish">{m.dish_name}</div>
                                  <div className="ms-meta">🔥{Math.round(m.calories_kcal)} kcal · 💪{m.protein_g.toFixed(1)}g</div>

                                  {/* compact rating */}
                                  <div className="rxn-mini">
                                    <button className={`rxm lk${rx==="liked"?" on":""}`} disabled={busy}
                                      onClick={() => toggleReaction(m!, "liked")} title="Like">
                                      <ThumbsUp size={10} fill={rx==="liked"?"#16A34A":"none"} color={rx==="liked"?"#16A34A":"#8A4828"}/>
                                    </button>
                                    <button className={`rxm dk${rx==="disliked"?" on":""}`} disabled={busy}
                                      onClick={() => toggleReaction(m!, "disliked")} title="Dislike">
                                      <ThumbsDown size={10} fill={rx==="disliked"?"#DC2626":"none"} color={rx==="disliked"?"#DC2626":"#8A4828"}/>
                                    </button>
                                    {rx && (
                                      <span style={{ fontSize:"0.6rem", fontWeight:700, alignSelf:"center", marginLeft:2, color:rx==="liked"?"#16A34A":"#DC2626" }}>
                                        {rx==="liked"?"Liked 👍":"Disliked 👎"}
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="ms-dish empty">Not generated yet</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Nutrition summary inside board */}
              {targets && !loading && (
                <div className="nutri-bar">
                  {[
                    { v:Math.round(targets.calories),          l:"kcal" },
                    { v:`${Math.round(targets.protein_g)}g`,   l:"protein" },
                    { v:`${Math.round(targets.carbs_g)}g`,     l:"carbs" },
                    { v:`${Math.round(targets.fats_g)}g`,      l:"fats" },
                    { v:`${Math.round(targets.fiber_g??0)}g`,  l:"fibre" },
                    { v:`${Math.round(targets.water_ml/100)/10}L`, l:"water" },
                  ].map(n => (
                    <div key={n.l} className="nchip">
                      <div className="nchip-v">{n.v}</div>
                      <div className="nchip-l">{n.l}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Floating food stickers */}
              <img className="stkr s1" src={sticker1} alt="" />
              <img className="stkr s2" src={sticker2} alt="" />
              <img className="stkr s3" src={sticker3} alt="" />
              <img className="stkr s4" src={sticker4} alt="" />
              <img className="stkr s5" src={sticker5} alt="" />
              <img className="stkr s6" src={sticker6} alt="" />
            </div>

            {/* ── AI RECOMMENDATION LIST ── */}
            {allMeals.length > 0 && !loading && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div className="stitle" style={{ margin:0 }}>🍽️ All AI Recommendations</div>
                  <div style={{ display:"flex", gap:8 }}>
                    {likeCnt > 0    && <span style={{ fontSize:"0.7rem", background:"rgba(34,197,94,.1)",  color:"#16A34A", fontWeight:700, padding:"3px 10px", borderRadius:20 }}>👍 {likeCnt}</span>}
                    {dislikeCnt > 0 && <span style={{ fontSize:"0.7rem", background:"rgba(239,68,68,.1)", color:"#DC2626", fontWeight:700, padding:"3px 10px", borderRadius:20 }}>👎 {dislikeCnt}</span>}
                  </div>
                </div>

                <div className="tip-box">
                  💡 <strong>Rate meals to train the AI</strong> — <span style={{ color:"#16A34A" }}>👍 Like</span> dishes you enjoy; <span style={{ color:"#DC2626" }}>👎 Dislike</span> ones you don't. The LinUCB bandit avoids disliked meals in future plans.
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {allMeals.map((m, idx) => {
                    const rx   = reactions[m.dish_name] ?? null;
                    const busy = reactionLoading.has(m.dish_name);
                    const isVeg = m.veg_nonveg?.toLowerCase() === "veg";
                    let cls = "rcard fu";
                    if (rx === "liked")    cls += " liked";
                    if (rx === "disliked") cls += " disliked";

                    return (
                      <div key={m.dish_name} className={cls} style={{ animationDelay:`${idx*0.03}s` }}>

                        <div className="rico" style={{
                          background: isVeg ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.07)",
                          border: `1.5px solid ${isVeg?"rgba(34,197,94,.2)":"rgba(239,68,68,.15)"}`,
                        }}>
                          {MEAL_EMOJIS[m.category] ?? "🍽️"}
                        </div>

                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, color:"#2D1206", fontSize:"0.9rem", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {m.dish_name}
                          </div>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                            <span style={{ fontSize:"0.7rem", color:"#8A4828" }}>🔥 {Math.round(m.calories_kcal)} kcal</span>
                            <span style={{ fontSize:"0.7rem", color:"#8A4828" }}>💪 {m.protein_g.toFixed(1)}g</span>
                            <span style={{ fontSize:"0.7rem", color:"#8A4828" }}>🌾 {m.carbs_g.toFixed(1)}g</span>
                            {m.price_inr && m.price_inr > 0 && (
                              <span style={{ fontSize:"0.7rem", fontWeight:800, color:"#FF6B3D" }}>₹{Math.round(m.price_inr)}</span>
                            )}
                            <span className="vbadge" style={{ background:isVeg?"rgba(34,197,94,.12)":"rgba(239,68,68,.1)", color:isVeg?"#16A34A":"#DC2626" }}>
                              {isVeg?"Veg":"Non-Veg"}
                            </span>
                          </div>
                          <div style={{ fontSize:"0.65rem", color:"#B06040", marginTop:2, textTransform:"capitalize" }}>{m.category}</div>
                        </div>

                        <div className="rxn-wrap">
                          <button className={`rxn lbtn${rx==="liked"?" on":""}`} disabled={busy} title="Like" onClick={() => toggleReaction(m,"liked")}>
                            <ThumbsUp size={14} fill={rx==="liked"?"#16A34A":"none"} color={rx==="liked"?"#16A34A":"#8A4828"}/>
                          </button>
                          <button className={`rxn dbtn${rx==="disliked"?" on":""}`} disabled={busy} title="Dislike — won't appear again" onClick={() => toggleReaction(m,"disliked")}>
                            <ThumbsDown size={14} fill={rx==="disliked"?"#DC2626":"none"} color={rx==="disliked"?"#DC2626":"#8A4828"}/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── LOADING SKELETON (recommendation list) ── */}
            {loading && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[1,2,3,4,5].map(i => <div key={i} className="skel" style={{ height:72 }}/>)}
              </div>
            )}

            {/* ── DAILY TARGETS ── */}
            {targets && !loading && (
              <div className="card">
                <div className="stitle">🔥 Daily Nutrition Targets</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10 }}>
                  {[
                    { label:"Calories", val:`${Math.round(targets.calories)} kcal`, color:"#FF5C1A" },
                    { label:"Protein",  val:`${Math.round(targets.protein_g)} g`,   color:"#22C55E" },
                    { label:"Carbs",    val:`${Math.round(targets.carbs_g)} g`,     color:"#F59E0B" },
                    { label:"Fats",     val:`${Math.round(targets.fats_g)} g`,      color:"#8B5CF6" },
                    { label:"Fibre",    val:`${Math.round(targets.fiber_g??0)} g`,  color:"#10B981" },
                    { label:"Water",    val:`${Math.round(targets.water_ml/100)/10} L`, color:"#06B6D4" },
                  ].map(n => (
                    <div key={n.label} style={{ background:`${n.color}0d`, borderRadius:14, padding:"12px 14px", textAlign:"center" }}>
                      <div style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:"1.2rem", color:n.color }}>{n.val}</div>
                      <div style={{ fontSize:"0.68rem", fontWeight:700, color:"rgba(92,61,46,.55)", marginTop:3, textTransform:"uppercase", letterSpacing:".5px" }}>{n.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── FAVOURITES ── */}
            {likedMeals.length > 0 && !loading && (
              <div className="card">
                <div className="stitle">⭐ Your Favourites</div>
                <p style={{ fontSize:"0.78rem", color:"#8A4828", marginTop:-10, marginBottom:14 }}>
                  Meals you liked — stored in MongoDB, loaded on every visit
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {likedMeals.map(m => (
                    <div key={m.dish_name} className="fav-row">
                      <div>
                        <div className="fav-name">{m.dish_name}</div>
                        <div className="fav-meta">
                          {Math.round(m.calories_kcal)} kcal · {m.protein_g.toFixed(1)}g protein
                          {m.price_inr ? ` · ₹${Math.round(m.price_inr)}` : ""}
                        </div>
                      </div>
                      <ThumbsUp size={14} fill="#16A34A" color="#16A34A"/>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </section>
  );
}
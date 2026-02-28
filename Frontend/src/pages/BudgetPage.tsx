import { useState, useCallback, useEffect, useRef } from "react";
import { mlApi, MealEntry, WeeklyPlan } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Wallet, TrendingUp, PlusCircle, Trash2, ChefHat, BarChart3, ShoppingCart } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────
interface BudgetEntry {
  id: string;
  date: string;          // ISO date string
  dish_name: string;
  price_inr: number;
  category: string;
  calories_kcal: number;
  veg_nonveg: string;
}

interface DailyLog {
  date: string;          // YYYY-MM-DD
  total: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const today   = fmtDate(new Date());
const genId   = () => Math.random().toString(36).slice(2, 9);

function useLocalStorage<T>(key: string, init: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? init; }
    catch { return init; }
  });
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setVal(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [val, set];
}

function buildDailyLogs(entries: BudgetEntry[], days = 30): DailyLog[] {
  const map: Record<string, number> = {};
  for (const e of entries) {
    const d = e.date.slice(0, 10);
    map[d] = (map[d] ?? 0) + e.price_inr;
  }
  const result: DailyLog[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = fmtDate(d);
    result.push({ date: key, total: map[key] ?? 0 });
  }
  return result;
}

function collectAllMeals(plan: WeeklyPlan): MealEntry[] {
  const seen = new Set<string>();
  const meals: MealEntry[] = [];
  for (const day of plan.days) {
    for (const meal of Object.values(day.meals)) {
      if (meal && !seen.has(meal.dish_name)) {
        seen.add(meal.dish_name);
        meals.push(meal);
      }
    }
  }
  return meals;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎",
};

const CAT_COLORS: Record<string, string> = {
  breakfast: "#F59E0B", lunch: "#3B82F6", dinner: "#8B5CF6", snack: "#10B981",
};

// ── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 56, showDots = false }: {
  data: number[]; color: string; height?: number; showDots?: boolean;
}) {
  const w = 400, h = height;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 12) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const gradId = `sg-${color.replace("#", "")}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={`url(#${gradId})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && pts.map((pt, i) => {
        const [x, y] = pt.split(",");
        return data[i] > 0 ? <circle key={i} cx={x} cy={y} r="3" fill={color} /> : null;
      })}
    </svg>
  );
}

// ── Bar chart ────────────────────────────────────────────────────────────────
function WeeklyBarChart({ logs, budget }: { logs: DailyLog[]; budget: number }) {
  const last7 = logs.slice(-7);
  const weekBudget = budget / 4.33;
  const maxVal = Math.max(...last7.map(d => d.total), weekBudget, 1);

  const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80, position: "relative" }}>
      {/* budget line */}
      <div style={{
        position: "absolute", left: 0, right: 0,
        bottom: `${(weekBudget / maxVal) * 70}px`,
        borderTop: "1.5px dashed rgba(239,68,68,.5)",
        zIndex: 2,
      }}>
        <span style={{ position: "absolute", right: 0, top: -14, fontSize: 9, color: "#EF4444", fontWeight: 700 }}>
          ₹{Math.round(weekBudget)} limit
        </span>
      </div>
      {last7.map((d, i) => {
        const pct = (d.total / maxVal) * 70;
        const over = budget > 0 && d.total > weekBudget;
        const isToday = d.date === today;
        const dayName = DAYS[new Date(d.date + "T12:00:00").getDay()];
        return (
          <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}>
            {d.total > 0 && (
              <div style={{ position: "absolute", top: 0, fontSize: 8, fontWeight: 800, color: over ? "#EF4444" : "#16A34A" }}>
                ₹{Math.round(d.total)}
              </div>
            )}
            <div style={{
              width: "100%", height: `${Math.max(pct, 2)}px`,
              marginTop: "auto",
              background: over
                ? "linear-gradient(to top,#EF4444,#FCA5A5)"
                : isToday
                  ? "linear-gradient(to top,#FF6B3D,#FDBA74)"
                  : "rgba(255,107,61,.25)",
              borderRadius: "4px 4px 0 0",
              border: isToday ? "1.5px solid rgba(255,107,61,.5)" : "none",
              transition: "height .5s cubic-bezier(.34,1.56,.64,1)",
              minHeight: d.total > 0 ? 4 : 0,
            }} />
            <div style={{ fontSize: 8, fontWeight: isToday ? 800 : 400, color: isToday ? "#FF6B3D" : "rgba(92,61,46,.4)" }}>
              {dayName}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut ring ────────────────────────────────────────────────────────────────
function BudgetRing({ spent, budget, size = 120 }: { spent: number; budget: number; size?: number }) {
  const r = size * 0.4, stroke = size * 0.14;
  const circ = 2 * Math.PI * r;
  const pct = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const dash = pct * circ;
  const color = pct > 0.9 ? "#EF4444" : pct > 0.7 ? "#F59E0B" : "#22C55E";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s cubic-bezier(.34,1,.64,1)" }}
      />
      <text x={size/2} y={size/2 - 7} textAnchor="middle" fill="#2D1206" fontWeight={900} fontSize={size * 0.16} fontFamily="'DM Sans',sans-serif">
        {Math.round(pct * 100)}%
      </text>
      <text x={size/2} y={size/2 + 10} textAnchor="middle" fill="rgba(92,61,46,.5)" fontSize={size * 0.08} fontWeight={600} fontFamily="'DM Sans',sans-serif">
        used
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function EnhancedBudgetPage() {
  const { token, user, isAuthenticated } = useAuth();

  // ── Persisted state ──────────────────────────────────────────────
  const [wallet, setWallet]         = useLocalStorage<number>("ns_wallet", 3000);
  const [budgetItems, setBudgetItems] = useLocalStorage<BudgetEntry[]>("ns_budget_items", []);
  const [activeTab, setActiveTab]   = useState("overview");

  // ── ML data ──────────────────────────────────────────────────────
  const [weekPlan, setWeekPlan]     = useState<WeeklyPlan | null>(null);
  const [allMeals, setAllMeals]     = useState<MealEntry[]>([]);
  const [priceMap, setPriceMap]     = useState<Record<string, number>>({});
  const [planLoading, setPlanLoading] = useState(false);

  // ── UI ────────────────────────────────────────────────────────────
  const [walletInput, setWalletInput]   = useState(String(wallet));
  const [addedSet, setAddedSet]         = useState<Set<string>>(new Set());
  const [toast, setToast]               = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2500);
  };

  // ── Load ML plan + prices ─────────────────────────────────────────
  const loadPlan = useCallback(async () => {
    if (!token) return;
    setPlanLoading(true);
    try {
      const [planData, priceData] = await Promise.all([
        mlApi.getWeeklyPlan(token),
        mlApi.getMealPrices(),
      ]);
      setWeekPlan(planData);
      setAllMeals(collectAllMeals(planData));
      setPriceMap(priceData.prices ?? {});
    } catch {
      // silently continue with empty meal list
    } finally {
      setPlanLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) loadPlan();
  }, [isAuthenticated, loadPlan]);

  // Keep addedSet in sync with budgetItems (today's)
  useEffect(() => {
    const todayNames = new Set(budgetItems.filter(e => e.date.startsWith(today)).map(e => e.dish_name));
    setAddedSet(todayNames);
  }, [budgetItems]);

  // ── Derived computations ──────────────────────────────────────────
  const dailyLogs = buildDailyLogs(budgetItems, 30);
  const totalSpent = budgetItems.reduce((s, e) => s + e.price_inr, 0);
  const todaySpent = budgetItems.filter(e => e.date.startsWith(today)).reduce((s, e) => s + e.price_inr, 0);
  const remaining  = Math.max(wallet - totalSpent, 0);
  const projected  = (() => {
    const last7 = dailyLogs.slice(-7).filter(d => d.total > 0);
    if (!last7.length) return 0;
    const avg = last7.reduce((s, d) => s + d.total, 0) / last7.length;
    return Math.round(avg * 30);
  })();

  const catBreakdown = (() => {
    const map: Record<string, number> = {};
    for (const e of budgetItems) map[e.category] = (map[e.category] ?? 0) + e.price_inr;
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  })();

  // ── Actions ───────────────────────────────────────────────────────
  const saveWallet = () => {
    const n = Number(walletInput);
    if (n > 0) { setWallet(n); showToast("✅ Wallet saved!"); }
  };

  const addMeal = (meal: MealEntry) => {
    const price = meal.price_inr ?? priceMap[meal.dish_name] ?? 50;
    const entry: BudgetEntry = {
      id: genId(), date: new Date().toISOString(),
      dish_name: meal.dish_name, price_inr: price,
      category: meal.category,
      calories_kcal: meal.calories_kcal,
      veg_nonveg: meal.veg_nonveg,
    };
    setBudgetItems(prev => [...prev, entry]);
    showToast(`🍽️ Added ${meal.dish_name} — ₹${price}`);
  };

  const removeEntry = (id: string) => setBudgetItems(prev => prev.filter(e => e.id !== id));
  const clearAll    = () => { setBudgetItems([]); showToast("🗑️ Budget cleared"); };

  const tabs = [
    { k: "overview",  l: "📊 Overview",    icon: BarChart3 },
    { k: "wallet",    l: "💳 Wallet",       icon: Wallet },
    { k: "meals",     l: "🍽️ AI Meals",    icon: ChefHat },
    { k: "log",       l: "📋 Log",          icon: ShoppingCart },
  ];

  const over = wallet > 0 && totalSpent > wallet;

  // ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'DM Sans',sans-serif",
      background: "linear-gradient(145deg,#FFF5EE 0%,#FFEADB 40%,#FFF0F8 70%,#E8F4FF 100%)",
      minHeight: "100vh", paddingBottom: 80, overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,800;0,900;1,800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input:focus,select:focus{outline:none}

        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes blobAnim{0%,100%{border-radius:60% 40% 55% 45%/50% 60% 40% 50%}50%{border-radius:45% 55% 60% 40%}}
        @keyframes popIn{0%{transform:translate(-50%,20px);opacity:0}12%{transform:translate(-50%,0);opacity:1}88%{opacity:1}100%{opacity:0}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

        .card {
          background:rgba(255,255,255,.78);
          backdrop-filter:blur(20px);
          border:1px solid rgba(255,200,160,.3);
          border-radius:22px;
          padding:20px;
          box-shadow:0 4px 22px rgba(180,90,40,.06);
        }

        .tab-btn {
          font-family:'DM Sans',sans-serif; font-size:12px; font-weight:700;
          border-radius:24px; border:none; padding:8px 16px; cursor:pointer;
          white-space:nowrap; transition:all .2s;
        }
        .tab-btn.on  { background:#FF6B3D; color:#fff; box-shadow:0 4px 14px rgba(255,107,61,.35); }
        .tab-btn.off { background:rgba(255,255,255,.65); color:#7A3D2A; }
        .tab-btn.off:hover { background:rgba(255,255,255,.9); transform:translateY(-1px); }

        .stat-card {
          border-radius:18px; padding:15px 16px;
          background:rgba(255,255,255,.72); border:1px solid rgba(255,200,160,.25);
          display:flex; flex-direction:column; gap:3px;
          transition:transform .22s,box-shadow .22s;
        }
        .stat-card:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(180,90,40,.13); }

        .wallet-input {
          font-family:'Fraunces',serif; font-size:2.5rem; font-weight:900;
          background:none; border:none; border-bottom:3px solid rgba(255,107,61,.35);
          color:#2D1206; text-align:right; width:100%; padding:4px 0;
          transition:border-color .2s;
        }
        .wallet-input:focus { border-color:#FF6B3D; }

        .meal-card {
          display:flex; align-items:center; gap:12px;
          background:rgba(255,255,255,.72); border:1.5px solid rgba(255,140,80,.14);
          border-radius:16px; padding:12px 14px;
          transition:all .25s cubic-bezier(.34,1.56,.64,1);
        }
        .meal-card:hover { transform:translateY(-2px); box-shadow:0 10px 26px rgba(220,90,40,.1); background:rgba(255,255,255,.95); }
        .meal-card.added { border-color:rgba(34,197,94,.35); background:rgba(242,255,247,.85); }

        .add-btn {
          border:none; border-radius:24px; cursor:pointer; font-family:'DM Sans',sans-serif;
          font-size:11px; font-weight:800; padding:6px 14px; white-space:nowrap;
          transition:all .22s cubic-bezier(.34,1.56,.64,1);
        }
        .add-btn.idle    { background:linear-gradient(135deg,#FF8C5A,#FF5C1A); color:#fff; box-shadow:0 3px 10px rgba(255,92,26,.28); }
        .add-btn.idle:hover { transform:scale(1.07); box-shadow:0 6px 16px rgba(255,92,26,.4); }
        .add-btn.done    { background:rgba(34,197,94,.12); color:#16A34A; border:1.5px solid rgba(34,197,94,.3); cursor:default; }

        .log-row {
          display:flex; align-items:center; gap:10px;
          padding:9px 12px; border-radius:13px;
          background:rgba(255,248,240,.9); border:1px solid rgba(255,200,160,.15);
          transition:all .18s;
        }
        .log-row:hover { background:rgba(255,237,220,.95); border-color:rgba(255,107,61,.2); }

        .del-btn {
          width:26px; height:26px; border-radius:50%; border:none; background:none;
          display:flex;align-items:center;justify-content:center;
          cursor:pointer; color:rgba(196,82,46,.4); transition:all .18s; flex-shrink:0;
        }
        .del-btn:hover { background:rgba(196,82,46,.1); color:#C4522E; transform:scale(1.2); }

        .prog-track { height:6px; background:rgba(0,0,0,.055); border-radius:6px; overflow:hidden; }
        .prog-fill  { height:100%; border-radius:6px; transition:width 1s cubic-bezier(.22,1,.36,1); }

        .ptag { display:inline-block; background:rgba(255,92,26,.1); border:1.5px solid rgba(255,92,26,.22); color:#CC4A10; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; padding:4px 14px; border-radius:30px; margin-bottom:10px; }

        .skeleton { animation:shimmer 1.6s ease-in-out infinite; background:linear-gradient(90deg,rgba(255,140,80,.09) 25%,rgba(255,140,80,.2) 50%,rgba(255,140,80,.09) 75%); background-size:200% 100%; border-radius:12px; }

        .toast { position:fixed; bottom:28px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg,#2D1206,#5C3D2E); color:#fff; padding:10px 22px; border-radius:24px; font-size:13px; font-weight:700; box-shadow:0 6px 22px rgba(45,18,6,.3); z-index:9999; animation:popIn 2.5s cubic-bezier(.22,1,.36,1) both; pointer-events:none; white-space:nowrap; }

        .page-wrap { max-width:860px; margin:0 auto; padding:28px 16px 0; }
        .section-title { font-family:'Fraunces',serif; font-size:1rem; font-weight:900; color:#2D1206; margin:0 0 14px; }
        .meta-text { font-size:0.72rem; color:rgba(92,61,46,.55); }
        .slab { font-size:9px; font-weight:800; color:rgba(92,61,46,.4); text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; }
      `}</style>

      {/* Background blobs */}
      <div style={{ position:"fixed", width:360, height:360, top:-80, right:-60, borderRadius:"60% 40%", background:"rgba(255,107,61,.04)", animation:"blobAnim 14s ease-in-out infinite", pointerEvents:"none", zIndex:0 }}/>
      <div style={{ position:"fixed", width:240, height:240, bottom:-60, left:-40, borderRadius:"45% 55%", background:"rgba(78,205,196,.04)", animation:"blobAnim 14s ease-in-out infinite 4s", pointerEvents:"none", zIndex:0 }}/>

      <div className="page-wrap" style={{ position:"relative", zIndex:1 }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 24, animation:"fadeUp .45s cubic-bezier(.22,1,.36,1)" }}>
          <div className="ptag">🤖 AI Budget Intelligence</div>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:"clamp(2rem,6vw,3rem)", fontWeight:900, color:"#2D1206", lineHeight:1.06, letterSpacing:"-1.5px", marginBottom:6 }}>
            Smart{" "}
            <span style={{ fontStyle:"italic", background:"linear-gradient(135deg,#FF8C5A,#FF3D00)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              Budget
            </span>
            {" "}Tracker
          </h1>
          <p className="meta-text" style={{ fontSize:"0.9rem", lineHeight:1.6 }}>
            Set your wallet · Add AI-recommended meals with real prices · Track your spend trends
          </p>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:20, animation:"fadeUp .45s .06s cubic-bezier(.22,1,.36,1) both" }}>
          {[
            { emoji:"💳", val:`₹${wallet.toLocaleString()}`, sub:"Monthly wallet",        color:"#6366F1", glow:"rgba(99,102,241,.08)" },
            { emoji:"💸", val:`₹${Math.round(totalSpent)}`,  sub:"Total spent",           color:over?"#EF4444":"#FF6B3D", glow:`rgba(255,107,61,.08)` },
            { emoji:"🟢", val:`₹${Math.round(remaining)}`,   sub:"Remaining",             color:"#22C55E", glow:"rgba(34,197,94,.08)" },
            { emoji:"📈", val:`₹${projected}`,               sub:"Projected (30 days)",   color:"#F59E0B", glow:"rgba(245,158,11,.08)" },
            { emoji:"🍽️", val:`₹${Math.round(todaySpent)}`, sub:"Today's spend",         color:"#8B5CF6", glow:"rgba(139,92,246,.08)" },
          ].map(s => (
            <div key={s.sub} className="stat-card" style={{ background:`linear-gradient(135deg,rgba(255,255,255,.85),${s.glow})` }}>
              <div style={{ fontSize:20 }}>{s.emoji}</div>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:"1.55rem", fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
              <div className="meta-text" style={{ fontWeight:600 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap", animation:"fadeUp .45s .1s cubic-bezier(.22,1,.36,1) both" }}>
          {tabs.map(t => (
            <button key={t.k} className={`tab-btn ${activeTab===t.k?"on":"off"}`} onClick={() => setActiveTab(t.k)}>
              {t.l}
            </button>
          ))}
        </div>

        {/* ════════════════════ OVERVIEW ════════════════════ */}
        {activeTab === "overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeUp .35s cubic-bezier(.22,1,.36,1)" }}>

            {/* Budget ring + sparkline */}
            <div style={{ display:"grid", gridTemplateColumns:"180px 1fr", gap:16 }}>
              <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                <div className="slab">Budget Used</div>
                <BudgetRing spent={totalSpent} budget={wallet} size={130} />
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:"1.5rem", fontWeight:900, color: over?"#EF4444":"#2D1206" }}>
                    ₹{Math.round(totalSpent)}
                  </div>
                  <div className="meta-text">of ₹{wallet} wallet</div>
                  {over && <div style={{ fontSize:11, fontWeight:800, color:"#EF4444", marginTop:4 }}>⚠️ Over budget!</div>}
                </div>
              </div>

              <div className="card">
                <div className="slab">30-Day Spend Trend</div>
                <Sparkline data={dailyLogs.map(d => d.total)} color="#FF6B3D" height={90} />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                  <span className="meta-text">30 days ago</span>
                  <span className="meta-text">Today — ₹{Math.round(todaySpent)}</span>
                </div>
              </div>
            </div>

            {/* Weekly bar chart */}
            <div className="card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                <div className="slab" style={{ margin:0 }}>Last 7 Days vs Daily Budget</div>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(92,61,46,.5)" }}>
                  Weekly budget: <strong style={{ color:"#FF6B3D" }}>₹{Math.round(wallet / 4.33)}</strong>
                </div>
              </div>
              <WeeklyBarChart logs={dailyLogs} budget={wallet} />
              <div style={{ display:"flex", gap:16, marginTop:10 }}>
                {[{c:"#FF6B3D",l:"Daily Spend"},{c:"rgba(239,68,68,.5)",l:"Over Budget"}].map(x => (
                  <div key={x.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:x.c }}/>
                    <span className="meta-text">{x.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category & Projection */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div className="card">
                <div className="slab">Category Breakdown</div>
                {catBreakdown.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"20px 0", color:"rgba(92,61,46,.3)", fontSize:13 }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>📊</div>
                    No data yet — add meals!
                  </div>
                ) : catBreakdown.map(([cat, amt]) => {
                  const pct = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
                  const col = CAT_COLORS[cat] ?? "#FF6B3D";
                  return (
                    <div key={cat} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:"#2D1206" }}>
                          {MEAL_ICONS[cat] ?? "🍽️"} {cat}
                        </span>
                        <span style={{ fontSize:12, fontWeight:800, color:col }}>₹{Math.round(amt)}</span>
                      </div>
                      <div className="prog-track">
                        <div className="prog-fill" style={{ width:`${pct}%`, background:col }}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card">
                <div className="slab">Projections & Insights</div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {[
                    { label:"Projected Month",   val:`₹${projected}`,                  color:projected > wallet ? "#EF4444":"#22C55E", note:projected > wallet ? "⚠️ Over budget" : "✓ On track" },
                    { label:"Daily Average",      val:`₹${budgetItems.length > 0 ? Math.round(totalSpent / Math.max(dailyLogs.filter(d=>d.total>0).length, 1)) : 0}`, color:"#FF6B3D" },
                    { label:"Best Day Savings",   val:`₹${Math.max(0, Math.round(wallet/30 - Math.min(...dailyLogs.map(d=>d.total).filter(v=>v>0), wallet/30)))}/day`, color:"#22C55E" },
                    { label:"Meals Tracked",      val:budgetItems.length,               color:"#8B5CF6" },
                  ].map(s => (
                    <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingBottom:10, borderBottom:"1px solid rgba(230,150,100,.1)" }}>
                      <span style={{ fontSize:12, fontWeight:600, color:"rgba(92,61,46,.7)" }}>{s.label}</span>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <span style={{ fontFamily:"'Fraunces',serif", fontSize:"1.1rem", fontWeight:900, color:s.color }}>{s.val}</span>
                        {"note" in s && <span style={{ fontSize:9, fontWeight:800, color:s.color, background:`${s.color}18`, padding:"1px 6px", borderRadius:6 }}>{s.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════ WALLET ════════════════════ */}
        {activeTab === "wallet" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeUp .35s cubic-bezier(.22,1,.36,1)" }}>

            <div className="card">
              <div className="section-title">💳 Set Your Monthly Budget</div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                <span style={{ fontFamily:"'Fraunces',serif", fontSize:"2.5rem", fontWeight:900, color:"rgba(92,61,46,.4)" }}>₹</span>
                <input
                  className="wallet-input"
                  type="number"
                  value={walletInput}
                  onChange={e => setWalletInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveWallet()}
                  placeholder="3000"
                />
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
                {[1500, 2500, 3000, 5000].map(n => (
                  <button key={n}
                    style={{ border:`1.5px solid ${wallet===n?"#FF6B3D":"rgba(255,107,61,.2)"}`, background:wallet===n?"#FF6B3D":"transparent", color:wallet===n?"#fff":"#8A4828", borderRadius:12, padding:"6px 14px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .2s" }}
                    onClick={() => { setWallet(n); setWalletInput(String(n)); showToast(`✅ Wallet set to ₹${n}`); }}
                  >
                    ₹{n.toLocaleString()}
                  </button>
                ))}
              </div>
              <button
                onClick={saveWallet}
                style={{ width:"100%", padding:"12px 0", background:"linear-gradient(135deg,#FF8C5A,#FF5C1A)", border:"none", borderRadius:14, color:"#fff", fontFamily:"'DM Sans',sans-serif", fontWeight:800, fontSize:"0.9rem", cursor:"pointer", boxShadow:"0 5px 16px rgba(255,92,26,.35)", transition:"all .2s" }}
              >
                💾 Save Wallet
              </button>
            </div>

            {/* Budget breakdown */}
            <div className="card">
              <div className="section-title">📊 Budget Breakdown</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { label:"Monthly Wallet",    val:wallet,                  color:"#6366F1", max:wallet },
                  { label:"Total Spent",       val:totalSpent,              color:over?"#EF4444":"#FF6B3D", max:wallet },
                  { label:"Today's Spend",     val:todaySpent,              color:"#F59E0B", max:wallet/30 },
                  { label:"Remaining",         val:remaining,               color:"#22C55E", max:wallet },
                  { label:"Projected Month",   val:projected,               color:projected>wallet?"#EF4444":"#8B5CF6", max:wallet*1.2 },
                ].map(b => {
                  const pct = Math.min((b.val/b.max)*100, 100);
                  return (
                    <div key={b.label}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:"#2D1206" }}>{b.label}</span>
                        <span style={{ fontWeight:800, color:b.color, fontSize:13 }}>₹{Math.round(b.val).toLocaleString()}</span>
                      </div>
                      <div className="prog-track">
                        <div className="prog-fill" style={{ width:`${pct}%`, background:b.color }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════ AI MEALS ════════════════════ */}
        {activeTab === "meals" && (
          <div style={{ animation:"fadeUp .35s cubic-bezier(.22,1,.36,1)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div>
                <div className="section-title" style={{ margin:0 }}>🍽️ AI Recommended Meals</div>
                <div className="meta-text">Prices from the nutrition dataset · Click "Add" to track in your budget</div>
              </div>
              <button onClick={loadPlan} disabled={planLoading} style={{ border:"none", background:planLoading?"rgba(255,92,26,.2)":"linear-gradient(135deg,#FF8C5A,#FF5C1A)", color:"#fff", borderRadius:12, padding:"7px 16px", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:12, cursor:planLoading?"default":"pointer", boxShadow:"0 3px 12px rgba(255,92,26,.3)" }}>
                {planLoading ? "Loading…" : "🔄 Refresh Plan"}
              </button>
            </div>

            {planLoading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="skeleton" style={{ height:68 }}/>
                ))}
              </div>
            ) : allMeals.length === 0 ? (
              <div className="card" style={{ textAlign:"center", padding:"40px 24px" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🍽️</div>
                <div style={{ fontFamily:"'Fraunces',serif", fontWeight:800, fontSize:"1.1rem", color:"#2D1206", marginBottom:8 }}>
                  {isAuthenticated ? "No meals loaded yet" : "Sign in to see AI meal recommendations"}
                </div>
                {isAuthenticated && (
                  <button onClick={loadPlan} style={{ marginTop:8, padding:"9px 22px", background:"linear-gradient(135deg,#FF8C5A,#FF5C1A)", border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                    Generate Plan
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {allMeals.map((meal, idx) => {
                  const price = meal.price_inr ?? priceMap[meal.dish_name] ?? 0;
                  const isVeg = meal.veg_nonveg?.toLowerCase() === "veg";
                  const isAdded = addedSet.has(meal.dish_name);
                  return (
                    <div
                      key={meal.dish_name}
                      className={`meal-card${isAdded ? " added" : ""}`}
                      style={{ animationDelay:`${idx * 0.03}s` }}
                    >
                      {/* Icon */}
                      <div style={{
                        width:46, height:46, borderRadius:13, flexShrink:0,
                        background: isVeg ? "rgba(34,197,94,.09)" : "rgba(239,68,68,.07)",
                        border: `1.5px solid ${isVeg ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.15)"}`,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem",
                      }}>
                        {MEAL_ICONS[meal.category] ?? "🍽️"}
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, color:"#2D1206", fontSize:"0.88rem", marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {meal.dish_name}
                        </div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                          <span style={{ fontSize:"0.7rem", color:"#8A4828" }}>🔥 {Math.round(meal.calories_kcal)} kcal</span>
                          <span style={{ fontSize:"0.7rem", color:"#8A4828" }}>💪 {meal.protein_g.toFixed(1)}g</span>
                          <span style={{ fontSize:"0.65rem", fontWeight:800, padding:"2px 7px", borderRadius:8, textTransform:"uppercase", letterSpacing:.4, background:isVeg?"rgba(34,197,94,.12)":"rgba(239,68,68,.1)", color:isVeg?"#16A34A":"#DC2626" }}>
                            {isVeg ? "Veg":"Non-Veg"}
                          </span>
                        </div>
                        <div style={{ fontSize:"0.65rem", color:"#B06040", marginTop:1, textTransform:"capitalize" }}>
                          {meal.category}
                        </div>
                      </div>

                      {/* Price + Add */}
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                        <div style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:"1.2rem", color:"#FF6B3D" }}>
                          {price > 0 ? `₹${Math.round(price)}` : "~₹–"}
                        </div>
                        <button
                          className={`add-btn ${isAdded ? "done" : "idle"}`}
                          onClick={() => !isAdded && addMeal(meal)}
                        >
                          {isAdded ? "✅ Added" : <><PlusCircle size={12} style={{ display:"inline", marginRight:3 }}/>Add</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ LOG ════════════════════ */}
        {activeTab === "log" && (
          <div style={{ animation:"fadeUp .35s cubic-bezier(.22,1,.36,1)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div className="section-title" style={{ margin:0 }}>📋 Spend Log</div>
                <div className="meta-text">{budgetItems.length} meals tracked · ₹{Math.round(totalSpent)} total</div>
              </div>
              {budgetItems.length > 0 && (
                <button onClick={clearAll} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"1px solid rgba(196,82,46,.2)", color:"rgba(196,82,46,.6)", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  <Trash2 size={12}/> Clear All
                </button>
              )}
            </div>

            {budgetItems.length === 0 ? (
              <div className="card" style={{ textAlign:"center", padding:"40px 24px" }}>
                <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
                <div style={{ fontFamily:"'Fraunces',serif", fontWeight:800, fontSize:"1.05rem", color:"#2D1206", marginBottom:6 }}>No meals tracked yet</div>
                <div className="meta-text" style={{ fontSize:"0.82rem" }}>Go to "🍽️ AI Meals" and click "+ Add" to start tracking.</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[...budgetItems].reverse().map((entry, idx) => {
                  const isVeg = entry.veg_nonveg?.toLowerCase() === "veg";
                  const entryDate = new Date(entry.date);
                  const dateStr = entry.date.startsWith(today) ? "Today" : entryDate.toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
                  return (
                    <div key={entry.id} className="log-row" style={{ animationDelay:`${idx * 0.025}s` }}>
                      <div style={{ width:38, height:38, borderRadius:11, background:isVeg?"rgba(34,197,94,.1)":"rgba(239,68,68,.07)", border:`1.5px solid ${isVeg?"rgba(34,197,94,.2)":"rgba(239,68,68,.15)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", flexShrink:0 }}>
                        {MEAL_ICONS[entry.category] ?? "🍽️"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, color:"#2D1206", fontSize:"0.86rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {entry.dish_name}
                        </div>
                        <div className="meta-text">
                          {dateStr} &nbsp;·&nbsp; {Math.round(entry.calories_kcal)} kcal &nbsp;·&nbsp; <span style={{ textTransform:"capitalize" }}>{entry.category}</span>
                        </div>
                      </div>
                      <div style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:"1.1rem", color:"#FF6B3D", flexShrink:0 }}>
                        ₹{Math.round(entry.price_inr)}
                      </div>
                      <button className="del-btn" onClick={() => removeEntry(entry.id)}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  );
                })}

                {/* Daily summary at bottom */}
                <div className="card" style={{ marginTop:8 }}>
                  <div className="slab">Daily Spend (last 7 days)</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                    {dailyLogs.slice(-7).reverse().map(d => {
                      const isToday = d.date === today;
                      const pct = wallet > 0 ? Math.min((d.total / (wallet / 30)) * 100, 100) : 0;
                      return d.total > 0 ? (
                        <div key={d.date}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontSize:12, fontWeight:isToday?700:500, color:isToday?"#FF6B3D":"#5C3D2E" }}>
                              {isToday ? "Today" : new Date(d.date + "T12:00:00").toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short"})}
                            </span>
                            <span style={{ fontWeight:800, fontSize:12, color:pct>100?"#EF4444":"#FF6B3D" }}>₹{Math.round(d.total)}</span>
                          </div>
                          <div className="prog-track">
                            <div className="prog-fill" style={{ width:`${pct}%`, background:pct>100?"#EF4444":"linear-gradient(90deg,#FF8C5A,#FF5C1A)" }}/>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
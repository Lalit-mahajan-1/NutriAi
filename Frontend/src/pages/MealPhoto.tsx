import { useState, useEffect } from "react";
import { mlApi, MealScanResult } from "@/lib/api";

interface NutritionData {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  iron_mg: number;
  calcium_mg: number;
  vitamin_c_mg: number;
  sodium_mg: number;
  folate_ug: number;
}

// Recommended daily intake (used as the 100% mark on the progress bars).
const dailyTarget: NutritionData = {
  calories_kcal: 2000,
  protein_g: 60,
  carbs_g: 300,
  fat_g: 70,
  fiber_g: 30,
  iron_mg: 18,
  calcium_mg: 1000,
  vitamin_c_mg: 40,
  sodium_mg: 2300,
  folate_ug: 400,
};

// A common Indian plate — seeded when a photo is analysed. Users edit/add/remove.
const DEFAULT_PLATE = ["Idli", "Sambar", "Rajma", "Rice", "Curd"];

export default function MealPhoto() {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [scan, setScan] = useState<MealScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [allDishes, setAllDishes] = useState<string[]>([]);

  // Load the full dish list for the add-item autocomplete.
  useEffect(() => {
    mlApi.getMealPrices()
      .then(d => setAllDishes(Object.keys(d.prices ?? {})))
      .catch(() => { /* autocomplete is optional */ });
  }, []);

  const handleUpload = (file: File) => {
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setDetectedItems([]);
    setScan(null);
    setError(null);
    setNote(null);
  };

  // Compute real nutrition for a list of items via the ML backend (local dataset).
  const computeNutrition = async (items: string[]) => {
    const clean = items.map(i => i.trim()).filter(Boolean);
    if (!clean.length) { setScan(null); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await mlApi.mealScan(clean);
      setScan(result);
      if (result.count === 0) {
        setError("Couldn't match any of those items in the food database. Try names like 'Idli', 'Rajma' or 'Paneer'.");
      }
    } catch {
      setError("Nutrition service unreachable — is the ML backend running on :8000?");
      setScan(null);
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async () => {
    setError(null);
    setNote(null);
    // Try real AI photo detection first.
    if (imageFile) {
      setLoading(true);
      try {
        const res = await mlApi.detectMeal(imageFile);
        if (res.detection_available && res.detected.length) {
          setDetectedItems(res.detected);
          setScan(res);
          if (res.unmatched.length && res.count === 0) {
            setError("Detected some items but couldn't match them to the food database — edit the names below.");
          }
          setLoading(false);
          return;
        }
        // No key configured, or model found no food → fall back to a sample plate.
        setNote(
          res.detection_available
            ? "Couldn't recognise dishes in this photo — showing a sample plate you can edit."
            : "AI photo detection isn't enabled on the server (no API key). Showing a sample plate — edit the items to match your meal.",
        );
      } catch {
        setNote("Photo detection unavailable right now — showing a sample plate you can edit.");
      } finally {
        setLoading(false);
      }
    }
    // Fallback path: seed a common plate and compute real nutrition for it.
    const items = detectedItems.length ? detectedItems : DEFAULT_PLATE;
    setDetectedItems(items);
    await computeNutrition(items);
  };

  const addItem = () => {
    const n = newItem.trim();
    if (!n) return;
    const next = [...detectedItems, n];
    setDetectedItems(next);
    setNewItem("");
    computeNutrition(next);
  };

  const removeItem = (index: number) => {
    const next = detectedItems.filter((_, i) => i !== index);
    setDetectedItems(next);
    computeNutrition(next);
  };

  const nutrition = scan?.totals ?? null;

  const Progress = ({
    label, value, max, color,
  }: { label: string; value: number; max: number; color: string }) => {
    const percent = Math.min((value / max) * 100, 100);
    return (
      <div className="progressWrap">
        <div className="progressTop">
          <span>{label}</span>
          <span>{value} / {max} <span style={{ opacity: .5 }}>({Math.round(percent)}% of day)</span></span>
        </div>
        <div className="progressBar">
          <div className="progressFill" style={{ width: `${percent}%`, background: color }} />
        </div>
      </div>
    );
  };

  return (
    <section className="meal-section">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Fraunces:wght@800;900&family=DM+Sans:wght@400;600;700&display=swap');

.meal-section {
min-height:100vh;
  padding-top:120px;
padding-bottom:80px;
  background:linear-gradient(160deg,#FFF0E8 0%,#FFE4D0 40%,#FFF8F3 70%,#FFEADB 100%);
}

/* ───────── Title ───────── */
.title {
  font-family:'Great Vibes',cursive;
  font-size:clamp(3rem,5vw,4.5rem);
  text-align:center;
  margin-bottom:10px;
  color:#3A1E0E;
}
.subtitle {
  text-align:center;
  color:#8A4828;
  font-family:'DM Sans',sans-serif;
  font-size:0.95rem;
  max-width:620px;
  margin:0 auto 60px;
  line-height:1.6;
}

/* ───────── Layout ───────── */
.mealContainer {
  max-width:1200px;
  margin:0 auto;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:50px;
  padding:0 16px;
}

@media(max-width:900px){
  .mealContainer{ grid-template-columns:1fr; }
}

/* ───────── Glossy Gradient Frame ───────── */
.card {
  position:relative;
  padding:40px;
  border-radius:28px;
  background:white;
  overflow:hidden;
}

.card::before {
  content:"";
  position:absolute;
  inset:-3px;
  border-radius:30px;
  background:linear-gradient(135deg,#ce5c37,#ff9b73,#ce5c37);
  z-index:-1;
  animation:gradientMove 6s ease infinite;
  background-size:300% 300%;
}

@keyframes gradientMove {
  0%{background-position:0% 50%}
  50%{background-position:100% 50%}
  100%{background-position:0% 50%}
}

.card::after{
  content:"";
  position:absolute;
  top:0; left:0; right:0;
  height:40%;
  background:linear-gradient(to bottom, rgba(255,255,255,.6), transparent);
  border-radius:28px 28px 0 0;
  pointer-events:none;
}

/* ───────── Upload Button ───────── */
.uploadBtn {
  padding:16px 42px;
  border-radius:60px;
  background:linear-gradient(135deg,#ce5c37,#ff8a5e);
  border:none;
  color:white;
  font-weight:700;
  font-size:15px;
  cursor:pointer;
  transition:.3s ease;
  box-shadow:0 12px 30px rgba(206,92,55,.4);
}
.uploadBtn:hover { transform:translateY(-4px) scale(1.05); box-shadow:0 20px 40px rgba(206,92,55,.5); }
.uploadBtn:active { transform:scale(.95); }
.uploadBtn:disabled { opacity:.6; cursor:default; transform:none; box-shadow:none; }

/* ───────── Image ───────── */
.uploadedImage {
  width:100%;
  aspect-ratio:1/1;
  object-fit:cover;
  border-radius:20px;
  margin-bottom:25px;
  animation:fadeInScale .6s cubic-bezier(.22,1,.36,1);
  box-shadow:0 20px 50px rgba(0,0,0,.15);
}
@keyframes fadeInScale { from{opacity:0; transform:scale(.9);} to{opacity:1; transform:scale(1);} }

/* ───────── Items Grid ───────── */
.itemsGrid { display:flex; flex-wrap:wrap; gap:12px; margin-top:15px; }

.itemTag {
  display:flex; align-items:center; gap:8px;
  padding:10px 14px;
  border-radius:18px;
  background:linear-gradient(135deg,#fff3ed,#ffe2d6);
  border:1px solid rgba(206,92,55,.25);
  font-weight:600;
  transition:.25s ease;
}
.itemTag:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(206,92,55,.3); }
.itemTag .tagName { cursor:pointer; }
.itemTag .resolved { font-size:11px; color:#a06a4e; font-weight:500; }
.itemTag .rm {
  border:none; background:rgba(206,92,55,.14); color:#ce5c37;
  width:20px; height:20px; border-radius:50%; cursor:pointer; font-weight:800;
  display:flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0;
}
.itemTag .rm:hover { background:#ce5c37; color:#fff; }
.itemTag input { border:none; background:transparent; font-weight:600; outline:none; width:120px; font-family:'DM Sans',sans-serif; }

.addRow { display:flex; gap:10px; margin-top:18px; }
.addRow input {
  flex:1; padding:11px 14px; border-radius:14px;
  border:1.5px solid rgba(206,92,55,.25); background:#fff8f3;
  font-family:'DM Sans',sans-serif; font-size:14px; outline:none;
}
.addRow input:focus { border-color:#ce5c37; }
.addRow button {
  border:none; border-radius:14px; padding:0 18px; cursor:pointer;
  background:linear-gradient(135deg,#ce5c37,#ff8a5e); color:#fff; font-weight:800; font-size:14px;
}

.notice { margin-top:14px; font-size:13px; font-weight:600; padding:9px 13px; border-radius:12px; }
.notice.err  { background:rgba(220,38,38,.08);  color:#b91c1c; border:1px solid rgba(220,38,38,.2); }
.notice.warn { background:rgba(245,158,11,.1);  color:#b45309; border:1px solid rgba(245,158,11,.25); }

.hint { font-size:12.5px; color:#a06a4e; margin-top:12px; line-height:1.5; }

/* ───────── Results Card ───────── */
.resultsCard {
  margin-top:70px;
  max-width:950px;
  margin-left:auto; margin-right:auto;
  background:white;
  border-radius:28px;
  padding:45px;
  box-shadow:0 30px 70px rgba(0,0,0,.08);
  animation:fadeInScale .6s ease;
}
.resultsHead { display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:10px; margin-bottom:30px; }
.resultsHead .kcalBig { font-family:'Fraunces',serif; font-size:1.4rem; color:#ce5c37; font-weight:900; }

.progressWrap { margin-bottom:22px; }
.progressTop { display:flex; justify-content:space-between; font-size:14px; margin-bottom:8px; font-weight:600; }
.progressBar { height:12px; background:#f1f1f1; border-radius:30px; overflow:hidden; }
.progressFill { height:100%; border-radius:30px; transition:width .8s cubic-bezier(.22,1,.36,1); }
`}</style>

      <div className="title">Scan Your Meal 🍽️</div>
      <div className="subtitle">
        Upload a photo of your plate — AI detects the dishes, then you can edit them. We compute the real
        nutrition for each dish from our Indian-food database and show how it stacks up against your daily needs.
      </div>

      <div className="mealContainer">
        <div className="card">
          {!preview ? (
            <>
              <input
                id="mealUpload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => e.target.files && e.target.files[0] && handleUpload(e.target.files[0])}
              />
              <button className="uploadBtn" onClick={() => document.getElementById("mealUpload")?.click()}>
                Upload Meal Photo
              </button>
              <p className="hint">No photo handy? You can still add items manually on the right.</p>
            </>
          ) : (
            <>
              <img src={preview} className="uploadedImage" alt="uploaded meal" />
              <button className="uploadBtn" onClick={analyzeImage} disabled={loading}>
                {loading ? "Analyzing…" : "Analyze Meal"}
              </button>
            </>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontFamily: "'Fraunces',serif" }}>Detected Items</h2>

          {detectedItems.length === 0 && (
            <p className="hint">Upload a photo and hit <strong>Analyze</strong>, or add items below.</p>
          )}

          <div className="itemsGrid">
            {detectedItems.map((item, index) => {
              const resolved = scan?.matched.find(m => m.query === item)?.dish_name;
              return (
                <span key={index} className="itemTag">
                  {editingIndex === index ? (
                    <input
                      value={item}
                      autoFocus
                      onBlur={() => { setEditingIndex(null); computeNutrition(detectedItems); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { setEditingIndex(null); computeNutrition(detectedItems); } }}
                      onChange={(e) => {
                        const updated = [...detectedItems];
                        updated[index] = e.target.value;
                        setDetectedItems(updated);
                      }}
                    />
                  ) : (
                    <span className="tagName" onClick={() => setEditingIndex(index)}>
                      {item}
                      {resolved && resolved.toLowerCase() !== item.toLowerCase() && (
                        <span className="resolved"> → {resolved}</span>
                      )}
                    </span>
                  )}
                  <button className="rm" onClick={() => removeItem(index)} title="Remove">×</button>
                </span>
              );
            })}
          </div>

          <div className="addRow">
            <input
              list="dishList"
              placeholder="Add an item (e.g. Paneer)…"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
            />
            <button onClick={addItem}>Add</button>
            <datalist id="dishList">
              {allDishes.slice(0, 1000).map((d) => <option key={d} value={d} />)}
            </datalist>
          </div>

          {error && <div className="notice err">⚠ {error}</div>}
          {note && <div className="notice warn">ℹ️ {note}</div>}
          {scan && scan.unmatched.length > 0 && (
            <div className="notice warn">
              Not found in database: {scan.unmatched.join(", ")}
            </div>
          )}
        </div>
      </div>

      {nutrition && (
        <div className="resultsCard">
          <div className="resultsHead">
            <h2 style={{ fontFamily: "'Fraunces',serif" }}>Total Nutrition</h2>
            <span className="kcalBig">{Math.round(nutrition.calories_kcal)} kcal · {scan?.count} item{scan?.count === 1 ? "" : "s"}</span>
          </div>

          <Progress label="Calories"       value={nutrition.calories_kcal} max={dailyTarget.calories_kcal} color="#FF5C1A" />
          <Progress label="Protein (g)"    value={nutrition.protein_g}     max={dailyTarget.protein_g}     color="#22C55E" />
          <Progress label="Carbs (g)"      value={nutrition.carbs_g}       max={dailyTarget.carbs_g}       color="#F59E0B" />
          <Progress label="Fat (g)"        value={nutrition.fat_g}         max={dailyTarget.fat_g}         color="#8B5CF6" />
          <Progress label="Fiber (g)"      value={nutrition.fiber_g}       max={dailyTarget.fiber_g}       color="#10B981" />
          <Progress label="Iron (mg)"      value={nutrition.iron_mg}       max={dailyTarget.iron_mg}       color="#DC2626" />
          <Progress label="Calcium (mg)"   value={nutrition.calcium_mg}    max={dailyTarget.calcium_mg}    color="#3B82F6" />
          <Progress label="Vitamin C (mg)" value={nutrition.vitamin_c_mg}  max={dailyTarget.vitamin_c_mg}  color="#14B8A6" />
          <Progress label="Sodium (mg)"    value={nutrition.sodium_mg}     max={dailyTarget.sodium_mg}     color="#EF4444" />
          <Progress label="Folate (µg)"    value={nutrition.folate_ug}     max={dailyTarget.folate_ug}     color="#9333EA" />
        </div>
      )}
    </section>
  );
}

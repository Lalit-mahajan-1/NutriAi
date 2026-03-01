import { useState, useEffect } from "react";

interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  iron_mg: number;
  calcium_mg: number;
  zinc_mg: number;
  magnesium_mg: number;
}

const requiredDefault: NutritionData = {
  calories: 2000,
  protein_g: 80,
  carbs_g: 300,
  fat_g: 70,
  fiber_g: 30,
  iron_mg: 18,
  calcium_mg: 1000,
  zinc_mg: 11,
  magnesium_mg: 400,
};

export default function MealPhoto() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [required, setRequired] = useState(requiredDefault);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/required-nutrition")
      .then((res) => res.json())
      .then((data) => setRequired(data))
      .catch(() => setRequired(requiredDefault));
  }, []);

  const handleUpload = (file: File) => {
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setDetectedItems([]);
    setNutrition(null);
  };

  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", image);

      const res = await fetch("/api/analyze-meal", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setDetectedItems(data.items);
      setNutrition(data.nutrition);
    } catch {
      setDetectedItems(["Dal", "Rice", "Roti", "Sabji", "Curd"]);
      setNutrition({
        calories: 720,
        protein_g: 28,
        carbs_g: 110,
        fat_g: 20,
        fiber_g: 10,
        iron_mg: 4.2,
        calcium_mg: 180,
        zinc_mg: 2.1,
        magnesium_mg: 85,
      });
    }

    setLoading(false);
  };

  const recalculateNutrition = async () => {
    const res = await fetch("/api/recalculate-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: detectedItems }),
    });
    const data = await res.json();
    setNutrition(data.nutrition);
  };

  const Progress = ({
    label,
    value,
    max,
    color,
  }: {
    label: string;
    value: number;
    max: number;
    color: string;
  }) => {
    const percent = Math.min((value / max) * 100, 100);

    return (
      <div className="progressWrap">
        <div className="progressTop">
          <span>{label}</span>
          <span>{value} / {max}</span>
        </div>
        <div className="progressBar">
          <div
            className="progressFill"
            style={{ width: `${percent}%`, background: color }}
          />
        </div>
      </div>
    );
  };

  return (
    <section className="meal-section">
      <div className="page-wrapper"></div>
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
  margin-bottom:70px;
  color:#3A1E0E;
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

/* gradient animated border */
.card::before {
  content:"";
  position:absolute;
  inset:-3px;
  border-radius:30px;
  background:linear-gradient(
    135deg,
    #ce5c37,
    #ff9b73,
    #ce5c37
  );
  z-index:-1;
  animation:gradientMove 6s ease infinite;
  background-size:300% 300%;
}

@keyframes gradientMove {
  0%{background-position:0% 50%}
  50%{background-position:100% 50%}
  100%{background-position:0% 50%}
}

/* subtle gloss */
.card::after{
  content:"";
  position:absolute;
  top:0;
  left:0;
  right:0;
  height:40%;
  background:linear-gradient(to bottom, rgba(255,255,255,.6), transparent);
  border-radius:28px 28px 0 0;
  pointer-events:none;
}

/* ───────── Upload Button Animation ───────── */
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

.uploadBtn:hover {
  transform:translateY(-4px) scale(1.05);
  box-shadow:0 20px 40px rgba(206,92,55,.5);
}

/* pulse animation */
.uploadBtn:active {
  transform:scale(.95);
}

/* ───────── Image Appearance Animation ───────── */
.uploadedImage {
  width:100%;
  aspect-ratio:1/1;
  object-fit:cover;
  border-radius:20px;
  margin-bottom:25px;
  animation:fadeInScale .6s cubic-bezier(.22,1,.36,1);
  box-shadow:0 20px 50px rgba(0,0,0,.15);
}

@keyframes fadeInScale {
  from{opacity:0; transform:scale(.9);}
  to{opacity:1; transform:scale(1);}
}

/* ───────── Items Grid ───────── */
.itemsGrid {
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  margin-top:15px;
}

.itemTag {
  padding:10px 16px;
  border-radius:18px;
  background:linear-gradient(135deg,#fff3ed,#ffe2d6);
  border:1px solid rgba(206,92,55,.25);
  font-weight:600;
  cursor:pointer;
  transition:.25s ease;
}

.itemTag:hover {
  transform:translateY(-3px);
  box-shadow:0 8px 20px rgba(206,92,55,.3);
}

/* ───────── Results Card ───────── */
.resultsCard {
  margin-top:70px;
  max-width:950px;
  margin-left:auto;
  margin-right:auto;
  background:white;
  border-radius:28px;
  padding:45px;
  box-shadow:0 30px 70px rgba(0,0,0,.08);
  animation:fadeInScale .6s ease;
}

.progressWrap { margin-bottom:22px; }

.progressTop {
  display:flex;
  justify-content:space-between;
  font-size:14px;
  margin-bottom:8px;
  font-weight:600;
}

.progressBar {
  height:12px;
  background:#f1f1f1;
  border-radius:30px;
  overflow:hidden;
}

.progressFill {
  height:100%;
  border-radius:30px;
  transition:width .8s cubic-bezier(.22,1,.36,1);
}
`}</style>

      <div className="title">Scan Your Meal 🍽️</div>

      <div className="mealContainer">
        <div className="card">
          {!preview ? (
            <>
    <input
      id="mealUpload"
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={(e) =>
        e.target.files && handleUpload(e.target.files[0])
      }
    />

    <button
      className="uploadBtn"
      onClick={() =>
        document.getElementById("mealUpload")?.click()
      }
    >
      Upload Meal Photo
    </button>
  </>
          ) : (
            <>
              <img src={preview} className="uploadedImage" />
              <button className="uploadBtn" onClick={analyzeImage}>
                {loading ? "Analyzing..." : "Analyze Meal"}
              </button>
            </>
          )}
        </div>

        <div className="card">
          <h2 style={{fontFamily:"'Fraunces',serif"}}>Detected Items</h2>
          <div className="itemsGrid">
            {detectedItems.map((item,index)=>(
              <span key={index} className="itemTag"
                onClick={()=>setEditingIndex(index)}>
                {editingIndex===index ? (
                  <input
                    value={item}
                    autoFocus
                    onBlur={()=>setEditingIndex(null)}
                    onChange={(e)=>{
                      const updated=[...detectedItems];
                      updated[index]=e.target.value;
                      setDetectedItems(updated);
                    }}
                  />
                ): item}
              </span>
            ))}
          </div>

          {detectedItems.length>0 && (
            <button className="uploadBtn" style={{marginTop:20}}
              onClick={recalculateNutrition}>
              Re calculate
            </button>
          )}
        </div>
      </div>

      {nutrition && (
        <div className="resultsCard">
          <h2 style={{fontFamily:"'Fraunces',serif",marginBottom:30}}>Total Nutrition</h2>

          <Progress label="Calories" value={nutrition.calories} max={required.calories} color="#FF5C1A"/>
          <Progress label="Protein (g)" value={nutrition.protein_g} max={required.protein_g} color="#22C55E"/>
          <Progress label="Carbs (g)" value={nutrition.carbs_g} max={required.carbs_g} color="#F59E0B"/>
          <Progress label="Fat (g)" value={nutrition.fat_g} max={required.fat_g} color="#8B5CF6"/>
          <Progress label="Fiber (g)" value={nutrition.fiber_g} max={required.fiber_g} color="#10B981"/>
          <Progress label="Iron (mg)" value={nutrition.iron_mg} max={required.iron_mg} color="#DC2626"/>
          <Progress label="Calcium (mg)" value={nutrition.calcium_mg} max={required.calcium_mg} color="#3B82F6"/>
          <Progress label="Zinc (mg)" value={nutrition.zinc_mg} max={required.zinc_mg} color="#14B8A6"/>
          <Progress label="Magnesium (mg)" value={nutrition.magnesium_mg} max={required.magnesium_mg} color="#9333EA"/>
        </div>
      )}
    </section>
    
  );
}

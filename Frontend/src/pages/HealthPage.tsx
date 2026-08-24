import { useSectionAnimation } from "@/hooks/useSectionAnimation";
import { useState, useRef } from "react";
import { Upload, HeartPulse, Sparkles, FileText, X, ChevronRight, AlertCircle, Loader2 } from "lucide-react";

/* ─── Static condition cards (shown before upload) ─── */
const conditions = [
  {
    title: "PCOS Diet",
    desc: "Anti-inflammatory meals with whole grains, seeds & low-GI foods.",
    meals: ["Methi Paratha", "Palak Dal", "Quinoa Khichdi"],
    emoji: "🌿",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.08)",
  },
  {
    title: "Iron Deficiency",
    desc: "Iron-rich foods paired with Vitamin C for maximum absorption.",
    meals: ["Poha with Lemon", "Spinach Dal", "Jaggery Ladoo"],
    emoji: "🩸",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
  },
  {
    title: "Diabetes-Friendly",
    desc: "Low-GI Indian meals with balanced portions & fiber-rich ingredients.",
    meals: ["Ragi Roti", "Bitter Gourd Sabzi", "Moong Dal Chilla"],
    emoji: "🩺",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.08)",
  },
  {
    title: "Hypertension Diet",
    desc: "Low-sodium meals with potassium-rich vegetables & calming herbs.",
    meals: ["Lauki Sabzi", "Dal Tadka (low salt)", "Banana Raita"],
    emoji: "💓",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
  },
];

/* ─── Mock OCR → AI analysis logic ─── */
function mockAnalyzeReport(fileName: string) {
  // Simulate different reports based on file name keywords or random
  const scenarios = [
    {
      detectedConditions: ["Iron Deficiency Anemia", "Low Vitamin B12"],
      keyValues: [
        { label: "Hemoglobin", value: "9.2 g/dL", status: "low", normal: "12–16 g/dL" },
        { label: "Serum Iron", value: "42 µg/dL", status: "low", normal: "60–170 µg/dL" },
        { label: "Vitamin B12", value: "148 pg/mL", status: "low", normal: "200–900 pg/mL" },
        { label: "Ferritin", value: "6 ng/mL", status: "low", normal: "12–150 ng/mL" },
      ],
      mealPlan: {
        breakfast: ["Poha with lemon & peas", "Amla juice (Vitamin C boost)", "Sprouted moong"],
        lunch: ["Palak dal with rice", "Beetroot raita", "Roti with til chutney"],
        dinner: ["Rajma (kidney beans)", "Methi sabzi", "Jaggery + sesame ladoo"],
        avoid: ["Tea/coffee with meals (blocks iron)", "Calcium supplements with iron"],
        tips: "Pair every iron-rich meal with a Vitamin C source. Cook in iron kadai when possible.",
      },
    },
    {
      detectedConditions: ["Pre-diabetic (High HbA1c)", "Borderline Cholesterol"],
      keyValues: [
        { label: "HbA1c", value: "6.2%", status: "borderline", normal: "Below 5.7%" },
        { label: "Fasting Blood Sugar", value: "112 mg/dL", status: "borderline", normal: "70–99 mg/dL" },
        { label: "LDL Cholesterol", value: "148 mg/dL", status: "borderline", normal: "Below 130 mg/dL" },
        { label: "Triglycerides", value: "182 mg/dL", status: "borderline", normal: "Below 150 mg/dL" },
      ],
      mealPlan: {
        breakfast: ["Ragi dosa with sambar", "Moong dal chilla", "Cucumber slices"],
        lunch: ["Brown rice + dal", "Bitter gourd sabzi", "Salad with flaxseeds"],
        dinner: ["Bajra roti", "Lauki sabzi", "Curd (low fat)"],
        avoid: ["White rice in large portions", "Maida products", "Packaged juices", "Sweets"],
        tips: "Eat every 3–4 hours. Walk 20 mins after each meal. Portion control is key.",
      },
    },
    {
      detectedConditions: ["PCOS Indicators", "Vitamin D Deficiency"],
      keyValues: [
        { label: "Testosterone", value: "68 ng/dL", status: "high", normal: "15–70 ng/dL" },
        { label: "LH/FSH Ratio", value: "2.8", status: "high", normal: "1:1" },
        { label: "Vitamin D", value: "14 ng/mL", status: "low", normal: "30–100 ng/mL" },
        { label: "Insulin (fasting)", value: "18 µIU/mL", status: "borderline", normal: "Below 15 µIU/mL" },
      ],
      mealPlan: {
        breakfast: ["Flaxseed methi paratha", "Walnuts + pumpkin seeds", "Spearmint tea"],
        lunch: ["Quinoa khichdi", "Palak paneer (low fat)", "Curd with turmeric"],
        dinner: ["Millet roti", "Mixed veg sabzi", "Roasted chana"],
        avoid: ["Dairy in excess", "Refined sugar", "Processed foods", "Soy products in excess"],
        tips: "Sunlight exposure 15–20 mins daily. Omega-3 rich seeds reduce androgen levels.",
      },
    },
  ];

  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

/* ─── STATUS COLOR ─── */
function statusColor(status: string) {
  if (status === "low") return "#EF4444";
  if (status === "high") return "#F59E0B";
  if (status === "borderline") return "#F97316";
  return "#22C55E";
}

/* ─── MAIN COMPONENT ─── */
const HealthPage = () => {
  const ref = useSectionAnimation(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof mockAnalyzeReport> | null>(null);
  const [activeTab, setActiveTab] = useState<"breakfast" | "lunch" | "dinner">("breakfast");

  const handleFile = (file: File) => {
    setUploadedFile(file);
    setResult(null);
    setAnalyzing(true);
    // Simulate OCR + AI analysis delay
    setTimeout(() => {
      setResult(mockAnalyzeReport(file.name));
      setAnalyzing(false);
    }, 2800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setUploadedFile(null);
    setResult(null);
    setAnalyzing(false);
  };

  return (
    <section
      ref={ref}
      className="section-fade min-h-screen px-6 py-20"
      style={{
        background: "linear-gradient(145deg, #FFF0E8 0%, #FFE0CC 35%, #FFF5EE 65%, #FFEADB 100%)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .health-card {
          background: rgba(255,255,255,0.68);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,140,80,0.18);
          border-radius: 24px;
          transition: transform 0.32s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.32s ease;
        }
        .health-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(220,90,40,0.13);
          background: rgba(255,255,255,0.88);
        }

        .upload-zone {
          border: 2px dashed rgba(255,120,60,0.35);
          border-radius: 24px;
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(14px);
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .upload-zone:hover, .upload-zone.drag-over {
          border-color: #FF5C1A;
          background: rgba(255,255,255,0.8);
          box-shadow: 0 0 0 6px rgba(255,92,26,0.08);
        }

        .result-card {
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(255,140,80,0.2);
          border-radius: 24px;
          animation: slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .meal-tab {
          padding: 7px 20px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.22s ease;
          border: 1.5px solid rgba(255,120,60,0.2);
          background: transparent;
          color: #8A4828;
        }
        .meal-tab.active {
          background: linear-gradient(135deg, #FF8C5A, #FF5C1A);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 14px rgba(255,92,26,0.3);
        }
        .meal-tab:hover:not(.active) {
          background: rgba(255,255,255,0.8);
          border-color: rgba(255,92,26,0.35);
        }

        .section-label {
          display: inline-block;
          background: rgba(255,92,26,0.1);
          border: 1.5px solid rgba(255,92,26,0.25);
          color: #CC4A10;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          padding: 6px 20px;
          border-radius: 30px;
          margin-bottom: 20px;
        }

        .pill-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
        }

        .scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #FF8C5A, transparent);
          animation: scan 1.8s ease-in-out infinite;
        }
        @keyframes scan {
          0%   { top: 10%; opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }

        .avoid-chip {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #B91C1C;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 11px;
          border-radius: 20px;
          display: inline-block;
        }

        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        .value-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,140,80,0.12);
          margin-bottom: 8px;
          transition: background 0.2s;
        }
        .value-row:hover { background: rgba(255,255,255,0.9); }

        .pulse-ring {
          animation: pulse-ring 2s ease-in-out infinite;
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,92,26,0.3); }
          50%       { box-shadow: 0 0 0 10px rgba(255,92,26,0); }
        }
      `}</style>

      {/* Ambient orbs */}
      <div className="glow-orb" style={{ width: 450, height: 450, background: "rgba(255,110,50,0.07)", top: "5%", left: "50%", transform: "translateX(-50%)", position: "absolute", zIndex: 0 }} />
      <div className="glow-orb" style={{ width: 300, height: 300, background: "rgba(255,180,90,0.09)", bottom: "8%", left: "5%", position: "absolute", zIndex: 0 }} />

      <div className="container mx-auto max-w-5xl" style={{ position: "relative", zIndex: 1 }}>

        {/* ── HEADER ── */}
        <div className="text-center mb-12">
          <div className="section-label">AI Medical Report Analysis</div>
          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(2.4rem, 5vw, 4rem)",
            fontWeight: 900,
            color: "#2D1206",
            lineHeight: 1.08,
            letterSpacing: "-1.5px",
            marginBottom: 14,
          }}>
            Health{" "}
            <span style={{
              fontStyle: "italic",
              background: "linear-gradient(135deg, #FF8C5A, #FF3D00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Conditions</span>
          </h1>
          <p style={{ color: "#8A4828", fontSize: "1.05rem", maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
            Upload your medical report — our AI reads it, detects deficiencies, and builds your personalized Indian meal plan.
          </p>
        </div>

        {/* ── OCR UPLOAD ZONE ── */}
        {!uploadedFile && (
          <div
            className={`upload-zone ${dragOver ? "drag-over" : ""} p-10 text-center mb-10`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="pulse-ring" style={{
              width: 72, height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FFF0E5, #FFD9C0)",
              border: "2px solid rgba(255,120,60,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 18px",
            }}>
              <Upload size={28} style={{ color: "#FF5C1A" }} />
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.3rem", fontWeight: 700, color: "#2D1206", marginBottom: 8 }}>
              Upload Your Medical Report
            </h3>
            <p style={{ color: "#8A4828", fontSize: "0.88rem", marginBottom: 16, lineHeight: 1.6 }}>
              Drag & drop or click to upload • PDF, JPG, or PNG<br />
              Our OCR engine extracts your blood values instantly
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {["🩸 Blood Report", "🧬 CBC Panel", "🔬 Thyroid Report", "💊 Lipid Profile"].map(t => (
                <span key={t} style={{
                  background: "rgba(255,92,26,0.08)", border: "1px solid rgba(255,92,26,0.2)",
                  color: "#CC4A10", fontSize: "0.75rem", fontWeight: 600,
                  padding: "4px 12px", borderRadius: 20,
                }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── ANALYZING STATE ── */}
        {analyzing && uploadedFile && (
          <div className="result-card p-10 text-center mb-10" style={{ position: "relative", overflow: "hidden" }}>
            <div className="scan-line" />
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg, #FF8C5A, #FF5C1A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 18px",
              boxShadow: "0 10px 30px rgba(255,92,26,0.35)",
            }}>
              <FileText size={32} style={{ color: "white" }} />
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.4rem", fontWeight: 700, color: "#2D1206", marginBottom: 8 }}>
              Scanning Report…
            </h3>
            <p style={{ color: "#8A4828", fontSize: "0.9rem", marginBottom: 20 }}>
              OCR extracting values · Detecting deficiencies · Building meal plan
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
              {["Reading values", "Detecting conditions", "Generating meal plan"].map((step, i) => (
                <div key={step} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(255,92,26,0.08)", borderRadius: 20,
                  padding: "5px 12px", fontSize: "0.75rem", fontWeight: 600, color: "#CC4A10",
                  animationDelay: `${i * 0.3}s`,
                }}>
                  <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                  {step}
                </div>
              ))}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── RESULT ── */}
        {result && !analyzing && (
          <div className="mb-10" style={{ animation: "slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>

            {/* File header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(255,255,255,0.7)", backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,140,80,0.2)", borderRadius: 16,
              padding: "12px 18px", marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "linear-gradient(135deg, #FF8C5A, #FF5C1A)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <FileText size={18} style={{ color: "white" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#2D1206", fontSize: "0.9rem" }}>{uploadedFile?.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#8A4828" }}>Report analyzed · {result.keyValues.length} values extracted</div>
                </div>
              </div>
              <button onClick={reset} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "6px 8px", cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center" }}>
                <X size={16} />
              </button>
            </div>

            {/* Detected conditions */}
            <div className="result-card p-6 mb-5">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <AlertCircle size={18} style={{ color: "#FF5C1A" }} />
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", fontWeight: 700, color: "#2D1206" }}>
                  Detected Conditions
                </h3>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                {result.detectedConditions.map(c => (
                  <span key={c} style={{
                    background: "linear-gradient(135deg, #FF8C5A22, #FF5C1A15)",
                    border: "1.5px solid rgba(255,92,26,0.3)",
                    color: "#CC4A10", fontWeight: 700, fontSize: "0.82rem",
                    padding: "5px 14px", borderRadius: 20,
                  }}>{c}</span>
                ))}
              </div>

              {/* Key values table */}
              <h4 style={{ fontWeight: 700, color: "#2D1206", fontSize: "0.88rem", marginBottom: 10 }}>Extracted Blood Values</h4>
              {result.keyValues.map(v => (
                <div className="value-row" key={v.label}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#2D1206", fontSize: "0.85rem" }}>{v.label}</div>
                    <div style={{ fontSize: "0.73rem", color: "#8A4828" }}>Normal: {v.normal}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: statusColor(v.status) }}>{v.value}</div>
                    <span className="pill-badge" style={{
                      background: statusColor(v.status) + "18",
                      color: statusColor(v.status),
                      border: `1px solid ${statusColor(v.status)}33`,
                      textTransform: "capitalize",
                    }}>{v.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Meal Plan */}
            <div className="result-card p-6">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Sparkles size={18} style={{ color: "#FF5C1A" }} />
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", fontWeight: 700, color: "#2D1206" }}>
                  Your Personalized Indian Meal Plan
                </h3>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {(["breakfast", "lunch", "dinner"] as const).map(tab => (
                  <button key={tab} className={`meal-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                    {tab === "breakfast" ? "🌅 Breakfast" : tab === "lunch" ? "☀️ Lunch" : "🌙 Dinner"}
                  </button>
                ))}
              </div>

              {/* Meals */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                {result.mealPlan[activeTab].map((meal, i) => (
                  <div key={meal} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,140,80,0.15)",
                    borderRadius: 14, padding: "10px 14px",
                    animation: `slideUp 0.3s ease ${i * 0.07}s both`,
                  }}>
                    <HeartPulse size={16} style={{ color: "#FF5C1A", flexShrink: 0 }} />
                    <span style={{ fontWeight: 500, color: "#2D1206", fontSize: "0.88rem" }}>{meal}</span>
                  </div>
                ))}
              </div>

              {/* Avoid */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#2D1206", fontSize: "0.85rem", marginBottom: 8 }}>
                  ⚠️ Foods to Avoid
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {result.mealPlan.avoid.map(a => (
                    <span key={a} className="avoid-chip">{a}</span>
                  ))}
                </div>
              </div>

              {/* Tip */}
              <div style={{
                background: "rgba(255,92,26,0.06)", border: "1.5px solid rgba(255,92,26,0.18)",
                borderRadius: 14, padding: "12px 16px",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>💡</span>
                <p style={{ fontSize: "0.82rem", color: "#8A4828", lineHeight: 1.65, margin: 0 }}>
                  <strong style={{ color: "#CC4A10" }}>Nutritionist Tip: </strong>{result.mealPlan.tips}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── STATIC CONDITION CARDS (always visible) ── */}
        <div style={{ marginTop: result ? 8 : 0 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.5rem", fontWeight: 700, color: "#2D1206" }}>
              Common Health Conditions
            </h2>
            <p style={{ color: "#8A4828", fontSize: "0.88rem" }}>
              Or browse condition-specific plans below
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {conditions.map((c, i) => (
              <div key={c.title} className="health-card p-7" style={{ transitionDelay: `${i * 0.06}s` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 14,
                    background: c.bg, border: `1.5px solid ${c.color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.4rem",
                  }}>{c.emoji}</div>
                  <div>
                    <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.05rem", fontWeight: 700, color: "#2D1206" }}>{c.title}</h3>
                    <span className="pill-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}33`, fontSize: "0.7rem" }}>
                      Condition Plan
                    </span>
                  </div>
                </div>
                <p style={{ color: "#8A4828", fontSize: "0.82rem", lineHeight: 1.65, marginBottom: 14 }}>{c.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {c.meals.map(m => (
                    <div key={m} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: "0.82rem",
                    }}>
                      <ChevronRight size={14} style={{ color: c.color, flexShrink: 0 }} />
                      <span style={{ color: "#2D1206", fontWeight: 500 }}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default HealthPage;
import React, { useState, useRef } from "react";
import { mlApi, BodyAnalysis } from "@/lib/api";

export default function NutriAnalysisPage() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [bodyFile, setBodyFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BodyAnalysis | null>(null);

  const bodyRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLInputElement>(null);

  const runAnalysis = async () => {
    if (!height || !weight || !age || !gender) {
      setError("Please fill in height, weight, age and gender first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await mlApi.bodyAnalyze(
        Number(height), Number(weight), Number(age), gender.toLowerCase(), activity,
      );
      setResult(res);
      setTimeout(() => document.getElementById("na-results")?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed — is the ML backend running on :8000?");
    } finally {
      setLoading(false);
    }
  };

  const targets = result?.nutrition_plan?.daily_targets;
  const energy = result?.nutrition_plan?.energy_expenditure;
  const recs = result?.nutrition_plan?.recommendations ?? [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }

        /* ─── FLOATING BUBBLES ─── */
        @keyframes floatUp {
          0%   { transform: translateY(0px) translateX(0px); opacity: 0; }
          10%  { opacity: 1; }
          50%  { transform: translateY(-45vh) translateX(18px); }
          90%  { opacity: 0.8; }
          100% { transform: translateY(-105vh) translateX(-10px); opacity: 0; }
        }

        .bubbles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }

        .bubble {
          position: absolute;
          bottom: -80px;
          border-radius: 50%;
          animation: floatUp ease-in-out infinite;
          background: radial-gradient(circle at 30% 28%,
            rgba(255,255,255,0.92) 0%,
            rgba(255,210,185,0.55) 45%,
            rgba(230,130,80,0.18) 100%
          );
          border: 2px solid rgba(255,255,255,0.75);
          box-shadow:
            inset -3px -3px 8px rgba(200,100,60,0.15),
            inset 3px 3px 8px rgba(255,255,255,0.6),
            0 4px 16px rgba(200,100,60,0.12);
        }

        .bubble::after {
          content: '';
          position: absolute;
          top: 18%; left: 22%;
          width: 22%; height: 18%;
          background: rgba(255,255,255,0.7);
          border-radius: 50%;
          transform: rotate(-30deg);
          filter: blur(1px);
        }

        .bubble:nth-child(1)  { width: 58px;  height: 58px;  left: 4%;   animation-duration: 13s; animation-delay: 0s;    }
        .bubble:nth-child(2)  { width: 38px;  height: 38px;  left: 11%;  animation-duration: 10s; animation-delay: 1.8s;  }
        .bubble:nth-child(3)  { width: 75px;  height: 75px;  left: 20%;  animation-duration: 15s; animation-delay: 3.2s;  }
        .bubble:nth-child(4)  { width: 30px;  height: 30px;  left: 33%;  animation-duration: 11s; animation-delay: 0.5s;  }
        .bubble:nth-child(5)  { width: 95px;  height: 95px;  left: 46%;  animation-duration: 18s; animation-delay: 2.4s;  }
        .bubble:nth-child(6)  { width: 45px;  height: 45px;  left: 57%;  animation-duration: 12s; animation-delay: 5s;    }
        .bubble:nth-child(7)  { width: 62px;  height: 62px;  left: 67%;  animation-duration: 14s; animation-delay: 1.2s;  }
        .bubble:nth-child(8)  { width: 24px;  height: 24px;  left: 76%;  animation-duration: 9s;  animation-delay: 4s;    }
        .bubble:nth-child(9)  { width: 85px;  height: 85px;  left: 84%;  animation-duration: 17s; animation-delay: 0.8s;  }
        .bubble:nth-child(10) { width: 40px;  height: 40px;  left: 91%;  animation-duration: 11s; animation-delay: 3s;    }
        .bubble:nth-child(11) { width: 52px;  height: 52px;  left: 28%;  animation-duration: 16s; animation-delay: 6.5s;  }
        .bubble:nth-child(12) { width: 32px;  height: 32px;  left: 53%;  animation-duration: 10s; animation-delay: 7.5s;  }
        .bubble:nth-child(13) { width: 68px;  height: 68px;  left: 40%;  animation-duration: 13s; animation-delay: 9s;    }
        .bubble:nth-child(14) { width: 26px;  height: 26px;  left: 16%;  animation-duration: 8s;  animation-delay: 4.5s;  }
        .bubble:nth-child(15) { width: 48px;  height: 48px;  left: 72%;  animation-duration: 12s; animation-delay: 8s;    }

        /* ─── PAGE ─── */
        .page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          padding: 80px 60px;
          background:
            radial-gradient(ellipse at 0% 0%,   #ffd4b8 0%,  transparent 55%),
            radial-gradient(ellipse at 100% 0%,  #ffbfa0 0%,  transparent 50%),
            radial-gradient(ellipse at 50% 50%,  #ffe8d5 0%,  transparent 60%),
            radial-gradient(ellipse at 0% 100%,  #ffc9a8 0%,  transparent 55%),
            radial-gradient(ellipse at 100% 100%,#ffaa80 0%,  transparent 50%),
            #fde0c8;
        }

        .wrap {
          max-width: 1100px;
          margin: auto;
          position: relative;
          z-index: 2;
        }

        /* ─── HERO ─── */
        .hero {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 70px;
        }

        .hero-eyebrow {
          font-size: 12px;
          letter-spacing: 3.5px;
          text-transform: uppercase;
          color: #b05c30;
          font-weight: 600;
          opacity: 0.9;
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(3.5rem, 6vw, 6rem);
          line-height: 0.95;
        }

        .dark  { color: #3a1a08; }
        .light { color: #c4622c; font-style: italic; }

        .hero-sub {
          max-width: 560px;
          font-size: 1.05rem;
          line-height: 1.8;
          color: #7a3c1e;
          font-weight: 400;
        }

        .guideline-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 100px;
          background: rgba(255,255,255,0.55);
          border: 1.5px solid rgba(190,100,55,0.25);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 600;
          color: #a04820;
          letter-spacing: 0.3px;
        }

        .guideline-tag .check {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #c4622c;
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          flex-shrink: 0;
        }

        /* ─── UPLOAD CARDS ─── */
        .upload-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 50px;
        }

        .upload-card {
          background: rgba(255,255,255,0.55);
          border: 2px dashed rgba(190,100,55,0.35);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: 0.3s ease;
          color: #7a3c1e;
          font-weight: 600;
          font-size: 1rem;
          backdrop-filter: blur(6px);
          box-shadow: 0 4px 20px rgba(180,90,40,0.08);
        }

        .upload-card:hover {
          background: rgba(255,255,255,0.75);
          border-color: #c4622c;
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(180,90,40,0.16);
          color: #3a1a08;
        }

        .upload-card .icon {
          font-size: 2rem;
          margin-bottom: 10px;
          display: block;
        }

        .upload-card.uploaded {
          background: rgba(196,98,44,0.12);
          border: 2px solid #c4622c;
        }

        .upload-card .file-name {
          display: block;
          margin-top: 8px;
          font-size: 0.78rem;
          color: #c4622c;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
          margin-left: auto;
          margin-right: auto;
        }

        .upload-card .check-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: #c4622c;
          color: white;
          font-size: 0.7rem;
          margin-bottom: 8px;
        }

        /* ─── INPUTS ─── */
        .meta-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        .field { display: flex; flex-direction: column; }

        .field label {
          margin-bottom: 8px;
          color: #7a3c1e;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .field input,
        .field select {
          padding: 14px 16px;
          border-radius: 14px;
          border: 1.5px solid rgba(190,100,55,0.25);
          background: rgba(255,255,255,0.65);
          font-size: 1rem;
          color: #3a1a08;
          font-family: 'DM Sans', sans-serif;
          transition: 0.2s;
          backdrop-filter: blur(4px);
          outline: none;
        }

        .field input::placeholder { color: #c4946e; }

        .field input:focus,
        .field select:focus {
          border-color: #c4622c;
          background: rgba(255,255,255,0.85);
          box-shadow: 0 0 0 3px rgba(196,98,44,0.12);
        }

        .field select option { color: #3a1a08; background: #fff; }

        /* ─── CTA BUTTON ─── */
        .cta-btn {
          width: 100%;
          padding: 22px;
          border-radius: 20px;
          border: none;
          font-size: 1.15rem;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          background: linear-gradient(135deg, #c4622c 0%, #a04820 100%);
          color: #fff;
          cursor: pointer;
          transition: 0.3s ease;
          letter-spacing: 0.5px;
          box-shadow: 0 8px 28px rgba(160,72,32,0.32);
        }

        .cta-btn:hover {
          background: linear-gradient(135deg, #d47038 0%, #b85528 100%);
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(160,72,32,0.4);
        }

        /* ─── ERROR ─── */
        .na-error {
          background: rgba(220,38,38,0.08);
          border: 1.5px solid rgba(220,38,38,0.25);
          color: #b91c1c;
          border-radius: 14px;
          padding: 12px 18px;
          margin-bottom: 20px;
          font-weight: 600;
          font-size: 0.92rem;
        }

        /* ─── RESULTS ─── */
        .results {
          margin-top: 40px;
          background: rgba(255,255,255,0.6);
          border: 1.5px solid rgba(190,100,55,0.22);
          border-radius: 24px;
          padding: 36px;
          backdrop-filter: blur(8px);
          box-shadow: 0 12px 40px rgba(180,90,40,0.12);
          animation: fadeUp .5s cubic-bezier(.22,1,.36,1);
        }
        @keyframes fadeUp { from{opacity:0; transform:translateY(16px);} to{opacity:1; transform:translateY(0);} }

        .results-hero { display: flex; align-items: center; gap: 24px; margin-bottom: 30px; flex-wrap: wrap; }
        .bmi-badge {
          width: 104px; height: 104px; border-radius: 50%;
          background: linear-gradient(135deg, #c4622c, #a04820);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0; box-shadow: 0 10px 26px rgba(160,72,32,0.35);
        }
        .bmi-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 800; line-height: 1; }
        .bmi-lbl { font-size: 0.7rem; letter-spacing: 2px; opacity: 0.85; margin-top: 4px; }
        .cat-pill {
          display: inline-block; text-transform: capitalize; font-weight: 700; color: #a04820;
          background: rgba(196,98,44,0.12); border: 1.5px solid rgba(196,98,44,0.3);
          padding: 6px 16px; border-radius: 100px; font-size: 1rem;
        }
        .energy-line { color: #7a3c1e; font-size: 0.9rem; margin-top: 10px; font-weight: 500; }

        .results-sub {
          font-family: 'Playfair Display', serif; color: #3a1a08; font-size: 1.3rem;
          margin: 26px 0 16px;
        }
        .target-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
        .target-cell {
          background: rgba(255,255,255,0.75); border: 1px solid rgba(190,100,55,0.18);
          border-radius: 16px; padding: 16px 10px; text-align: center;
          display: flex; flex-direction: column; gap: 4px;
        }
        .target-v { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 800; color: #c4622c; }
        .target-l { font-size: 0.72rem; color: #7a3c1e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }

        .rec-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .rec-list li {
          background: rgba(255,255,255,0.7); border-left: 3px solid #c4622c;
          padding: 12px 16px; border-radius: 10px; color: #5a2c14; font-size: 0.92rem; font-weight: 500;
        }
        .rec-list li::before { content: "✓ "; color: #c4622c; font-weight: 800; }

        /* ─── RESPONSIVE ─── */
        @media(max-width: 1000px){
          .page { padding: 60px 30px; }
          .upload-grid { grid-template-columns: 1fr; }
          .meta-row { grid-template-columns: 1fr 1fr; }
          .target-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media(max-width: 540px){
          .meta-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page">



        {/* FLOATING BUBBLES */}
        <div className="bubbles">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="bubble" />
          ))}
        </div>

        <div className="wrap">

          {/* HERO */}
          <div className="hero">
            <div className="hero-eyebrow">AI Nutrition Intelligence</div>

            <h1 className="hero-title">
              <span className="dark">Eat Smart.</span><br />
              <span className="light">Live Better.</span>
            </h1>

            <p className="hero-sub">
              Upload your photo and medical reports. Get a personalised nutrition analysis and Indian diet plan built just for you.
            </p>

            <div className="guideline-tag">
              <span className="check">✓</span>
              Aligned with WHO &amp; ICMR Nutritional Guidelines
            </div>
          </div>

          {/* UPLOAD (optional — analysis runs from your metrics below) */}
          <div className="upload-grid">
            <div className={`upload-card${bodyFile ? " uploaded" : ""}`} onClick={() => bodyRef.current?.click()}>
              <input
                ref={bodyRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => setBodyFile(e.target.files?.[0] ?? null)}
              />
              {bodyFile ? <span className="check-badge">✓</span> : <span className="icon">📷</span>}
              {bodyFile ? "Body Photo Added" : "Upload Body Photo"}
              {bodyFile && <span className="file-name">{bodyFile.name}</span>}
            </div>

            <div className={`upload-card${reportFile ? " uploaded" : ""}`} onClick={() => reportRef.current?.click()}>
              <input
                ref={reportRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
              />
              {reportFile ? <span className="check-badge">✓</span> : <span className="icon">📋</span>}
              {reportFile ? "Report Added" : "Upload Medical Report"}
              {reportFile && <span className="file-name">{reportFile.name}</span>}
            </div>
          </div>

          {/* INPUTS */}
          <div className="meta-row">
            <div className="field">
              <label>Height (cm)</label>
              <input placeholder="e.g. 170" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>

            <div className="field">
              <label>Weight (kg)</label>
              <input placeholder="e.g. 65" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>

            <div className="field">
              <label>Age</label>
              <input placeholder="e.g. 28" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>

            <div className="field">
              <label>Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div className="field">
              <label>Activity Level</label>
              <select value={activity} onChange={(e) => setActivity(e.target.value)}>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="very_active">Very Active</option>
                <option value="extra_active">Extra Active</option>
              </select>
            </div>
          </div>

          {error && <div className="na-error">⚠ {error}</div>}

          <button className="cta-btn" onClick={runAnalysis} disabled={loading}>
            {loading ? "⏳ Analyzing…" : "🔬 Run Full Nutrition Analysis"}
          </button>

          {/* RESULTS */}
          {result && targets && (
            <div id="na-results" className="results">
              <div className="results-hero">
                <div className="bmi-badge">
                  <span className="bmi-num">{result.bmi.toFixed(1)}</span>
                  <span className="bmi-lbl">BMI</span>
                </div>
                <div>
                  <div className="cat-pill">{String(result.category).replace(/_/g, " ")}</div>
                  {energy && (
                    <p className="energy-line">
                      BMR {Math.round(energy.bmr)} kcal · TDEE {Math.round(energy.tdee)} kcal
                    </p>
                  )}
                </div>
              </div>

              <h3 className="results-sub">Your Daily Targets</h3>
              <div className="target-grid">
                {[
                  { v: `${Math.round(targets.calories)}`, l: "kcal" },
                  { v: `${Math.round(targets.protein_g)}g`, l: "Protein" },
                  { v: `${Math.round(targets.carbs_g)}g`, l: "Carbs" },
                  { v: `${Math.round(targets.fats_g)}g`, l: "Fats" },
                  { v: `${Math.round(targets.fiber_g)}g`, l: "Fibre" },
                  { v: `${(targets.water_ml / 1000).toFixed(1)}L`, l: "Water" },
                ].map((t) => (
                  <div key={t.l} className="target-cell">
                    <span className="target-v">{t.v}</span>
                    <span className="target-l">{t.l}</span>
                  </div>
                ))}
              </div>

              {recs.length > 0 && (
                <>
                  <h3 className="results-sub">Recommendations</h3>
                  <ul className="rec-list">
                    {recs.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
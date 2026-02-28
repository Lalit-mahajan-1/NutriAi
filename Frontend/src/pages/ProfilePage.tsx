/**
 * NutriSight — Profile Page
 * Editable user profile matching the NutriAI peach/orange theme.
 * Route: /profile/:userId
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const ACTIVITY_OPTIONS = [
  { value: "sedentary",  label: "🪑 Sedentary",   desc: "Little or no exercise" },
  { value: "light",      label: "🚶 Light",        desc: "Exercise 1-3 days/week" },
  { value: "moderate",   label: "🏃 Moderate",     desc: "Exercise 3-5 days/week" },
  { value: "active",     label: "💪 Active",       desc: "Exercise 6-7 days/week" },
  { value: "very_active",label: "🔥 Very Active",  desc: "Intense exercise daily" },
];

const GENDER_OPTIONS = [
  { value: "male",   label: "♂ Male"   },
  { value: "female", label: "♀ Female" },
  { value: "other",  label: "⚧ Other"  },
];

export default function ProfilePage() {
  const { user, profile, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:          "",
    age:           "",
    gender:        "",
    height:        "",
    weight:        "",
    activityLevel: "",
  });
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  // Prefill form from profile when it loads
  useEffect(() => {
    if (profile) {
      setForm({
        name:          profile.name           ?? "",
        age:           profile.age?.toString() ?? "",
        gender:        profile.gender          ?? "",
        height:        profile.height?.toString() ?? "",
        weight:        profile.weight?.toString() ?? "",
        activityLevel: profile.activityLevel   ?? "",
      });
    } else if (user) {
      setForm(f => ({ ...f, name: user.name }));
    }
  }, [profile, user]);

  const handleChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setSuccess(false);
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required.");
    setSaving(true);
    setError("");
    try {
      await updateUser({
        name:          form.name.trim(),
        age:           form.age    ? Number(form.age)    : null as any,
        gender:        (form.gender   || null) as any,
        height:        form.height ? Number(form.height) : null as any,
        weight:        form.weight ? Number(form.weight) : null as any,
        activityLevel: (form.activityLevel || null) as any,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFF5EE",
      fontFamily: "'Playfair Display', serif",
      paddingBottom: 60,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }

        .pf-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1.5px solid rgba(212,168,138,0.45);
          background: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          color: #3D1F0A;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .pf-input::placeholder { color: #B09080; }
        .pf-input:focus {
          border-color: #E8734A;
          box-shadow: 0 0 0 3px rgba(232,115,74,.15);
        }
        .pf-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #7A5040;
          letter-spacing: 1px;
          text-transform: uppercase;
          display: block;
          margin-bottom: 7px;
        }
        .gender-pill {
          flex: 1;
          padding: 10px 8px;
          border-radius: 12px;
          border: 1.5px solid rgba(212,168,138,0.4);
          background: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #7A5040;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }
        .gender-pill:hover { border-color: #E8734A; color: #E8734A; }
        .gender-pill.active {
          background: linear-gradient(135deg, #E8734A, #C4522E);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 4px 14px rgba(232,115,74,.35);
        }
        .activity-card {
          padding: 13px 16px;
          border-radius: 14px;
          border: 1.5px solid rgba(212,168,138,0.35);
          background: #fff;
          cursor: pointer;
          transition: all 0.2s;
        }
        .activity-card:hover { border-color: #E8734A; }
        .activity-card.active {
          border-color: #E8734A;
          background: rgba(232,115,74,.07);
          box-shadow: 0 4px 14px rgba(232,115,74,.12);
        }
        .save-btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 60px;
          background: linear-gradient(135deg, #E8734A, #C4522E);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 8px 28px rgba(232,115,74,.4);
        }
        .save-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(232,115,74,.5); }
        .save-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #E8734A, #C4522E)",
        padding: "40px 24px 60px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", width: 300, height: 300,
          top: -100, right: -80,
          background: "rgba(255,200,150,.15)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.3)",
              borderRadius: 10, padding: "8px 16px",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#fff",
              cursor: "pointer", marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >← Back</button>

          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(255,255,255,.25)",
              border: "3px solid rgba(255,255,255,.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, flexShrink: 0,
            }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 26, fontWeight: 900, color: "#fff",
                letterSpacing: "-0.5px", margin: 0, lineHeight: 1.2,
              }}>{user?.name}</h1>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, color: "rgba(255,220,200,.9)", margin: "4px 0 0",
              }}>{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div style={{ maxWidth: 680, margin: "-32px auto 0", padding: "0 16px" }}>
        <div style={{
          background: "#fff",
          borderRadius: 24,
          padding: "36px 32px",
          boxShadow: "0 8px 40px rgba(92,61,46,.1)",
        }}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Name */}
            <div>
              <label className="pf-label">Full Name *</label>
              <input
                className="pf-input"
                value={form.name}
                onChange={e => handleChange("name", e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            {/* Age + Gender row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="pf-label">Age</label>
                <input
                  className="pf-input"
                  type="number"
                  min={1} max={120}
                  value={form.age}
                  onChange={e => handleChange("age", e.target.value)}
                  placeholder="e.g. 21"
                />
              </div>
              <div>
                <label className="pf-label">Height (cm)</label>
                <input
                  className="pf-input"
                  type="number"
                  min={50} max={300}
                  value={form.height}
                  onChange={e => handleChange("height", e.target.value)}
                  placeholder="e.g. 170"
                />
              </div>
            </div>

            {/* Weight */}
            <div>
              <label className="pf-label">Weight (kg)</label>
              <input
                className="pf-input"
                type="number"
                min={10} max={500}
                step="0.1"
                value={form.weight}
                onChange={e => handleChange("weight", e.target.value)}
                placeholder="e.g. 65"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="pf-label">Gender</label>
              <div style={{ display: "flex", gap: 10 }}>
                {GENDER_OPTIONS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    className={`gender-pill${form.gender === g.value ? " active" : ""}`}
                    onClick={() => handleChange("gender", form.gender === g.value ? "" : g.value)}
                  >{g.label}</button>
                ))}
              </div>
            </div>

            {/* Activity Level */}
            <div>
              <label className="pf-label">Activity Level</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ACTIVITY_OPTIONS.map(a => (
                  <button
                    key={a.value}
                    type="button"
                    className={`activity-card${form.activityLevel === a.value ? " active" : ""}`}
                    onClick={() => handleChange("activityLevel", form.activityLevel === a.value ? "" : a.value)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: form.activityLevel === a.value ? "#C4522E" : "#3D1F0A" }}>
                        {a.label}
                      </span>
                      {form.activityLevel === a.value && (
                        <span style={{ color: "#E8734A", fontSize: 16 }}>✓</span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#A07060", marginTop: 2 }}>{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Success / Error */}
            {success && (
              <div style={{
                background: "rgba(40,180,80,.1)", border: "1px solid rgba(40,180,80,.25)",
                borderRadius: 12, padding: "11px 14px",
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#1a7a3a", fontWeight: 500,
              }}>✅ Profile saved successfully!</div>
            )}
            {error && (
              <div style={{
                background: "rgba(220,60,60,.1)", border: "1px solid rgba(220,60,60,.25)",
                borderRadius: 12, padding: "11px 14px",
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#C0392B", fontWeight: 500,
              }}>⚠️ {error}</div>
            )}

            <button className="save-btn" type="submit" disabled={saving}>
              {saving ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{
                    width: 18, height: 18,
                    border: "2.5px solid rgba(255,255,255,.4)",
                    borderTop: "2.5px solid #fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Saving…
                </span>
              ) : "Save Profile →"}
            </button>
          </form>
        </div>

        {/* User ID badge */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11, color: "#B09080",
          textAlign: "center", marginTop: 16,
        }}>
          User ID: {user?._id}
        </p>
      </div>
    </div>
  );
}

/**
 * NutriSight — Auth Page (Login / Signup)
 * Matches the Playfair Display + DM Sans + warm peach theme of the homepage
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type Mode = "login" | "signup";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (!name.trim()) return setError("Please enter your name.");
      if (password !== confirmPassword) return setError("Passwords do not match.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      fontFamily: "'Playfair Display', serif",
      background: "linear-gradient(145deg, #FF8C5A 0%, #E8734A 35%, #C4522E 70%, #8B2E0F 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }

        .auth-input {
          width: 100%;
          padding: 13px 16px;
          border-radius: 14px;
          border: 1.5px solid rgba(212, 168, 138, 0.4);
          background: rgba(255, 255, 255, 0.9);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          color: #3D1F0A;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .auth-input::placeholder { color: #B09080; }
        .auth-input:focus {
          border-color: #E8734A;
          box-shadow: 0 0 0 3px rgba(232, 115, 74, 0.18);
          background: #fff;
        }

        .auth-tab {
          flex: 1;
          padding: 11px;
          border: none;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
        }
        .auth-tab-active {
          background: linear-gradient(135deg, #E8734A, #C4522E);
          color: #fff;
          box-shadow: 0 4px 18px rgba(232, 115, 74, 0.4);
        }
        .auth-tab-inactive {
          background: transparent;
          color: #8B5A3C;
        }
        .auth-tab-inactive:hover { color: #E8734A; }

        .submit-btn {
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
          box-shadow: 0 8px 28px rgba(232, 115, 74, 0.45);
          letter-spacing: 0.3px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 40px rgba(232, 115, 74, 0.55);
        }
        .submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .eye-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #B09080;
          font-size: 18px;
          padding: 4px;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: #E8734A; }

        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes blobPulse {
          0%, 100% { border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
          50%       { border-radius: 45% 55% 40% 60% / 60% 40% 55% 45%; }
        }
        @keyframes spinLoader {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Ambient blobs */}
      <div style={{
        position: "absolute", width: 480, height: 480,
        top: -140, right: -100,
        background: "rgba(255, 200, 150, 0.18)",
        borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
        animation: "blobPulse 8s ease-in-out infinite",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 320, height: 320,
        bottom: -80, left: -60,
        background: "rgba(255, 220, 180, 0.14)",
        borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
        animation: "blobPulse 10s ease-in-out infinite 2s",
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "rgba(255, 251, 247, 0.97)",
        backdropFilter: "blur(20px)",
        borderRadius: 28,
        padding: "40px 36px",
        boxShadow: "0 32px 80px rgba(92, 61, 46, 0.28), 0 0 0 1px rgba(255,255,255,0.4)",
        animation: "authCardIn 0.55s cubic-bezier(.22,1,.36,1) both",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 42, height: 42,
            background: "linear-gradient(135deg, #E8734A, #C4522E)",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: "0 4px 14px rgba(232,115,74,.4)",
          }}>🍛</div>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24, fontWeight: 700,
            color: "#3D1F0A", letterSpacing: "-0.5px",
          }}>NutriAI</span>
        </Link>

        {/* Heading */}
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28, fontWeight: 900,
          color: "#3D1F0A", letterSpacing: "-0.8px",
          marginBottom: 6, lineHeight: 1.15,
        }}>
          {mode === "login" ? "Welcome back" : "Join NutriAI"}
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14, color: "#8B6855",
          marginBottom: 28, lineHeight: 1.5,
        }}>
          {mode === "login"
            ? "Sign in to access your personalized meal plans."
            : "Create your account and eat smarter from day one."}
        </p>

        {/* Tab switcher */}
        <div style={{
          display: "flex", gap: 6,
          background: "rgba(212, 168, 138, 0.18)",
          borderRadius: 16, padding: 5,
          marginBottom: 28,
        }}>
          <button
            className={`auth-tab ${mode === "login" ? "auth-tab-active" : "auth-tab-inactive"}`}
            onClick={() => switchMode("login")}
            type="button"
          >Login</button>
          <button
            className={`auth-tab ${mode === "signup" ? "auth-tab-active" : "auth-tab-inactive"}`}
            onClick={() => switchMode("signup")}
            type="button"
          >Sign Up</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "signup" && (
            <div>
              <label style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, fontWeight: 600,
                color: "#5C3D2E", letterSpacing: 0.5,
                textTransform: "uppercase", display: "block", marginBottom: 7,
              }}>Full Name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, fontWeight: 600,
              color: "#5C3D2E", letterSpacing: 0.5,
              textTransform: "uppercase", display: "block", marginBottom: 7,
            }}>Email Address</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, fontWeight: 600,
              color: "#5C3D2E", letterSpacing: 0.5,
              textTransform: "uppercase", display: "block", marginBottom: 7,
            }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                className="auth-input"
                type={showPassword ? "text" : "password"}
                placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={{ paddingRight: 46 }}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, fontWeight: 600,
                color: "#5C3D2E", letterSpacing: 0.5,
                textTransform: "uppercase", display: "block", marginBottom: 7,
              }}>Confirm Password</label>
              <input
                className="auth-input"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(220, 60, 60, 0.1)",
              border: "1px solid rgba(220, 60, 60, 0.25)",
              borderRadius: 12, padding: "11px 14px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, color: "#C0392B",
              fontWeight: 500,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button className="submit-btn" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span style={{
                  width: 18, height: 18,
                  border: "2.5px solid rgba(255,255,255,0.4)",
                  borderTop: "2.5px solid #fff",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spinLoader 0.7s linear infinite",
                }} />
                {mode === "login" ? "Signing in…" : "Creating account…"}
              </span>
            ) : (
              mode === "login" ? "Sign In →" : "Create Account →"
            )}
          </button>
        </form>

        {/* Footer switch */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, color: "#8B6855",
          textAlign: "center", marginTop: 24,
        }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "signup" : "login")}
            style={{
              background: "none", border: "none",
              color: "#E8734A", fontWeight: 700,
              fontSize: 13, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: "underline",
            }}
          >
            {mode === "login" ? "Sign up free" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}

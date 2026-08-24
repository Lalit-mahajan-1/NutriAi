/**
 * CameraSection — One-shot live body scan in the browser.
 *
 * Flow:
 *   1. User clicks "Start Camera"
 *   2. MediaPipe Pose tracks landmarks, shows skeleton overlay
 *   3. When pose quality ≥ threshold for 45 frames (~3s) → auto-captures ONCE
 *   4. Camera stops. Result (BMI, category, nutrition plan) saved to MongoDB via /api/camera-analyze
 *   5. Past scans timeline loaded from /api/scan-history/:userId
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { mlApi, ScanRecord, BodyAnalysis } from "@/lib/api";
import { UserProfile } from "@/lib/api";

// ── MediaPipe CDN globals ────────────────────────────────────────────────────
declare global {
  interface Window { Pose: any; Camera: any; drawConnectors: any; drawLandmarks: any; POSE_CONNECTIONS: any; }
}

// ── Feature extraction — mirrors live_body_tracking.py ───────────────────────
function extractFeatures(lm: any[]) {
  const [ls, rs, lh, rh, nose, la, ra] = [lm[11], lm[12], lm[23], lm[24], lm[0], lm[27], lm[28]];
  const sw   = Math.abs(ls.x - rs.x);
  const hw   = Math.max(Math.abs(lh.x - rh.x), 1e-6);
  const ww   = hw * 1.15;
  const bh   = Math.max(Math.abs(nose.y - (la.y + ra.y) / 2), 1e-6);
  const tl   = Math.abs(nose.y - (lh.y + rh.y) / 2);
  return {
    waist_hip_ratio:       ww / hw,
    shoulder_waist_ratio:  Math.max(sw / ww, 1e-6),
    torso_leg_ratio:       tl / bh,
    body_aspect_ratio:     bh / Math.max(sw, 1e-6),
  };
}

function poseQuality(lm: any[], w: number) {
  const vis = lm.filter((l: any) => l.visibility > 0.5).length;
  const sw  = Math.abs(lm[11].x - lm[12].x) * w;
  const ds  = (sw > 120 && sw < 180) ? 100 : Math.max(0, 100 - Math.abs(sw - 150) * 2);
  return { quality: Math.round(((vis / 33) * 100 + ds) / 2), visible: vis };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const CAT: Record<string, { label: string; color: string; emoji: string }> = {
  under_weight:    { label: "Underweight",    color: "#3B82F6", emoji: "📉" },
  normal:          { label: "Healthy Weight", color: "#22C55E", emoji: "✅" },
  overweight:      { label: "Overweight",     color: "#F59E0B", emoji: "⚠️" },
  obese:           { label: "Obese",          color: "#EF4444", emoji: "🔴" },
  extremely_obese: { label: "Severely Obese", color: "#DC2626", emoji: "🚨" },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  userId: string;
  profile: UserProfile | null;
  activityLevel?: string;
  onResult?: (r: BodyAnalysis) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CameraSection({ userId, profile, activityLevel = "moderate", onResult }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const poseRef     = useRef<any>(null);
  const cameraRef   = useRef<any>(null);
  const rfRef       = useRef(0);          // ready-frame counter
  const capturedRef = useRef(false);      // capture-once guard

  const [camOn,     setCamOn]     = useState(false);
  const [quality,   setQuality]   = useState(0);
  const [visible,   setVisible]   = useState(0);
  const [stage,     setStage]     = useState<"positioning"|"adjusting"|"ready"|"capturing">("positioning");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [result,    setResult]    = useState<(BodyAnalysis & { scan_id?: string; scanned_at?: string }) | null>(null);
  const [history,   setHistory]   = useState<ScanRecord[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const profileOk = !!(profile?.height && profile?.weight && profile?.age && profile?.gender);

  // ── Load scan history ────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setHistLoading(true);
    try {
      const data = await mlApi.getScanHistory(userId, 8);
      setHistory(data.scans ?? []);
    } catch { /* ML backend may not be running */ }
    setHistLoading(false);
  }, [userId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── stop camera util ─────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cameraRef.current?.stop();
    poseRef.current?.close();
    cameraRef.current = null;
    poseRef.current   = null;
    setCamOn(false);
    rfRef.current     = 0;
    capturedRef.current = false;
    setStage("positioning");
    setQuality(0);
    setCountdown(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── one-shot capture ──────────────────────────────────────────────────────
  const doCapture = useCallback(async (features: ReturnType<typeof extractFeatures>, q: number) => {
    if (capturedRef.current || !profile) return;
    capturedRef.current = true;
    stopCamera();       // camera off immediately after capture
    setLoading(true);
    setError("");
    try {
      const res = await mlApi.cameraAnalyze({
        user_id:        userId,
        height_cm:      profile.height!,
        weight_kg:      profile.weight!,
        age:            profile.age!,
        gender:         profile.gender!,
        activity_level: activityLevel,
        pose_quality:   q,
        ...features,
      });
      if ((res as any).error) { setError((res as any).error); }
      else {
        setResult(res);
        onResult?.(res);
        loadHistory();   // refresh timeline
      }
    } catch {
      setError("ML backend unreachable. Make sure it's running on port 8000.");
    }
    setLoading(false);
  }, [profile, userId, activityLevel, onResult, stopCamera, loadHistory]);

  // ── start camera + MediaPipe ──────────────────────────────────────────────
  const startCamera = useCallback(() => {
    if (!window.Pose || !window.Camera || !profileOk) return;
    setResult(null);
    setError("");
    rfRef.current       = 0;
    capturedRef.current = false;

    const video  = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;

    const pose = new window.Pose({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${f}`,
    });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });

    pose.onResults((results: any) => {
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // mirrored video
      ctx.save(); ctx.scale(-1, 1); ctx.translate(-canvas.width, 0);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (results.poseLandmarks && !capturedRef.current) {
        const lm = results.poseLandmarks;
        // skeleton (mirrored)
        if (window.drawConnectors) {
          ctx.save(); ctx.scale(-1, 1); ctx.translate(-canvas.width, 0);
          window.drawConnectors(ctx, lm, window.POSE_CONNECTIONS, { color: "rgba(232,115,74,.85)", lineWidth: 2 });
          window.drawLandmarks(ctx, lm, { color: "#fff", fillColor: "rgba(232,115,74,.9)", lineWidth: 1, radius: 4 });
          ctx.restore();
        }

        const { quality: q, visible: v } = poseQuality(lm, canvas.width);
        setQuality(q); setVisible(v);

        if (q >= 19) {
          rfRef.current++;
          setStage("ready");
          setCountdown(Math.max(0, Math.ceil((45 - rfRef.current) / 15)));
        } else if (q >= 10) { setStage("adjusting"); rfRef.current = 0; setCountdown(null); }
        else { setStage("positioning"); rfRef.current = 0; setCountdown(null); }

        if (rfRef.current >= 45 && !capturedRef.current) {
          setStage("capturing");
          doCapture(extractFeatures(lm), q);
        }

        drawOverlay(ctx, q, v, canvas.width, canvas.height);
      } else if (!results.poseLandmarks) {
        // no person
        ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff"; ctx.font = "bold 20px DM Sans,sans-serif"; ctx.textAlign = "center";
        ctx.fillText("No person detected", canvas.width / 2, canvas.height / 2 - 12);
        ctx.font = "14px DM Sans,sans-serif"; ctx.fillStyle = "rgba(255,255,255,.7)";
        ctx.fillText("Step into frame · full body visible", canvas.width / 2, canvas.height / 2 + 16);
        rfRef.current = 0; setStage("positioning"); setCountdown(null);
      }
    });

    const camera = new window.Camera(video, { onFrame: async () => pose.send({ image: video }), width: 640, height: 480 });
    camera.start();
    poseRef.current   = pose;
    cameraRef.current = camera;
    setCamOn(true);
  }, [profileOk, doCapture]);

  // ── Draw status overlay (matches Python script style) ────────────────────
  function drawOverlay(ctx: CanvasRenderingContext2D, q: number, v: number, w: number, h: number) {
    const qc = q >= 19 ? "#22C55E" : q >= 10 ? "#F59E0B" : "#EF4444";
    ctx.fillStyle = "rgba(20,20,40,.72)";
    rrect(ctx, 10, 10, 200, 70, 10); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = "10px DM Sans,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("POSE QUALITY", 18, 27);
    ctx.fillStyle = qc; ctx.font = "bold 30px DM Sans,sans-serif";
    ctx.fillText(`${q}%`, 18, 58);
    ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.font = "10px DM Sans,sans-serif";
    ctx.fillText(`${v}/33 pts`, 90, 64);

    const msg = q >= 19 ? "✓ Hold still — auto-capturing…" : q >= 10 ? "Adjust position slightly" : "Stand back · show full body · face forward";
    ctx.fillStyle = "rgba(0,0,0,.52)"; ctx.fillRect(0, h - 46, w, 46);
    ctx.fillStyle = qc; ctx.font = "bold 13px DM Sans,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(msg, w / 2, h - 18);
  }

  function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  const sc = (stage === "ready" || stage === "capturing") ? "#22C55E" : stage === "adjusting" ? "#F59E0B" : "#EF4444";
  const catI = result ? (CAT[result.category] ?? CAT["normal"]) : null;

  return (
    <div className="section" style={{ animation: "fadeUp .5s .3s both" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 900, color: "#3D1F0A", margin: "0 0 2px" }}>
            📸 Live Body Scan
          </h2>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#8B6855", margin: 0 }}>
            AI pose tracking → one-time capture → saved to your history
          </p>
        </div>
        {profileOk ? (
          <button
            onClick={camOn ? stopCamera : startCamera}
            disabled={loading}
            style={{
              padding: "10px 22px", border: "none", borderRadius: 14,
              background: camOn ? "linear-gradient(135deg,#EF4444,#B91C1C)" : "linear-gradient(135deg,#22C55E,#15803D)",
              color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 4px 16px ${camOn ? "rgba(239,68,68,.35)" : "rgba(34,197,94,.35)"}`, transition: "all .2s",
            }}
          >
            {loading ? "⏳ Saving…" : camOn ? "■ Stop" : "▶ Start Scan"}
          </button>
        ) : (
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#C4522E", background: "rgba(232,115,74,.1)", borderRadius: 10, padding: "8px 14px" }}>
            ⚡ Complete profile to enable camera
          </div>
        )}
      </div>

      {/* Camera viewport */}
      <div style={{
        position: "relative", borderRadius: 20, overflow: "hidden",
        background: "#111827", aspectRatio: "4/3", maxHeight: 420,
        display: camOn ? "block" : (loading ? "flex" : (result ? "none" : "flex")),
        alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 28px rgba(0,0,0,.22)",
      }}>
        {!camOn && !loading && !result && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,.45)", padding: 20 }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>📸</div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600 }}>Camera will appear here</div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, marginTop: 6, color: "rgba(255,255,255,.28)" }}>
              Stand ~1.5m away · good lighting · full body visible
            </div>
          </div>
        )}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 20 }}>
            <div style={{ width: 44, height: 44, border: "4px solid rgba(255,255,255,.15)", borderTop: "4px solid #E8734A", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>Running ML analysis · saving to MongoDB…</p>
          </div>
        )}
        <video ref={videoRef} style={{ display: "none" }} playsInline />
        <canvas ref={canvasRef} style={{ display: camOn ? "block" : "none", width: "100%", height: "100%", objectFit: "cover" }} />

        {/* Stage badge */}
        {camOn && (
          <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,.6)", borderRadius: 10, padding: "5px 13px", fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 700, color: sc, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc, display: "inline-block", animation: stage === "ready" ? "pulse 1s ease infinite" : "none" }} />
            {stage === "capturing" ? "🔍 Analyzing…"
              : stage === "ready" ? (countdown != null && countdown > 0 ? `✓ Ready — ${countdown}s` : "✓ Capturing!")
              : stage.charAt(0).toUpperCase() + stage.slice(1)}
          </div>
        )}
      </div>

      {/* Tip row (while scanning) */}
      {camOn && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {["🚶 Stand ~1.5m away", "💡 Good lighting", "👤 Full body visible", "🤚 Arms slightly out"].map(t => (
            <span key={t} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#7A5040", background: "rgba(232,115,74,.08)", borderRadius: 8, padding: "4px 10px" }}>{t}</span>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: 14, background: "rgba(220,60,60,.08)", border: "1px solid rgba(220,60,60,.2)", borderRadius: 12, padding: "10px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#C0392B" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Scan Result */}
      {result && !loading && catI && (
        <div style={{ marginTop: 18, animation: "fadeUp .4s both" }}>
          <div style={{ background: `linear-gradient(135deg,${catI.color}10,${catI.color}06)`, border: `1px solid ${catI.color}33`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 30 }}>{catI.emoji}</span>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 900, color: catI.color }}>{catI.label}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#8B6855" }}>
                  BMI {result.bmi} · Confidence {result.confidence}% · 📸 Saved at {result.scanned_at ? fmtDate(result.scanned_at) : "—"}
                </div>
              </div>
            </div>
            <button
              onClick={() => { setResult(null); setError(""); capturedRef.current = false; }}
              style={{ background: "rgba(212,168,138,.18)", border: "none", borderRadius: 8, padding: "7px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 12, cursor: "pointer", color: "#7A5040", fontWeight: 600 }}
            >
              ↺ Scan again
            </button>
          </div>

          {result.nutrition_plan?.daily_targets && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginTop: 14 }}>
              {[
                { l: "Calories", v: result.nutrition_plan.daily_targets.calories, u: "kcal", c: "#E8734A" },
                { l: "Protein",  v: result.nutrition_plan.daily_targets.protein_g, u: "g",   c: "#22C55E" },
                { l: "Carbs",    v: result.nutrition_plan.daily_targets.carbs_g,   u: "g",   c: "#F59E0B" },
                { l: "Fats",     v: result.nutrition_plan.daily_targets.fats_g,    u: "g",   c: "#A855F7" },
                { l: "Water",    v: +(result.nutrition_plan.daily_targets.water_ml / 1000).toFixed(1), u: "L", c: "#06B6D4" },
              ].map(m => (
                <div key={m.l} style={{ background: "#fff", border: `1px solid ${m.c}33`, borderRadius: 14, padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: m.c }}>{m.v}<span style={{ fontSize: 11, fontWeight: 400, color: "#A07060", marginLeft: 2 }}>{m.u}</span></div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#8B6855", marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Scan History Timeline ─────────────────────────────────────────── */}
      <div style={{ marginTop: 24, borderTop: "1px solid rgba(212,168,138,.2)", paddingTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 800, color: "#3D1F0A", margin: 0 }}>
            📅 Scan History
          </h3>
          <button
            onClick={loadHistory}
            disabled={histLoading}
            style={{ background: "none", border: "1px solid rgba(212,168,138,.4)", borderRadius: 8, padding: "5px 12px", fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#7A5040", cursor: "pointer" }}
          >
            {histLoading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {histLoading && (
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#A07060", padding: "12px 0" }}>
            Loading your scan history…
          </div>
        )}

        {!histLoading && history.length === 0 && (
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#A07060", background: "rgba(212,168,138,.08)", borderRadius: 12, padding: "14px 18px", textAlign: "center" }}>
            No scans yet. Start your first body scan above! 🎯
          </div>
        )}

        {history.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((s, i) => {
              const ci = CAT[s.category] ?? CAT["normal"];
              const targets = s.nutrition_plan?.daily_targets;
              return (
                <div key={s.scan_id} style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  background: i === 0 ? `${ci.color}08` : "#FAFAF8",
                  border: `1px solid ${i === 0 ? ci.color + "33" : "rgba(212,168,138,.18)"}`,
                  borderRadius: 14, padding: "14px 16px",
                }}>
                  {/* Timeline dot */}
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${ci.color},${ci.color}aa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", boxShadow: `0 3px 10px ${ci.color}30` }}>
                      {ci.emoji}
                    </div>
                    {i < history.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 14, background: "rgba(212,168,138,.25)" }} />}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 900, color: ci.color }}>{ci.label}</span>
                      {i === 0 && <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 700, background: ci.color, color: "#fff", borderRadius: 6, padding: "1px 7px" }}>LATEST</span>}
                    </div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#A07060", marginTop: 2 }}>
                      {fmtDate(s.scanned_at)} · BMI {s.bmi} · Confidence {s.confidence}%
                      {s.pose_quality != null && ` · Pose quality ${s.pose_quality}%`}
                    </div>
                    {targets && (
                      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                        {[
                          { l: "🔥 Cal", v: targets.calories,  u: "kcal" },
                          { l: "💪 Pro", v: targets.protein_g,  u: "g" },
                          { l: "🌾 Carbs", v: targets.carbs_g, u: "g" },
                          { l: "🫙 Fat",  v: targets.fats_g,   u: "g" },
                        ].map(m => (
                          <div key={m.l} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, background: "#fff", borderRadius: 8, padding: "3px 8px", border: "1px solid rgba(212,168,138,.2)", color: "#5C3D2E" }}>
                            <span style={{ color: "#A07060" }}>{m.l}</span> <strong>{m.v}{m.u}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

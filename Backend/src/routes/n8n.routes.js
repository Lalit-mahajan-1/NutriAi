const express = require("express");
const User = require("../models/user.model");
const n8nAuth = require("../middlewares/n8n.middleware");

const router = express.Router();
const ML_BASE_URL = process.env.ML_BACKEND_URL || "http://localhost:8000";

router.use(n8nAuth);

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "nutrisight-n8n",
    now: new Date().toISOString(),
    endpoints: [
      "GET /api/n8n/health",
      "GET /api/n8n/users/:userId",
      "GET /api/n8n/users?email=<email>",
      "PATCH /api/n8n/users/:userId",
      "GET /api/n8n/ml/weekly-plan/:userId",
    ],
  });
});

router.get("/users/:userId", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Query param 'email' is required" });
    }
    const user = await User.findOne({ email }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:userId", async (req, res, next) => {
  try {
    const allowed = ["name", "age", "gender", "height", "weight", "activityLevel"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key] === "" ? null : req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get("/ml/weekly-plan/:userId", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const goal = String(req.query.goal || "maintenance");
    const dietaryPref = String(req.query.dietary_pref || "veg");
    let activity = String(req.query.activity_level || user.activityLevel || "moderate");
    if (activity === "active") activity = "very_active";

    const gender = user.gender === "female" ? "female" : "male";
    const params = new URLSearchParams({
      goal,
      dietary_pref: dietaryPref,
      activity_level: activity,
      user_id: String(user._id),
      height: String(user.height ?? 170),
      weight: String(user.weight ?? 70),
      age: String(user.age ?? 25),
      gender,
    });

    const response = await fetch(`${ML_BASE_URL}/api/weekly-plan?${params.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to fetch weekly plan from ML backend",
        detail: data?.detail || data?.message || data,
      });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;


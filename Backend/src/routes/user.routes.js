const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const { getProfile, updateProfile, getUserById } = require("../controllers/user.controller");

// All /api/users routes
router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);
router.get("/:userId", protect, getUserById);

module.exports = router;

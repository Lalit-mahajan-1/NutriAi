const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    // Profile fields — all optional, filled by user after signup
    age: {
      type: Number,
      min: 1,
      max: 120,
      default: null,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", null],
      default: null,
    },
    height: {
      type: Number, // cm
      min: 50,
      max: 300,
      default: null,
    },
    weight: {
      type: Number, // kg
      min: 10,
      max: 500,
      default: null,
    },
    activityLevel: {
      type: String,
      enum: ["sedentary", "light", "moderate", "active", "very_active", null],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
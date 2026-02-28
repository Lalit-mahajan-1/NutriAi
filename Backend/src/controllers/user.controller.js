const User = require("../models/user.model");

// GET /api/users/me — get current logged-in user's profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/me — update current logged-in user's profile
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ["name", "age", "gender", "height", "weight", "activityLevel"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field] === "" ? null : req.body[field];
      }
    });

    // Prevent email/password changes via this route
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:userId — get user by ID (public profile)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select("-password -email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

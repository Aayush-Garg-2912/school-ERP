const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    username: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      default: null,
    },

    phone: {
      type: String,
      trim: true,
    },

    profileImage: {
      type: String,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ school: 1, email: 1 }, { unique: true });
userSchema.index({ school: 1, username: 1 }, { sparse: true });
userSchema.index({ school: 1, phone: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);
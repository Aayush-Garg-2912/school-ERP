const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
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

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    type: {
      type: String,
      enum: ["theory", "practical", "both"],
      default: "theory",
    },

    maxMarks: {
      type: Number,
      default: 100,
    },

    passingMarks: {
      type: Number,
      default: 33,
    },

    isOptional: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

subjectSchema.index(
  {
    school: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Subject", subjectSchema);
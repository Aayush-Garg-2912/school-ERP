const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "unit_test",
        "periodic_test",
        "half_yearly",
        "annual",
        "pre_board",
        "other",
      ],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "draft",
        "scheduled",
        "ongoing",
        "completed",
        "published",
      ],
      default: "draft",
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

examSchema.index({
  school: 1,
  academicYear: 1,
  name: 1,
});

module.exports = mongoose.model("Exam", examSchema);
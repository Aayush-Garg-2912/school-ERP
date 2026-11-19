const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
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

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    order: {
      type: Number,
      required: true,
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

classSchema.index(
  {
    school: 1,
    academicYear: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

classSchema.index(
  {
    school: 1,
    academicYear: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Class", classSchema);
const mongoose = require("mongoose");

const parentStudentSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    relation: {
      type: String,
      enum: [
        "father",
        "mother",
        "guardian",
        "other",
      ],
      required: true,
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

parentStudentSchema.index(
  {
    school: 1,
    parent: 1,
    student: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "ParentStudent",
  parentStudentSchema
);
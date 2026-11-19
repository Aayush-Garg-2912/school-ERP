const mongoose = require("mongoose");

const classSubjectSchema = new mongoose.Schema(
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

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    isCompulsory: {
      type: Boolean,
      default: true,
    },

    periodsPerWeek: {
      type: Number,
      default: 5,
      min: 1,
    },

    maxMarks: {
      type: Number,
      default: 100,
    },

    passingMarks: {
      type: Number,
      default: 33,
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

classSubjectSchema.index(
  {
    school: 1,
    academicYear: 1,
    class: 1,
    subject: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "ClassSubject",
  classSubjectSchema
);
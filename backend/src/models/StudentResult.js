const mongoose = require("mongoose");

const studentResultSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    examSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSubject",
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    theoryMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    practicalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxMarks: {
      type: Number,
      required: true,
    },

    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    grade: {
      type: String,
      default: "",
    },

    isPublished: { type: Boolean, default: false },

    result: {
      type: String,
      enum: ["pass", "fail"],
      default: "fail",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

studentResultSchema.index(
  {
    school: 1,
    exam: 1,
    examSubject: 1,
    student: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "StudentResult",
  studentResultSchema
);
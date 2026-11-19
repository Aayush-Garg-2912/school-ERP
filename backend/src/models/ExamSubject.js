const mongoose = require("mongoose");

const examSubjectSchema = new mongoose.Schema(
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

    maxMarks: {
      type: Number,
      required: true,
      min: 1,
    },

    passingMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    theoryMaxMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    practicalMaxMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    examDate: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      default: "",
    },

    endTime: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

examSubjectSchema.index(
  {
    school: 1,
    exam: 1,
    class: 1,
    subject: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "ExamSubject",
  examSubjectSchema
);
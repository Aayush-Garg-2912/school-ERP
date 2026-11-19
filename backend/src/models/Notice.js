const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "general",
        "academic",
        "event",
        "holiday",
        "exam",
        "fee",
        "emergency",
        "other",
      ],
      default: "general",
    },

    targetAudience: [
      {
        type: String,
        enum: [
          "all",
          "teacher",
          "staff",
          "student",
          "parent",
        ],
      },
    ],

    published: {
      type: Boolean,
      default: false,
    },

    pinned: {
      type: Boolean,
      default: false,
    },

    publishDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    attachment: {
      type: String,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

noticeSchema.index({
  school: 1,
  published: 1,
  pinned: 1,
});

noticeSchema.index({
  school: 1,
  targetAudience: 1,
});

module.exports = mongoose.model(
  "Notice",
  noticeSchema
);
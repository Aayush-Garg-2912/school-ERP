const mongoose = require("mongoose");

const whatsAppMessageSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    recipientType: {
      type: String,
      enum: ["student", "parent", "teacher", "staff", "general"],
      required: true,
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      refPath: "recipientModel",
    },

    recipientModel: {
      type: String,
      enum: ["Student", "Parent", "Teacher", "User", null],
      default: null,
    },

    recipientName: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    messageType: {
      type: String,
      enum: [
        "birthday",
        "fee_receipt",
        "fee_reminder",
        "festival",
        "announcement",
        "emergency",
        "custom",
      ],
      required: true,
      default: "custom",
    },

    targetScope: {
      type: String,
      enum: ["individual", "class", "school", "staff"],
      default: "individual",
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },

    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },

    content: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "failed"],
      default: "sent",
    },

    gateway: {
      type: String,
      enum: ["meta_cloud_api", "twilio", "ultramsg", "simulator"],
      default: "simulator",
    },

    gatewayResponseId: {
      type: String,
      default: null,
    },

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

whatsAppMessageSchema.index({ school: 1, createdAt: -1 });
whatsAppMessageSchema.index({ school: 1, messageType: 1 });
whatsAppMessageSchema.index({ school: 1, phoneNumber: 1 });

module.exports = mongoose.model("WhatsAppMessage", whatsAppMessageSchema);

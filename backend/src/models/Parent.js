const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
  unique: true,
},

    parentId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    relation: {
      type: String,
      enum: [
        "father",
        "mother",
        "guardian",
        "other",
      ],
      default: "guardian",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

parentSchema.index(
  {
    school: 1,
    parentId: 1,
  },
  {
    unique: true,
  }
);

parentSchema.index(
  {
    school: 1,
    phone: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Parent", parentSchema);
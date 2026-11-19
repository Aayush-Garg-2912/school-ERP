const mongoose = require("mongoose");

const feeStructureSchema = new mongoose.Schema(
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

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    components: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },

        amount: {
          type: Number,
          required: true,
          min: 0,
        },

        frequency: {
          type: String,
          enum: [
            "one_time",
            "monthly",
            "quarterly",
            "half_yearly",
            "yearly",
          ],
          default: "yearly",
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

feeStructureSchema.index({
  school: 1,
  academicYear: 1,
  class: 1,
});

module.exports = mongoose.model(
  "FeeStructure",
  feeStructureSchema
);
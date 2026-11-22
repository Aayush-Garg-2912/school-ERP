const mongoose = require("mongoose");

const feeComponentSchema = new mongoose.Schema(
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
      enum: ["one_time", "monthly", "quarterly", "half_yearly", "yearly"],
      default: "yearly",
    },
    category: {
      type: String,
      enum: ["annual", "tuition", "transport", "extra", "other"],
      default: "other",
    },
  },
  { _id: false }
);

const studentFeeSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },

    feeStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: false,
    },

    // Itemized components breakdown
    components: [feeComponentSchema],

    // Specific fee categories breakdown for transparent management
    annualCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    monthlyTuition: {
      type: Number,
      default: 0,
      min: 0,
    },

    tuitionMonths: {
      type: Number,
      default: 12,
      min: 1,
      max: 12,
    },

    transportFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    transportDetails: {
      opted: { type: Boolean, default: false },
      vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TransportVehicle",
        default: null,
      },
      busNumber: { type: String, default: "", trim: true },
      route: { type: String, default: "", trim: true },
      pickupPoint: { type: String, default: "", trim: true },
      pickupTime: { type: String, default: "", trim: true },
      dropTime: { type: String, default: "", trim: true },
      driverName: { type: String, default: "", trim: true },
      driverPhone: { type: String, default: "", trim: true },
    },

    extraFees: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Concession / Scholarship / Offer details
    offer: {
      name: { type: String, default: "", trim: true },
      type: {
        type: String,
        enum: ["percentage", "flat", "none"],
        default: "none",
      },
      value: { type: Number, default: 0, min: 0 },
      discountAmount: { type: Number, default: 0, min: 0 },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    payableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue"],
      default: "pending",
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

studentFeeSchema.index({
  school: 1,
  student: 1,
  academicYear: 1,
});

studentFeeSchema.index({
  school: 1,
  academicYear: 1,
  status: 1,
});

module.exports = mongoose.model("StudentFee", studentFeeSchema);

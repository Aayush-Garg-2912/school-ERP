const mongoose = require("mongoose");

const guardianSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    fatherName: {
      type: String,
      trim: true,
      default: "",
    },

    motherName: {
      type: String,
      trim: true,
      default: "",
    },

    guardianName: {
      type: String,
      trim: true,
      default: "",
    },

    relation: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const studentSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    admissionNumber: {
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

    middleName: {
      type: String,
      trim: true,
      default: "",
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    bloodGroup: {
      type: String,
      trim: true,
      default: "",
    },

    photo: {
      type: String,
      default: "",
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

    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    rollNumber: {
      type: Number,
      required: true,
    },

    guardian: {
      type: guardianSchema,
      default: {},
    },

    admissionDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "transferred",
        "graduated",
        "left",
      ],
      default: "active",
    },

    // Transport / School Bus Service Details
    transport: {
      opted: {
        type: Boolean,
        default: false,
      },
      vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TransportVehicle",
        default: null,
      },
      busNumber: {
        type: String,
        trim: true,
        default: "",
      },
      routeName: {
        type: String,
        trim: true,
        default: "",
      },
      pickupPoint: {
        type: String,
        trim: true,
        default: "",
      },
      pickupTime: {
        type: String,
        trim: true,
        default: "",
      },
      dropTime: {
        type: String,
        trim: true,
        default: "",
      },
      driverName: {
        type: String,
        trim: true,
        default: "",
      },
      driverPhone: {
        type: String,
        trim: true,
        default: "",
      },
      annualFee: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
      },
      assignedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
  }
);

studentSchema.index(
  {
    school: 1,
    admissionNumber: 1,
  },
  {
    unique: true,
  }
);

studentSchema.index({
  school: 1,
  academicYear: 1,
  class: 1,
  section: 1,
});

studentSchema.index({
  school: 1,
  "transport.opted": 1,
});

studentSchema.index({
  school: 1,
  "transport.vehicle": 1,
});

module.exports = mongoose.model(
  "Student",
  studentSchema
);
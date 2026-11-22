const mongoose = require("mongoose");

const busStopSchema = new mongoose.Schema(
  {
    stopName: {
      type: String,
      required: true,
      trim: true,
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
    fare: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const transportVehicleSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    busNumber: {
      type: String,
      required: [true, "Bus/Vehicle number is required"],
      trim: true,
      uppercase: true,
    },
    vehicleModel: {
      type: String,
      trim: true,
      default: "School Bus",
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: "",
    },
    capacity: {
      type: Number,
      required: true,
      default: 40,
      min: 1,
    },
    routeName: {
      type: String,
      required: [true, "Route name is required"],
      trim: true,
    },
    driverName: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true,
    },
    driverPhone: {
      type: String,
      required: [true, "Driver phone is required"],
      trim: true,
    },
    driverLicense: {
      type: String,
      trim: true,
      default: "",
    },
    attendantName: {
      type: String,
      trim: true,
      default: "",
    },
    attendantPhone: {
      type: String,
      trim: true,
      default: "",
    },
    pickupTime: {
      type: String,
      trim: true,
      default: "07:30 AM",
    },
    dropTime: {
      type: String,
      trim: true,
      default: "02:30 PM",
    },
    annualFee: {
      type: Number,
      default: 12000,
      min: 0,
    },
    stops: [busStopSchema],
    status: {
      type: String,
      enum: ["active", "maintenance", "inactive"],
      default: "active",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

transportVehicleSchema.index({ school: 1, busNumber: 1 }, { unique: true });

module.exports = mongoose.model("TransportVehicle", transportVehicleSchema);

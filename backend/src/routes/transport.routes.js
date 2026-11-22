const express = require("express");
const {
  getVehicles,
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getTransportStudents,
  assignStudentTransport,
  getMyTransport,
} = require("../controllers/transport.controller");
const { protect } = require("../middleware/auth.middleware");
const { allowPermissions } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Self-service endpoint for students and parents (no special permission required beyond being logged in)
router.get("/my-transport", protect, getMyTransport);

// Fleet management & passenger routes
router.get("/vehicles", protect, allowPermissions("transport:view"), getVehicles);
router.post("/vehicles", protect, allowPermissions("transport:create"), createVehicle);
router.get("/vehicles/:id", protect, allowPermissions("transport:view"), getVehicleById);
router.put("/vehicles/:id", protect, allowPermissions("transport:update"), updateVehicle);
router.delete("/vehicles/:id", protect, allowPermissions("transport:delete"), deleteVehicle);

// Students enrolled in transport
router.get("/students", protect, allowPermissions("transport:view"), getTransportStudents);

// Assign / unassign bus for a student
router.post("/assign", protect, allowPermissions("transport:update"), assignStudentTransport);

module.exports = router;

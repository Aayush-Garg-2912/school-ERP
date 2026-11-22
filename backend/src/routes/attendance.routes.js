const express = require("express");

const {
  markAttendance,
  getAttendance,
  updateAttendance,
  deleteAttendance,
  getMyChildAttendance,
} = require("../controllers/attendance.controller");

const { protect } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { allowPermissions } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Only teachers can submit attendance; class teacher check is enforced in controller
router.post(
  "/",
  protect,
  allowRoles("teacher"),
  allowPermissions("attendance:create"),
  markAttendance
);

router.get(
  "/",
  protect,
  allowPermissions("attendance:view"),
  getAttendance
);

router.get(
  "/my-child/:studentId",
  protect,
  getMyChildAttendance
);

router.put(
  "/:id",
  protect,
  allowRoles("teacher"),
  allowPermissions("attendance:update"),
  updateAttendance
);

router.delete(
  "/:id",
  protect,
  allowRoles("teacher"),
  allowPermissions("attendance:delete"),
  deleteAttendance
);

module.exports = router;
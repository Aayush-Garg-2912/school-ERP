const express = require("express");

const {
  markAttendance,
  getAttendance,
  updateAttendance,
  deleteAttendance,
   getMyChildAttendance,
} = require("../controllers/attendance.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
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
  allowPermissions("attendance:update"),
  updateAttendance
);

router.delete(
  "/:id",
  protect,
  allowPermissions("attendance:delete"),
  deleteAttendance
);

module.exports = router;
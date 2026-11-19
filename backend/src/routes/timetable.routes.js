const express = require("express");

const {
  createTimetable,
  getTimetable,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
} = require("../controllers/timetable.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("timetable:create"),
  createTimetable
);

router.get(
  "/",
  protect,
  allowPermissions("timetable:view"),
  getTimetable
);

router.get(
  "/:id",
  protect,
  allowPermissions("timetable:view"),
  getTimetableById
);

router.patch(
  "/:id",
  protect,
  allowPermissions("timetable:update"),
  updateTimetable
);

router.delete(
  "/:id",
  protect,
  allowPermissions("timetable:delete"),
  deleteTimetable
);

module.exports = router;
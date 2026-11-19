const express = require("express");

const {
  createTeacherAssignment,
  getTeacherAssignments,
  getTeacherAssignmentById,
  updateTeacherAssignment,
  deleteTeacherAssignment,
} = require("../controllers/teacherAssignment.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("teacherAssignment:create"),
  createTeacherAssignment
);

router.get(
  "/",
  protect,
  allowPermissions("teacherAssignment:view"),
  getTeacherAssignments
);

router.get(
  "/:id",
  protect,
  allowPermissions("teacherAssignment:view"),
  getTeacherAssignmentById
);

router.put(
  "/:id",
  protect,
  allowPermissions("teacherAssignment:update"),
  updateTeacherAssignment
);

router.delete(
  "/:id",
  protect,
  allowPermissions("teacherAssignment:delete"),
  deleteTeacherAssignment
);

module.exports = router;
const express = require("express");

const {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacher.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("teacher:create"),
  createTeacher
);

router.get(
  "/",
  protect,
  allowPermissions("teacher:view"),
  getTeachers
);

router.get(
  "/:id",
  protect,
  allowPermissions("teacher:view"),
  getTeacherById
);

router.put(
  "/:id",
  protect,
  allowPermissions("teacher:update"),
  updateTeacher
);

router.delete(
  "/:id",
  protect,
  allowPermissions("teacher:delete"),
  deleteTeacher
);

module.exports = router;
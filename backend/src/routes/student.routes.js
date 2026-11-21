const express = require("express");

const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  promoteStudents,
  getNextAdmissionNumber,
  getNextRollNumber,
} = require("../controllers/student.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("student:create"),
  createStudent
);

router.post(
  "/promote",
  protect,
  allowPermissions("student:update"),
  promoteStudents
);

router.get(
  "/",
  protect,
  allowPermissions("student:view"),
  getStudents
);

router.get(
  "/next-admission-number",
  protect,
  allowPermissions("student:view"),
  getNextAdmissionNumber
);

router.get(
  "/next-roll-number",
  protect,
  allowPermissions("student:view"),
  getNextRollNumber
);

router.get(
  "/:id",
  protect,
  allowPermissions("student:view"),
  getStudentById
);

router.put(
  "/:id",
  protect,
  allowPermissions("student:update"),
  updateStudent
);

router.delete(
  "/:id",
  protect,
  allowPermissions("student:delete"),
  deleteStudent
);

module.exports = router;

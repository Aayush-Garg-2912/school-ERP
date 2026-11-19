const express = require("express");

const {
  createExam,
  getExams,
  getExamById,
  addExamSubject,
  updateExamStatus,
  deleteExam,
} = require("../controllers/exam.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("exam:create"),
  createExam
);

router.get(
  "/",
  protect,
  allowPermissions("exam:view"),
  getExams
);

router.get(
  "/:id",
  protect,
  allowPermissions("exam:view"),
  getExamById
);

router.post(
  "/:id/subjects",
  protect,
  allowPermissions("exam:create"),
  addExamSubject
);

router.delete(
  "/:id",
  protect,
  allowPermissions("exam:delete"),
  deleteExam
);

router.patch(
  "/:id/status",
  protect,
  allowPermissions("exam:update"),
  updateExamStatus
);

module.exports = router;
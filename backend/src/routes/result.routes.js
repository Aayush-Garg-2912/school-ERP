const express = require("express");

const {
  enterResult,
  getStudentResult,
  getExamResults,
   getReportCard,
  updateResult,
  publishResults,
} = require("../controllers/result.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("result:create"),
  enterResult
);

router.put(
  "/:id",
  protect,
  allowPermissions("result:update"),
  updateResult
);

router.patch(
  "/exam/:examId/publish",
  protect,
  allowPermissions("result:publish"),
  publishResults
);

router.get(
  "/student/:studentId/exam/:examId",
  protect,
  allowPermissions("result:view"),
  getStudentResult
);

router.get(
  "/exam/:examId",
  protect,
  allowPermissions("result:view"),
  getExamResults
);
router.get(
  "/report-card/:studentId/:examId",
  protect,
  allowPermissions("result:view"),
  getReportCard
);

module.exports = router;
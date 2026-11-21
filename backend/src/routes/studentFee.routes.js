const express = require("express");

const {
  createStudentFee,
  getStudentFees,
  getStudentFeeById,
  updateStudentFee,
  deleteStudentFee,
  sendSingleFeeReminder,
} = require("../controllers/studentFee.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("studentFee:create"),
  createStudentFee
);

router.get(
  "/",
  protect,
  allowPermissions("studentFee:view"),
  getStudentFees
);

router.get(
  "/:id",
  protect,
  allowPermissions("studentFee:view"),
  getStudentFeeById
);

router.put(
  "/:id",
  protect,
  allowPermissions("studentFee:update"),
  updateStudentFee
);

router.delete(
  "/:id",
  protect,
  allowPermissions("studentFee:delete"),
  deleteStudentFee
);

router.post(
  "/:id/remind",
  protect,
  allowPermissions("whatsapp:send", "studentFee:view", "fee:view"),
  sendSingleFeeReminder
);

module.exports = router;

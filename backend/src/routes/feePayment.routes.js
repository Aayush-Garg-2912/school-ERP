const express = require("express");

const {
  createFeePayment,
  getFeePayments,
  getFeePaymentById,
  refundFeePayment,
} = require("../controllers/feePayment.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("feePayment:create"),
  createFeePayment
);

router.get(
  "/",
  protect,
  allowPermissions("feePayment:view"),
  getFeePayments
);

router.post(
  "/:id/refund",
  protect,
  allowPermissions("fee:refund"),
  refundFeePayment
);

router.delete(
  "/:id",
  protect,
  allowPermissions("fee:refund"),
  refundFeePayment
);

router.get(
  "/:id",
  protect,
  allowPermissions("feePayment:view"),
  getFeePaymentById
);

module.exports = router;
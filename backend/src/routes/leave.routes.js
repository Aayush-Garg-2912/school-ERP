const express = require("express");

const {
  createLeave,
  getLeaves,
  reviewLeave,
  cancelLeave,
} = require("../controllers/leave.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("leave:create"),
  createLeave
);

router.get(
  "/",
  protect,
  allowPermissions("leave:view"),
  getLeaves
);

router.patch(
  "/:id/review",
  protect,
  allowPermissions("leave:approve"),
  reviewLeave
);

router.patch(
  "/:id/cancel",
  protect,
  allowPermissions("leave:cancel"),
  cancelLeave
);

module.exports = router;
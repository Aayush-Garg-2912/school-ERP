const express = require("express");

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require(
  "../controllers/notification.controller"
);

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require(
  "../middleware/permissionMiddleware"
);

const router = express.Router();

router.get(
  "/",
  protect,
  allowPermissions("notification:view"),
  getNotifications
);

router.patch(
  "/:id/read",
  protect,
  allowPermissions("notification:update"),
  markAsRead
);

router.patch(
  "/read-all",
  protect,
  allowPermissions("notification:update"),
  markAllAsRead
);

module.exports = router;
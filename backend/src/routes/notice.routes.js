const express = require("express");

const {
  createNotice,
  getNotices,
  getAllNotices,
  updateNotice,
  deleteNotice,
  togglePublish,
  togglePin,
} = require("../controllers/notice.controller");

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("notice:create"),
  createNotice
);

router.get(
  "/",
  protect,
  allowPermissions("notice:view"),
  getNotices
);

router.get(
  "/all",
  protect,
  allowPermissions("notice:view"),
  getAllNotices
);

router.patch(
  "/:id",
  protect,
  allowPermissions("notice:update"),
  updateNotice
);

router.patch(
  "/:id/publish",
  protect,
  allowPermissions("notice:publish"),
  togglePublish
);

router.patch(
  "/:id/pin",
  protect,
  allowPermissions("notice:pin"),
  togglePin
);

router.delete(
  "/:id",
  protect,
  allowPermissions("notice:delete"),
  deleteNotice
);

module.exports = router;
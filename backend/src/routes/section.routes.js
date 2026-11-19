const express = require("express");

const {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
} = require("../controllers/section.controller");

const { protect } = require("../middleware/auth.middleware");
const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("section:create"),
  createSection
);

router.get(
  "/",
  protect,
  allowPermissions("section:view"),
  getSections
);

router.get(
  "/:id",
  protect,
  allowPermissions("section:view"),
  getSectionById
);

router.put(
  "/:id",
  protect,
  allowPermissions("section:update"),
  updateSection
);

router.delete(
  "/:id",
  protect,
  allowPermissions("section:delete"),
  deleteSection
);

module.exports = router;
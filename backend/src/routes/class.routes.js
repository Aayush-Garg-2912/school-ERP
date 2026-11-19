const express = require("express");

const {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
} = require("../controllers/class.controller");

const { protect } = require("../middleware/auth.middleware");
const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("class:create"),
  createClass
);

router.get(
  "/",
  protect,
  allowPermissions("class:view"),
  getClasses
);

router.get(
  "/:id",
  protect,
  allowPermissions("class:view"),
  getClassById
);

router.put(
  "/:id",
  protect,
  allowPermissions("class:update"),
  updateClass
);

router.delete(
  "/:id",
  protect,
  allowPermissions("class:delete"),
  deleteClass
);

module.exports = router;
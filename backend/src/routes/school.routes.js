const express = require("express");

const {
  getSchool,
  updateSchool,
} = require("../controllers/school.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowRoles,
} = require("../middleware/roleMiddleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  allowRoles("chairman", "principal", "admin"),
  getSchool
);

router.put(
  "/",
  protect,
  allowPermissions("school:update"),
  updateSchool
);

module.exports = router;
const express = require("express");

const { getDashboard } = require("../controllers/chairman.controller");

const { protect } = require("../middleware/auth.middleware");

const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/dashboard",
  protect,
  allowRoles("chairman"),
  getDashboard
);

module.exports = router;
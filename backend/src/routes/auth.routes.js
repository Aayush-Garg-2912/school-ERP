const express = require("express");
const {
  registerChairman,
  login,
  refresh,
  logout,
  getMe,
  chairmanDashboard,
  studentManagementTest,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { allowPermissions } = require("../middleware/permissionMiddleware");
const router = express.Router();
router.post("/register-chairman", registerChairman);
router.post("/login", login);
router.post("/refresh", refresh);
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);
router.get(
  "/chairman-dashboard",
  protect,
  allowRoles("chairman"),
  chairmanDashboard,
);
router.get(
  "/student-management-test",
  protect,
  allowPermissions("student:view"),
  studentManagementTest,
);
module.exports = router;

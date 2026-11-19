const authService = require("../services/auth.service");
const registerChairman = async (req, res) => {
  try {
    return res
      .status(201)
      .json({
        success: true,
        message: "Chairman registered successfully",
        data: await authService.registerChairman(req.body),
      });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    return res
      .status(200)
      .json({
        success: true,
        message: "Login successful",
        data: await authService.loginUser(email, password),
      });
  } catch (e) {
    return res.status(401).json({ success: false, message: e.message });
  }
};
const refresh = async (req, res) => {
  try {
    return res
      .status(200)
      .json({
        success: true,
        message: "Token refreshed successfully",
        data: await authService.refreshUser(
          req.body.refreshToken || req.cookies?.refreshToken,
        ),
      });
  } catch (e) {
    return res.status(401).json({ success: false, message: e.message });
  }
};
const logout = async (req, res) => {
  await authService.logoutUser(req.user._id);
  res.clearCookie("refreshToken");
  return res.json({ success: true, message: "Logged out successfully" });
};
const getMe = async (req, res) =>
  res.json({ success: true, data: { user: req.user } });
const chairmanDashboard = async (req, res) =>
  res.json({
    success: true,
    message: "Welcome to Chairman Dashboard",
    user: {
      name: req.user.name,
      role: req.user.role.name,
      school: req.user.school.name,
    },
  });
const studentManagementTest = async (req, res) =>
  res.json({
    success: true,
    message: "You have permission to manage students",
    user: { name: req.user.name, role: req.user.role.name },
  });
module.exports = {
  registerChairman,
  login,
  refresh,
  logout,
  getMe,
  chairmanDashboard,
  studentManagementTest,
};

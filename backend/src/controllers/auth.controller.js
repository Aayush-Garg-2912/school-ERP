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
    const identifier = req.body.email || req.body.username || req.body.identifier;
    const { password } = req.body;
    if (!identifier || !password)
      return res
        .status(400)
        .json({ success: false, message: "Username/Email and password are required" });
    return res
      .status(200)
      .json({
        success: true,
        message: "Login successful",
        data: await authService.loginUser(identifier, password),
      });
  } catch (e) {
    return res.status(401).json({ success: false, message: e.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Current and new password are required" });
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New passwords do not match" });
    }
    const result = await authService.changePassword(
      req.user._id,
      currentPassword,
      newPassword
    );
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
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
  changePassword,
  refresh,
  logout,
  getMe,
  chairmanDashboard,
  studentManagementTest,
};

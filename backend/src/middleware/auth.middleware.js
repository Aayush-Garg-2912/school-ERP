const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = header.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // 1. Verify JWT
    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      console.error("JWT verification error:", error.message);

      return res.status(401).json({
        success: false,
        message:
          error.name === "TokenExpiredError"
            ? "Access token expired"
            : "Invalid access token",
      });
    }

    // 2. Find user
    const user = await User.findById(decoded.userId)
      .populate({
        path: "role",
        select: "name permissions",
        populate: {
          path: "permissions",
          select: "name module action",
        },
      })
      .populate("school", "name code")
      .populate("teacher")
      .populate("student")
      .populate("parent");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // 3. Account status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // 4. Validate school context
    if (
      decoded.schoolId &&
      (!user.school ||
        String(decoded.schoolId) !== String(user.school._id))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token context",
      });
    }

    // 5. Attach authenticated user
    req.user = user;
    req.auth = {
      userId: decoded.userId,
      schoolId: decoded.schoolId,
      roleId: decoded.roleId,
    };

    next();
  } catch (e) {
  console.error("AUTH ERROR:", e);

  return res.status(500).json({
    success: false,
    message: "Authentication processing failed",
  });
}
};

module.exports = { protect };
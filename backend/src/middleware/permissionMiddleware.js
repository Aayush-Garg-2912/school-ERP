const allowPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const roleName = req.user.role.name || req.user.role;

    // Super-administrative roles bypass specific permission checks
    if (["chairman", "principal", "admin"].includes(roleName)) {
      return next();
    }

    // Accountant has access to transport and fee operations
    if (roleName === "accountant" && requiredPermissions.every((p) => p.startsWith("transport:") || p.startsWith("fee:"))) {
      return next();
    }

    const userPermissions = (req.user.role.permissions || []).map(
      (permission) => (typeof permission === "string" ? permission : permission.name)
    );

    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have the required permission",
        requiredPermissions,
      });
    }

    next();
  };
};

module.exports = {
  allowPermissions,
};
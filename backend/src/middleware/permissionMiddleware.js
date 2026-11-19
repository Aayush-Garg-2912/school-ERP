const allowPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userPermissions = req.user.role.permissions.map(
      (permission) => permission.name
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
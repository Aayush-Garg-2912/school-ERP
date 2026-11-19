const jwt = require('jsonwebtoken');

const getSecrets = () => {
  const access = process.env.JWT_ACCESS_SECRET || 'school_erp_access_secret_fallback_2026_super_secure_key';
  const refresh = process.env.JWT_REFRESH_SECRET || 'school_erp_refresh_secret_fallback_2026_super_secure_key';
  return { access, refresh };
};

const generateAccessToken = (user) => jwt.sign(
  {
    userId: user._id.toString(),
    schoolId: (user.school?._id || user.school || '').toString(),
    roleId: (user.role?._id || user.role || '').toString(),
  },
  getSecrets().access,
  { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
);

const generateRefreshToken = (user) => jwt.sign(
  {
    userId: user._id.toString(),
    tokenVersion: user.tokenVersion || 0,
  },
  getSecrets().refresh,
  { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
);

const verifyAccessToken = (token) => jwt.verify(token, getSecrets().access);
const verifyRefreshToken = (token) => jwt.verify(token, getSecrets().refresh);

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };


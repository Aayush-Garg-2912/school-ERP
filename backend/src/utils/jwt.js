const jwt = require('jsonwebtoken');
const getSecrets = () => { if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) throw new Error('JWT secrets are not configured'); return { access: process.env.JWT_ACCESS_SECRET, refresh: process.env.JWT_REFRESH_SECRET }; };
const generateAccessToken = (user) => jwt.sign({ userId:user._id.toString(), schoolId:(user.school._id||user.school).toString(), roleId:(user.role._id||user.role).toString() }, getSecrets().access, { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' });
const generateRefreshToken = (user) => jwt.sign({ userId:user._id.toString(), tokenVersion:user.tokenVersion||0 }, getSecrets().refresh, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
const verifyAccessToken = (token) => jwt.verify(token, getSecrets().access);
const verifyRefreshToken = (token) => jwt.verify(token, getSecrets().refresh);
module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };

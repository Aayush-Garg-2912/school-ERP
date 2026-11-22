const crypto = require("crypto");
const { hashPassword, comparePassword } = require("../utils/password");
const User = require("../models/User");
const School = require("../models/School");
const Role = require("../models/Role");
const Student = require("../models/Student");
const Parent = require("../models/Parent");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const issueTokens = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  phone: user.phone,
  role: user.role?.name || user.role,
  school: user.school,
  teacher: user.teacher,
  student: user.student,
  parent: user.parent,
});

const registerChairman = async (data) => {
  const { name, email, password, schoolName, schoolCode, phone, address } = data;
  if (!name || !email || !password || !schoolName || !schoolCode) {
    throw new Error("Name, email, password, school name and school code are required");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  const code = schoolCode.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (await School.findOne({ code })) {
    throw new Error("School code already exists");
  }
  if (await User.findOne({ email: normalizedEmail })) {
    throw new Error("Email already registered");
  }
  const role = await Role.findOne({ name: "chairman" });
  if (!role) {
    throw new Error("Chairman role not found. Run npm run seed first");
  }

  const school = await School.create({
    name: schoolName.trim(),
    code,
    phone,
    address,
  });

  try {
    const chairman = await User.create({
      school: school._id,
      name: name.trim(),
      email: normalizedEmail,
      username: normalizedEmail,
      password: await hashPassword(password),
      role: role._id,
      phone,
    });
    const tokens = await issueTokens(chairman);
    return {
      ...tokens,
      school: { id: school._id, name: school.name, code: school.code },
      chairman: {
        id: chairman._id,
        name: chairman.name,
        email: chairman.email,
        role: "chairman",
      },
    };
  } catch (e) {
    await School.findByIdAndDelete(school._id);
    throw e;
  }
};

/**
 * Universal Login: Supports Email, Username, Phone Number, Admission Number, or Parent ID
 */
const loginUser = async (identifier, password) => {
  if (!identifier || !password) {
    throw new Error("Username/Email and password are required");
  }

  const cleanId = String(identifier).trim().toLowerCase();
  const rawDigits = cleanId.replace(/[^0-9]/g, "");

  // 1. Check User model directly by email, username, or phone
  let user = await User.findOne({
    $or: [
      { email: cleanId },
      { username: cleanId },
      ...(cleanId ? [{ phone: cleanId }] : []),
      ...(rawDigits.length >= 7 ? [{ phone: rawDigits }] : []),
    ],
  })
    .select("+password +refreshTokenHash")
    .populate("role", "name permissions")
    .populate("school", "name code");

  // 2. If not found, check if identifier matches a Student's admission number or phone
  if (!user) {
    const student = await Student.findOne({
      $or: [
        { admissionNumber: cleanId.toUpperCase() },
        { phone: cleanId },
        ...(rawDigits.length >= 7 ? [{ phone: rawDigits }] : []),
      ],
    }).populate("user");

    if (student?.user) {
      const userDocId = student.user._id || student.user;
      user = await User.findById(userDocId)
        .select("+password +refreshTokenHash")
        .populate("role", "name permissions")
        .populate("school", "name code");
    }
  }

  // 3. If not found, check if identifier matches a Parent's phone or parentId
  if (!user) {
    const parent = await Parent.findOne({
      $or: [
        { parentId: cleanId.toUpperCase() },
        { phone: cleanId },
        ...(rawDigits.length >= 7 ? [{ phone: rawDigits }] : []),
      ],
    }).populate("user");

    if (parent?.user) {
      const userDocId = parent.user._id || parent.user;
      user = await User.findById(userDocId)
        .select("+password +refreshTokenHash")
        .populate("role", "name permissions")
        .populate("school", "name code");
    }
  }

  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error("Invalid username/email or password");
  }

  if (!user.isActive) {
    throw new Error("Your account has been deactivated");
  }

  user.lastLogin = new Date();
  const tokens = await issueTokens(user);
  return { ...tokens, user: publicUser(user) };
};

/**
 * Change Password for any authenticated role
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  if (!newPassword || String(newPassword).length < 6) {
    throw new Error("New password must be at least 6 characters long");
  }

  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new Error("User account not found");
  }

  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  user.password = await hashPassword(newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.refreshTokenHash = null; // Invalidate previous session tokens for safety
  await user.save();

  return {
    success: true,
    message: "Password changed successfully",
  };
};

const refreshUser = async (token) => {
  if (!token) throw new Error("Refresh token is required");
  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.userId)
    .select("+refreshTokenHash")
    .populate("role", "name permissions")
    .populate("school", "name code");

  if (
    !user ||
    !user.isActive ||
    user.tokenVersion !== (decoded.tokenVersion || 0) ||
    user.refreshTokenHash !== hashToken(token)
  ) {
    throw new Error("Invalid refresh token");
  }

  return { ...await issueTokens(user), user: publicUser(user) };
};

const logoutUser = async (id) =>
  User.findByIdAndUpdate(id, {
    $set: { refreshTokenHash: null },
    $inc: { tokenVersion: 1 },
  });

module.exports = {
  registerChairman,
  loginUser,
  changePassword,
  refreshUser,
  logoutUser,
};

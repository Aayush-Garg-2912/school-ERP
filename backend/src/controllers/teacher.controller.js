const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const Role = require("../models/Role");
const tempPassword = () => crypto.randomBytes(5).toString("base64url");
const createTeacher = async (req, res) => {
  try {
    const { employeeId, firstName, lastName, email, phone, password, ...rest } =
      req.body;
    if (!employeeId || !firstName || !email)
      return res
        .status(400)
        .json({
          success: false,
          message: "Employee ID, first name and email are required",
        });
    const schoolId = req.user.school._id,
      normalized = email.toLowerCase(),
      employee = employeeId.toUpperCase();
    if (
      await Teacher.findOne({
        school: schoolId,
        $or: [{ employeeId: employee }, { email: normalized }],
      })
    )
      return res
        .status(409)
        .json({
          success: false,
          message: "Teacher with this employee ID or email already exists",
        });
    if (await User.findOne({ school: schoolId, email: normalized }))
      return res
        .status(409)
        .json({ success: false, message: "Email is already registered" });
    const role = await Role.findOne({ name: "teacher" });
    if (!role)
      return res
        .status(500)
        .json({ success: false, message: "Teacher role is not configured" });
    const plain = password || tempPassword();
    const teacher = await Teacher.create({
      school: schoolId,
      employeeId: employee,
      firstName,
      lastName,
      email: normalized,
      phone,
      ...rest,
    });
    try {
      const user = await User.create({
        school: schoolId,
        name: `${firstName} ${lastName || ""}`.trim(),
        email: normalized,
        password: await bcrypt.hash(plain, 12),
        role: role._id,
        phone,
        teacher: teacher._id,
      });
      teacher.user = user._id;
      await teacher.save();
      return res
        .status(201)
        .json({
          success: true,
          message: "Teacher and login account created successfully",
          data: {
            teacher,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              role: "teacher",
            },
            temporaryPassword: password ? undefined : plain,
          },
        });
    } catch (e) {
      await teacher.deleteOne();
      throw e;
    }
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({
        success: false,
        message: e.message || "Failed to create teacher",
      });
  }
};
const getTeachers = async (req, res) => {
  try {
    const filter = { school: req.user.school._id };
    if (req.query.department) filter.department = req.query.department;
    if (req.query.isActive !== undefined)
      filter.isActive = req.query.isActive === "true";
    const teachers = await Teacher.find(filter)
      .populate("user", "email isActive lastLogin")
      .sort({ firstName: 1, lastName: 1 });
    return res.json({ success: true, data: { teachers } });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch teachers" });
  }
};
const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    }).populate("user", "email isActive lastLogin");
    if (!teacher)
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    return res.json({ success: true, data: { teacher } });
  } catch (e) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid teacher id" });
  }
};
const updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const fields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "gender",
      "dateOfBirth",
      "qualification",
      "department",
      "designation",
      "joiningDate",
      "address",
      "photo",
      "isActive",
    ];

    // Normalize current email
    const oldEmail = String(teacher.email || "").trim().toLowerCase();

    // Update teacher fields
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "email") {
          teacher[field] = String(req.body[field])
            .trim()
            .toLowerCase();
        } else {
          teacher[field] = req.body[field];
        }
      }
    });

    const newEmail = String(teacher.email || "")
      .trim()
      .toLowerCase();

    // Check duplicate email only when email actually changes
    if (newEmail !== oldEmail) {
      const existingUser = await User.findOne({
        school: teacher.school,
        email: newEmail,
        _id: { $ne: teacher.user },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email is already registered",
        });
      }
    }

    // Save teacher
    await teacher.save();

    // Update linked login account
    if (teacher.user) {
      const user = await User.findOne({
        _id: teacher.user,
        school: teacher.school,
      });

      if (user) {
        user.name = `${teacher.firstName} ${
          teacher.lastName || ""
        }`.trim();

        user.email = newEmail;
        user.phone = teacher.phone;
        user.isActive = teacher.isActive;

        if (req.body.password) {
          user.password = await bcrypt.hash(req.body.password, 12);
        }

        await user.save();
      }
    }

    return res.json({
      success: true,
      message: "Teacher updated successfully",
      data: {
        teacher,
      },
    });
  } catch (e) {
    console.error("Update Teacher Error:", e);

    return res.status(500).json({
      success: false,
      message: e.message || "Failed to update teacher",
    });
  }
};
const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });
    if (!teacher)
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    if (teacher.user)
      await User.deleteOne({ _id: teacher.user, school: teacher.school });
    await teacher.deleteOne();
    return res.json({
      success: true,
      message: "Teacher and login account deleted successfully",
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete teacher" });
  }
};
module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
};

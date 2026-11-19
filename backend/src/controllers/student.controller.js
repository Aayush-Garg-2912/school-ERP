const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Student = require("../models/Student");
const AcademicYear = require("../models/AcademicYear");
const Class = require("../models/Class");
const Section = require("../models/Section");
const User = require("../models/User");
const Role = require("../models/Role");
const tempPassword = () => crypto.randomBytes(5).toString("base64url");
const createStudent = async (req, res) => {
  try {
    const {
      admissionNumber,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      phone,
      email,
      address,
      bloodGroup,
      photo,
      academicYear,
      classId,
      sectionId,
      rollNumber,
      guardian,
      admissionDate,
      password,
    } = req.body;
    if (
      !admissionNumber ||
      !firstName ||
      !gender ||
      !dateOfBirth ||
      !academicYear ||
      !classId ||
      !sectionId ||
      rollNumber === undefined
    )
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Admission number, name, gender, DOB, academic year, class, section and roll number are required",
        });
    const schoolId = req.user.school._id,
      admission = admissionNumber.toUpperCase();
    const year = await AcademicYear.findOne({
      _id: academicYear,
      school: schoolId,
    });
    if (!year)
      return res
        .status(404)
        .json({ success: false, message: "Academic year not found" });
    const cls = await Class.findOne({
      _id: classId,
      school: schoolId,
      academicYear,
      isActive: true,
    });
    if (!cls)
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    const section = await Section.findOne({
      _id: sectionId,
      school: schoolId,
      academicYear,
      class: classId,
      isActive: true,
    });
    if (!section)
      return res
        .status(404)
        .json({
          success: false,
          message: "Section does not belong to this class or academic year",
        });
    if (rollNumber > section.capacity)
      return res
        .status(400)
        .json({
          success: false,
          message: "Roll number cannot be greater than section capacity",
        });
    if (await Student.findOne({ school: schoolId, admissionNumber: admission }))
      return res
        .status(409)
        .json({ success: false, message: "Admission number already exists" });
    if (
      await Student.findOne({
        school: schoolId,
        academicYear,
        class: classId,
        section: sectionId,
        rollNumber,
        status: "active",
      })
    )
      return res
        .status(409)
        .json({
          success: false,
          message: "This roll number is already assigned in this section",
        });
    const normalizedEmail = email
      ? email.toLowerCase()
      : `${admission.toLowerCase()}@student.local`;
    if (await User.findOne({ school: schoolId, email: normalizedEmail }))
      return res
        .status(409)
        .json({
          success: false,
          message: "Student login email is already registered",
        });
    const role = await Role.findOne({ name: "student" });
    if (!role)
      return res
        .status(500)
        .json({ success: false, message: "Student role is not configured" });
    const plain = password || tempPassword();
    const normalizedGuardian =
      guardian && typeof guardian === "object"
        ? {
            ...guardian,
            name:
              guardian.name ||
              guardian.guardianName ||
              guardian.fatherName ||
              "",
            guardianName:
              guardian.guardianName ||
              guardian.name ||
              guardian.fatherName ||
              "",
            fatherName:
              guardian.fatherName ||
              guardian.name ||
              guardian.guardianName ||
              "",
          }
        : guardian;
    const student = await Student.create({
      school: schoolId,
      admissionNumber: admission,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      phone,
      email,
      address,
      bloodGroup,
      photo,
      academicYear,
      class: classId,
      section: sectionId,
      rollNumber,
      guardian: normalizedGuardian,
      admissionDate,
    });
    try {
      const user = await User.create({
        school: schoolId,
        name: `${firstName} ${lastName || ""}`.trim(),
        email: normalizedEmail,
        password: await bcrypt.hash(plain, 12),
        role: role._id,
        phone,
        student: student._id,
      });
      student.user = user._id;
      await student.save();
      return res
        .status(201)
        .json({
          success: true,
          message: "Student and login account created successfully",
          data: {
            student,
            user: { id: user._id, email: user.email, role: "student" },
            temporaryPassword: password ? undefined : plain,
          },
        });
    } catch (e) {
      await student.deleteOne();
      throw e;
    }
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({
        success: false,
        message: e.message || "Failed to create student",
      });
  }
};
const getStudents = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const schoolObjectId = new mongoose.Types.ObjectId(String(rawSchoolId));
    const filter = { school: schoolObjectId };

    if (req.user.role?.name === "student") {
      filter._id = req.user.student?._id || req.user.student;
    } else {
      if (req.query.academicYear) filter.academicYear = req.query.academicYear;
      if (req.query.classId) filter.class = req.query.classId;
      if (req.query.sectionId) filter.section = req.query.sectionId;
      if (req.query.status) filter.status = req.query.status;
    }

    const isValidClassId = req.query.classId && mongoose.Types.ObjectId.isValid(req.query.classId);

    const [students, totalSchoolStudents, classCounts, sectionCounts] = await Promise.all([
      Student.find(filter)
        .populate("academicYear", "name")
        .populate("class", "name code")
        .populate("section", "name code")
        .populate("user", "email isActive lastLogin")
        .sort({ rollNumber: 1 }),
      Student.countDocuments({ school: schoolObjectId }),
      Student.aggregate([
        { $match: { school: schoolObjectId } },
        { $group: { _id: "$class", count: { $sum: 1 } } },
      ]),
      isValidClassId
        ? Student.aggregate([
            {
              $match: {
                school: schoolObjectId,
                class: new mongoose.Types.ObjectId(String(req.query.classId)),
              },
            },
            { $group: { _id: "$section", count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
    ]);

    return res.json({
      success: true,
      data: {
        students,
        totalSchoolStudents,
        classStudentsCount: students.length,
        classCounts,
        sectionCounts,
      },
    });
  } catch (e) {
    console.error("Failed to fetch students:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch students" });
  }
};
const getStudentById = async (req, res) => {
  try {
    if (req.user.role?.name === "student") {
      const myId = String(req.user.student?._id || req.user.student);
      if (String(req.params.id) !== myId) {
        return res.status(403).json({ success: false, message: "Unauthorized to access another student's profile" });
      }
    }
    const student = await Student.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    })
      .populate("academicYear", "name")
      .populate("class", "name code")
      .populate("section", "name code")
      .populate("user", "email isActive lastLogin");
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    return res.json({ success: true, data: { student } });
  } catch (e) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid student id" });
  }
};
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    const fields = [
      "firstName",
      "middleName",
      "lastName",
      "gender",
      "dateOfBirth",
      "phone",
      "email",
      "address",
      "bloodGroup",
      "photo",
      "guardian",
      "admissionDate",
      "status",
    ];
    const oldEmail = student.email || "";
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (f === "email") {
          student[f] = String(req.body[f]).trim().toLowerCase();
        } else if (f === "guardian" && req.body[f] && typeof req.body[f] === "object") {
          const gName =
            req.body[f].name ||
            req.body[f].guardianName ||
            req.body[f].fatherName ||
            "";
          student.guardian = {
            ...(student.guardian ? (student.guardian.toObject ? student.guardian.toObject() : student.guardian) : {}),
            ...req.body[f],
            name: gName || student.guardian?.name || "",
            guardianName: gName || student.guardian?.guardianName || "",
            fatherName: req.body[f].fatherName || gName || student.guardian?.fatherName || "",
          };
        } else {
          student[f] = req.body[f];
        }
      }
    });
    if (student.email && student.email !== oldEmail) {
      const duplicate = await Student.findOne({
        school: student.school,
        email: student.email,
        _id: { $ne: student._id },
      });
      if (duplicate)
        return res
          .status(409)
          .json({
            success: false,
            message: "Student email is already registered",
          });
      const duplicateUser = await User.findOne({
        school: student.school,
        email: student.email,
        _id: { $ne: student.user },
      });
      if (duplicateUser)
        return res
          .status(409)
          .json({
            success: false,
            message: "Login email is already registered",
          });
    }
    await student.save();
    if (student.user) {
      const user = await User.findOne({
        _id: student.user,
        school: student.school,
      });
      if (user) {
        user.name = `${student.firstName} ${student.lastName || ""}`.trim();
        if (student.email) user.email = student.email;
        user.phone = student.phone;
        user.isActive = student.status === "active";
        if (req.body.password)
          user.password = await bcrypt.hash(req.body.password, 12);
        await user.save();
      }
    }
    return res.json({
      success: true,
      message: "Student updated successfully",
      data: { student },
    });
  } catch (e) {
    return res
      .status(500)
      .json({
        success: false,
        message: e.message || "Failed to update student",
      });
  }
};
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    if (student.user)
      await User.deleteOne({ _id: student.user, school: student.school });
    await student.deleteOne();
    return res.json({
      success: true,
      message: "Student and login account deleted successfully",
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete student" });
  }
};
module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};

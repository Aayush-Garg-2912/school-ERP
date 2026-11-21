const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Student = require("../models/Student");
const AcademicYear = require("../models/AcademicYear");
const Class = require("../models/Class");
const Section = require("../models/Section");
const User = require("../models/User");
const Role = require("../models/Role");
const StudentFee = require("../models/StudentFee");
const FeeStructure = require("../models/FeeStructure");
const { calculateStudentFeeDetails } = require("../services/feeCalculation.service");

const tempPassword = () => crypto.randomBytes(5).toString("base64url");

/**
 * Helper to generate the next unique admission number for a school
 */
const getNextAdmissionNumberInternal = async (schoolId) => {
  const year = new Date().getFullYear();
  const students = await Student.find({ school: schoolId })
    .select("admissionNumber")
    .sort({ createdAt: -1 })
    .limit(200);

  let prefix = "GIS";
  let maxSeq = 0;
  let padLength = 4;

  for (const s of students) {
    if (s.admissionNumber) {
      const parts = s.admissionNumber.split("-");
      if (parts.length >= 2) {
        if (!prefix || prefix === "ADM" || prefix === "GIS") {
          prefix = parts[0];
        }
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
          padLength = Math.max(lastPart.length, 2);
        }
      } else {
        const numMatch = s.admissionNumber.match(/(\d+)$/);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (num > maxSeq) {
            maxSeq = num;
            padLength = Math.max(numMatch[1].length, 2);
          }
        }
      }
    }
  }

  if (maxSeq === 0) {
    const count = await Student.countDocuments({ school: schoolId });
    maxSeq = count;
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}-${year}-${String(nextSeq).padStart(padLength, "0")}`;

  while (await Student.findOne({ school: schoolId, admissionNumber: candidate })) {
    nextSeq++;
    candidate = `${prefix}-${year}-${String(nextSeq).padStart(padLength, "0")}`;
  }

  return candidate;
};

/**
 * Helper to determine the next available roll number in a section
 */
const getNextRollNumberInternal = async (schoolId, academicYear, classId, sectionId) => {
  const query = {
    school: schoolId,
    class: classId,
    section: sectionId,
  };
  if (academicYear) query.academicYear = academicYear;

  const lastStudent = await Student.findOne(query).sort({ rollNumber: -1 });
  let candidateRoll = lastStudent?.rollNumber ? lastStudent.rollNumber + 1 : 1;

  while (
    await Student.findOne({
      school: schoolId,
      class: classId,
      section: sectionId,
      ...(academicYear ? { academicYear } : {}),
      rollNumber: candidateRoll,
    })
  ) {
    candidateRoll++;
  }

  return candidateRoll;
};

/**
 * API: Get Next Admission Number
 */
const getNextAdmissionNumber = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const nextAdmissionNumber = await getNextAdmissionNumberInternal(rawSchoolId);
    return res.json({
      success: true,
      data: {
        nextAdmissionNumber,
      },
    });
  } catch (error) {
    console.error("Get Next Admission Number Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate admission number",
    });
  }
};

/**
 * API: Get Next Roll Number for Class & Section
 */
const getNextRollNumber = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const { classId, sectionId, academicYear } = req.query;

    if (!classId || !sectionId) {
      return res.status(400).json({
        success: false,
        message: "Class and section are required",
      });
    }

    const nextRollNumber = await getNextRollNumberInternal(
      rawSchoolId,
      academicYear,
      classId,
      sectionId
    );

    return res.json({
      success: true,
      data: {
        nextRollNumber,
      },
    });
  } catch (error) {
    console.error("Get Next Roll Number Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to determine next roll number",
    });
  }
};

const createStudent = async (req, res) => {
  try {
    let {
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
      !firstName ||
      !gender ||
      !dateOfBirth ||
      !academicYear ||
      !classId ||
      !sectionId
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "First name, gender, DOB, academic year, class and section are required",
        });
    }

    const schoolId = req.user.school?._id || req.user.school;

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

    // Auto-generate admissionNumber if missing or empty
    if (!admissionNumber || String(admissionNumber).trim() === "" || admissionNumber === "AUTO") {
      admissionNumber = await getNextAdmissionNumberInternal(schoolId);
    }
    const admission = String(admissionNumber).trim().toUpperCase();

    // Check duplicate admissionNumber
    if (await Student.findOne({ school: schoolId, admissionNumber: admission })) {
      return res
        .status(409)
        .json({ success: false, message: `Admission number '${admission}' already exists` });
    }

    // Auto-generate rollNumber if missing or 0
    let assignedRoll = Number(rollNumber);
    if (!assignedRoll || assignedRoll <= 0 || isNaN(assignedRoll)) {
      assignedRoll = await getNextRollNumberInternal(schoolId, academicYear, classId, sectionId);
    }

    // Check duplicate rollNumber in same section
    const duplicateRoll = await Student.findOne({
      school: schoolId,
      academicYear,
      class: classId,
      section: sectionId,
      rollNumber: assignedRoll,
      status: "active",
    });
    if (duplicateRoll) {
      assignedRoll = await getNextRollNumberInternal(schoolId, academicYear, classId, sectionId);
    }

    const normalizedEmail = email
      ? email.toLowerCase()
      : `${admission.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.local`;
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
      rollNumber: assignedRoll,
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

      let studentFee = null;
      if (req.body.fee) {
        try {
          const feeConfig = req.body.fee;
          let feeStructure = null;
          if (feeConfig.feeStructureId) {
            feeStructure = await FeeStructure.findOne({
              _id: feeConfig.feeStructureId,
              school: schoolId,
              isActive: true,
            });
          }

          const feeDetails = calculateStudentFeeDetails({
            feeStructure,
            components: feeConfig.components || [],
            annualCharges: feeConfig.annualCharges || 0,
            monthlyTuition: feeConfig.monthlyTuition || 0,
            tuitionMonths: feeConfig.tuitionMonths || 12,
            transportFee: feeConfig.transportFee || 0,
            transportDetails: feeConfig.transportDetails || {},
            extraFees: feeConfig.extraFees || 0,
            offer: feeConfig.offer || null,
            discount: feeConfig.discount || 0,
            remarks: feeConfig.remarks || "Assigned on student admission",
          });

          studentFee = await StudentFee.create({
            school: schoolId,
            student: student._id,
            academicYear: academicYear,
            feeStructure: feeStructure?._id || undefined,
            ...feeDetails,
          });
        } catch (feeErr) {
          console.warn("Auto-assignment of fee on admission failed:", feeErr.message);
        }
      }

      return res
        .status(201)
        .json({
          success: true,
          message: studentFee
            ? "Student, login account, and fee setup created successfully"
            : "Student and login account created successfully",
          data: {
            student,
            user: { id: user._id, email: user.email, role: "student" },
            temporaryPassword: password ? undefined : plain,
            studentFee,
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

    const studentFee = await StudentFee.findOne({
      school: req.user.school._id,
      student: student._id,
      academicYear: student.academicYear?._id || student.academicYear,
    }).populate("feeStructure", "name description components");

    return res.json({ success: true, data: { student, studentFee } });
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

/**
 * Bulk Promote / Transfer Students across Academic Sessions with Fee Configuration
 */
const promoteStudents = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const {
      fromAcademicYear,
      toAcademicYear,
      fromClassId,
      toClassId,
      toSectionId,
      studentIds,
      promotionType = "promote",
      feeConfig = null,
    } = req.body;

    if (
      !fromAcademicYear ||
      !toAcademicYear ||
      !fromClassId ||
      !toClassId ||
      !toSectionId ||
      !Array.isArray(studentIds) ||
      studentIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Source session, target session, source class, target class, target section and student list are required",
      });
    }

    // Verify target year, class, section
    const targetYear = await AcademicYear.findOne({
      _id: toAcademicYear,
      school: rawSchoolId,
    });
    if (!targetYear) {
      return res
        .status(404)
        .json({ success: false, message: "Target academic year not found" });
    }

    const targetClass = await Class.findOne({
      _id: toClassId,
      school: rawSchoolId,
      isActive: true,
    });
    if (!targetClass) {
      return res
        .status(404)
        .json({ success: false, message: "Target class not found" });
    }

    const targetSection = await Section.findOne({
      _id: toSectionId,
      school: rawSchoolId,
      class: toClassId,
      isActive: true,
    });
    if (!targetSection) {
      return res
        .status(404)
        .json({ success: false, message: "Target section not found" });
    }

    // Find active students to promote
    const studentsToPromote = await Student.find({
      _id: { $in: studentIds },
      school: rawSchoolId,
      status: "active",
    });

    if (studentsToPromote.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No active students found for promotion" });
    }

    // Load target fee structure template if requested
    let targetFeeStructure = null;
    if (feeConfig?.feeStructureId) {
      targetFeeStructure = await FeeStructure.findOne({
        _id: feeConfig.feeStructureId,
        school: rawSchoolId,
        isActive: true,
      });
    }

    // Determine starting rollNumber in target section
    const lastRollStudent = await Student.findOne({
      school: rawSchoolId,
      academicYear: toAcademicYear,
      class: toClassId,
      section: toSectionId,
    }).sort({ rollNumber: -1 });

    let nextRoll = lastRollStudent?.rollNumber ? lastRollStudent.rollNumber + 1 : 1;

    const promoted = [];
    const feesCreated = [];

    for (const st of studentsToPromote) {
      // Update student enrollment
      st.academicYear = toAcademicYear;
      st.class = toClassId;
      st.section = toSectionId;
      st.rollNumber = nextRoll++;
      st.status = "active";
      await st.save();
      promoted.push(st);

      // Auto-assign fee for the new academic session if feeConfig is supplied
      if (feeConfig) {
        const existingTargetFee = await StudentFee.findOne({
          school: rawSchoolId,
          student: st._id,
          academicYear: toAcademicYear,
        });

        if (!existingTargetFee) {
          // Carry forward concession / scholarship if requested
          let studentOffer = feeConfig.offer || null;
          if (feeConfig.carryOverConcession) {
            const prevFee = await StudentFee.findOne({
              school: rawSchoolId,
              student: st._id,
              academicYear: fromAcademicYear,
            });
            if (prevFee?.offer && prevFee.offer.type !== "none") {
              studentOffer = prevFee.offer;
            } else if (prevFee?.discount > 0) {
              studentOffer = {
                name: "Carried Forward Concession",
                type: "flat",
                value: prevFee.discount,
              };
            }
          }

          // Carry forward transport if requested
          let studentTransportFee = feeConfig.transportFee || 0;
          let studentTransportDetails = feeConfig.transportDetails || {};
          if (feeConfig.carryOverTransport) {
            const prevFee = await StudentFee.findOne({
              school: rawSchoolId,
              student: st._id,
              academicYear: fromAcademicYear,
            });
            if (prevFee?.transportFee > 0) {
              studentTransportFee = prevFee.transportFee;
              studentTransportDetails = prevFee.transportDetails || { opted: true };
            }
          }

          const feeDetails = calculateStudentFeeDetails({
            feeStructure: targetFeeStructure,
            components: feeConfig.components || [],
            annualCharges: feeConfig.annualCharges || 0,
            monthlyTuition: feeConfig.monthlyTuition || 0,
            tuitionMonths: feeConfig.tuitionMonths || 12,
            transportFee: studentTransportFee,
            transportDetails: studentTransportDetails,
            extraFees: feeConfig.extraFees || 0,
            offer: studentOffer,
            discount: feeConfig.discount || 0,
            remarks: `Fee configured during student promotion (${targetYear.name})`,
          });

          const createdFee = await StudentFee.create({
            school: rawSchoolId,
            student: st._id,
            academicYear: toAcademicYear,
            feeStructure: targetFeeStructure?._id || undefined,
            ...feeDetails,
          });
          feesCreated.push(createdFee);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully promoted ${promoted.length} students to ${targetClass.name} - ${targetSection.name} (${targetYear.name}) with fee setup`,
      data: {
        promotedCount: promoted.length,
        feesCreatedCount: feesCreated.length,
      },
    });
  } catch (error) {
    console.error("Promote Students Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to promote students",
    });
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  promoteStudents,
  getNextAdmissionNumber,
  getNextRollNumber,
};

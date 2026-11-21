const mongoose = require("mongoose");
const StudentFee = require("../models/StudentFee");
const Student = require("../models/Student");
const FeeStructure = require("../models/FeeStructure");
const AcademicYear = require("../models/AcademicYear");
const FeePayment = require("../models/FeePayment");
const School = require("../models/School");
const WhatsAppService = require("../services/whatsapp.service");
const { calculateStudentFeeDetails } = require("../services/feeCalculation.service");

/**
 * Assign Fee to Student (Customized or from Template)
 */
const createStudentFee = async (req, res) => {
  try {
    const {
      studentId,
      academicYear,
      feeStructureId,
      components,
      annualCharges,
      monthlyTuition,
      tuitionMonths,
      transportFee,
      transportDetails,
      extraFees,
      offer,
      discount = 0,
      remarks,
    } = req.body;

    if (!studentId || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "Student and academic year are required",
      });
    }

    const schoolId = req.user.school._id;

    // Check student
    const student = await Student.findOne({
      _id: studentId,
      school: schoolId,
      status: "active",
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
    }

    // Check academic year
    const year = await AcademicYear.findOne({
      _id: academicYear,
      school: schoolId,
    });

    if (!year) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found",
      });
    }

    // Check duplicate assignment
    const existingFee = await StudentFee.findOne({
      school: schoolId,
      student: studentId,
      academicYear,
    });

    if (existingFee) {
      return res.status(409).json({
        success: false,
        message: "Fee has already been assigned to this student for this academic year",
      });
    }

    // Fetch fee structure template if provided
    let feeStructure = null;
    if (feeStructureId) {
      feeStructure = await FeeStructure.findOne({
        _id: feeStructureId,
        school: schoolId,
        isActive: true,
      });
    }

    const feeDetails = calculateStudentFeeDetails({
      feeStructure,
      components,
      annualCharges,
      monthlyTuition,
      tuitionMonths,
      transportFee,
      transportDetails,
      extraFees,
      offer,
      discount,
      remarks,
    });

    const studentFee = await StudentFee.create({
      school: schoolId,
      student: studentId,
      academicYear,
      feeStructure: feeStructure?._id || undefined,
      ...feeDetails,
    });

    const populatedFee = await StudentFee.findById(studentFee._id)
      .populate("student", "admissionNumber firstName lastName rollNumber class section phone guardian")
      .populate("academicYear", "name startDate endDate isCurrent")
      .populate("feeStructure", "name description components");

    res.status(201).json({
      success: true,
      message: "Fee assigned to student successfully",
      data: {
        studentFee: populatedFee,
      },
    });
  } catch (error) {
    console.error("Create Student Fee Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to assign fee to student",
    });
  }
};

/**
 * Get Student Fees with Filter & Search
 */
const getStudentFees = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const filter = {
      school: rawSchoolId,
    };

    if (req.query.studentId) {
      filter.student = req.query.studentId;
    }

    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    // If filtering by class or search text, find matching student IDs first
    if (req.query.classId || req.query.search) {
      const studentQuery = { school: rawSchoolId };
      if (req.query.classId) studentQuery.class = req.query.classId;
      if (req.query.sectionId) studentQuery.section = req.query.sectionId;

      if (req.query.search) {
        const q = req.query.search.trim();
        studentQuery.$or = [
          { firstName: { $regex: q, $options: "i" } },
          { lastName: { $regex: q, $options: "i" } },
          { admissionNumber: { $regex: q, $options: "i" } },
        ];
      }

      const matchingStudents = await Student.find(studentQuery).select("_id");
      filter.student = { $in: matchingStudents.map((s) => s._id) };
    }

    const studentFees = await StudentFee.find(filter)
      .populate({
        path: "student",
        select: "admissionNumber firstName lastName rollNumber class section phone guardian",
        populate: [
          { path: "class", select: "name code" },
          { path: "section", select: "name code" },
        ],
      })
      .populate("academicYear", "name startDate endDate isCurrent")
      .populate("feeStructure", "name description components")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        studentFees,
      },
    });
  } catch (error) {
    console.error("Get Student Fees Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student fees",
    });
  }
};

/**
 * Get Single Student Fee by ID (with Payment History)
 */
const getStudentFeeById = async (req, res) => {
  try {
    const studentFee = await StudentFee.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    })
      .populate({
        path: "student",
        select: "admissionNumber firstName lastName rollNumber class section phone guardian",
        populate: [
          { path: "class", select: "name code" },
          { path: "section", select: "name code" },
        ],
      })
      .populate("academicYear", "name startDate endDate isCurrent")
      .populate("feeStructure", "name description components");

    if (!studentFee) {
      return res.status(404).json({
        success: false,
        message: "Student fee not found",
      });
    }

    // Fetch related payment receipts
    const payments = await FeePayment.find({
      studentFee: studentFee._id,
      school: req.user.school._id,
    })
      .populate("collectedBy", "name email role")
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      data: {
        studentFee,
        payments,
      },
    });
  } catch (error) {
    console.error("Get Student Fee Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student fee",
    });
  }
};

/**
 * Update Student Fee (Modify Breakdown, Offers or Extra Fees)
 */
const updateStudentFee = async (req, res) => {
  try {
    const studentFee = await StudentFee.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!studentFee) {
      return res.status(404).json({
        success: false,
        message: "Student fee not found",
      });
    }

    const {
      components,
      annualCharges,
      monthlyTuition,
      tuitionMonths,
      transportFee,
      transportDetails,
      extraFees,
      offer,
      discount,
      remarks,
    } = req.body;

    const feeDetails = calculateStudentFeeDetails({
      components: components !== undefined ? components : studentFee.components,
      annualCharges: annualCharges !== undefined ? annualCharges : studentFee.annualCharges,
      monthlyTuition: monthlyTuition !== undefined ? monthlyTuition : studentFee.monthlyTuition,
      tuitionMonths: tuitionMonths !== undefined ? tuitionMonths : studentFee.tuitionMonths,
      transportFee: transportFee !== undefined ? transportFee : studentFee.transportFee,
      transportDetails: transportDetails !== undefined ? transportDetails : studentFee.transportDetails,
      extraFees: extraFees !== undefined ? extraFees : studentFee.extraFees,
      offer: offer !== undefined ? offer : studentFee.offer,
      discount: discount !== undefined ? discount : studentFee.discount,
      remarks: remarks !== undefined ? remarks : studentFee.remarks,
    });

    // Guard: new payable amount cannot be lower than what has already been collected
    if (feeDetails.payableAmount < studentFee.paidAmount) {
      return res.status(400).json({
        success: false,
        message: `New payable fee (₹${feeDetails.payableAmount}) cannot be less than already collected amount (₹${studentFee.paidAmount})`,
      });
    }

    // Update fields
    studentFee.components = feeDetails.components;
    studentFee.annualCharges = feeDetails.annualCharges;
    studentFee.monthlyTuition = feeDetails.monthlyTuition;
    studentFee.tuitionMonths = feeDetails.tuitionMonths;
    studentFee.transportFee = feeDetails.transportFee;
    studentFee.transportDetails = feeDetails.transportDetails;
    studentFee.extraFees = feeDetails.extraFees;
    studentFee.offer = feeDetails.offer;
    studentFee.totalAmount = feeDetails.totalAmount;
    studentFee.discount = feeDetails.discount;
    studentFee.payableAmount = feeDetails.payableAmount;
    studentFee.dueAmount = feeDetails.payableAmount - studentFee.paidAmount;
    studentFee.remarks = feeDetails.remarks;

    studentFee.status =
      studentFee.dueAmount === 0
        ? "paid"
        : studentFee.paidAmount > 0
        ? "partial"
        : "pending";

    await studentFee.save();

    const populatedFee = await StudentFee.findById(studentFee._id)
      .populate("student", "admissionNumber firstName lastName rollNumber class section phone guardian")
      .populate("academicYear", "name startDate endDate isCurrent")
      .populate("feeStructure", "name description components");

    res.status(200).json({
      success: true,
      message: "Student fee updated successfully",
      data: {
        studentFee: populatedFee,
      },
    });
  } catch (error) {
    console.error("Update Student Fee Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update student fee",
    });
  }
};

/**
 * Delete Student Fee
 */
const deleteStudentFee = async (req, res) => {
  try {
    const studentFee = await StudentFee.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!studentFee) {
      return res.status(404).json({
        success: false,
        message: "Student fee not found",
      });
    }

    if (studentFee.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message: "Student fee cannot be deleted after payment has been recorded",
      });
    }

    await studentFee.deleteOne();

    res.status(200).json({
      success: true,
      message: "Student fee deleted successfully",
    });
  } catch (error) {
    console.error("Delete Student Fee Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete student fee",
    });
  }
};

/**
 * Send WhatsApp Fee Reminder for Single Student
 */
const sendSingleFeeReminder = async (req, res) => {
  try {
    const schoolId = req.user.school._id;
    const studentFee = await StudentFee.findOne({
      _id: req.params.id,
      school: schoolId,
    })
      .populate({
        path: "student",
        select: "firstName lastName admissionNumber phone guardian class section",
        populate: [
          { path: "class", select: "name" },
          { path: "section", select: "name" },
        ],
      })
      .populate("academicYear", "name");

    if (!studentFee) {
      return res.status(404).json({ success: false, message: "Student fee not found" });
    }

    if (studentFee.dueAmount <= 0) {
      return res.status(400).json({ success: false, message: "This student has no outstanding due amount" });
    }

    const student = studentFee.student;
    const phone = student?.guardian?.phone || student?.phone;

    if (!phone) {
      return res.status(400).json({ success: false, message: "No phone number registered for student or guardian" });
    }

    const school = await School.findById(schoolId).select("name phone").lean();
    const schoolName = school?.name || "School Administration";
    const studentName = `${student.firstName} ${student.lastName || ""}`.trim();
    const guardianName = student.guardian?.name || student.guardian?.guardianName || student.guardian?.fatherName || "Parent";
    const className = student.class?.name ? `${student.class.name} ${student.section?.name || ""}`.trim() : "Class";

    const content =
      `📢 *FEE PAYMENT REMINDER* - ${schoolName}\n` +
      `----------------------------------------\n` +
      `Dear ${guardianName},\n\n` +
      `This is a gentle reminder regarding the outstanding school fee for:\n` +
      `• *Student:* ${studentName}\n` +
      `• *Admission No:* ${student.admissionNumber}\n` +
      `• *Class:* ${className}\n` +
      `• *Total Fee:* ₹${Number(studentFee.payableAmount).toLocaleString("en-IN")}\n` +
      `• *Paid Amount:* ₹${Number(studentFee.paidAmount).toLocaleString("en-IN")}\n` +
      `• *Outstanding Due:* ₹${Number(studentFee.dueAmount).toLocaleString("en-IN")}\n` +
      `----------------------------------------\n` +
      `Kindly clear the pending dues at your earliest convenience to avoid any disruption.\n` +
      (req.body.customNote ? `\n*Note:* ${req.body.customNote}\n` : "") +
      `\nFor any queries, please contact the Accounts Department.\n` +
      `*${schoolName}*`;

    const dispatch = await WhatsAppService.sendWhatsAppDirect({
      schoolId,
      recipientType: "parent",
      recipientId: student._id,
      recipientModel: "Student",
      recipientName: `${studentName} (${guardianName})`,
      phoneNumber: phone,
      messageType: "fee_reminder",
      targetScope: "individual",
      classId: student.class?._id || null,
      sectionId: student.section?._id || null,
      title: `Fee Due Reminder: ₹${studentFee.dueAmount}`,
      content,
      sentBy: req.user._id,
      metadata: {
        studentFeeId: studentFee._id,
        dueAmount: studentFee.dueAmount,
        admissionNumber: student.admissionNumber,
      },
    });

    res.status(200).json({
      success: true,
      message: `Fee reminder dispatched via WhatsApp to ${phone}`,
      data: dispatch,
    });
  } catch (error) {
    console.error("Send Single Fee Reminder Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send fee reminder",
    });
  }
};

module.exports = {
  createStudentFee,
  getStudentFees,
  getStudentFeeById,
  updateStudentFee,
  deleteStudentFee,
  sendSingleFeeReminder,
};

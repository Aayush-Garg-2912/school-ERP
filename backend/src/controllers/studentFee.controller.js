const StudentFee = require("../models/StudentFee");
const Student = require("../models/Student");
const FeeStructure = require("../models/FeeStructure");
const AcademicYear = require("../models/AcademicYear");

const createStudentFee = async (req, res) => {
  try {
    const {
      studentId,
      academicYear,
      feeStructureId,
      discount = 0,
    } = req.body;

    if (!studentId || !academicYear || !feeStructureId) {
      return res.status(400).json({
        success: false,
        message:
          "Student, academic year and fee structure are required",
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
        message: "Student not found",
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

    // Check fee structure
    const feeStructure = await FeeStructure.findOne({
      _id: feeStructureId,
      school: schoolId,
      academicYear,
      class: student.class,
      isActive: true,
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message:
          "Fee structure not found for this student's class",
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
        message:
          "Fee has already been assigned to this student for this academic year",
      });
    }

    // Calculate total from components
    const totalAmount = feeStructure.components.reduce(
      (total, component) =>
        total + Number(component.amount),
      0
    );

    const discountAmount = Number(discount);

    if (discountAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot be negative",
      });
    }

    if (discountAmount > totalAmount) {
      return res.status(400).json({
        success: false,
        message:
          "Discount cannot be greater than total fee",
      });
    }

    const payableAmount =
      totalAmount - discountAmount;

    const studentFee = await StudentFee.create({
      school: schoolId,
      student: studentId,
      academicYear,
      feeStructure: feeStructureId,
      totalAmount,
      discount: discountAmount,
      payableAmount,
      paidAmount: 0,
      dueAmount: payableAmount,
      status:
        payableAmount === 0 ? "paid" : "pending",
    });

    res.status(201).json({
      success: true,
      message: "Fee assigned to student successfully",
      data: {
        studentFee,
      },
    });
  } catch (error) {
    console.error(
      "Create Student Fee Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to assign fee to student",
    });
  }
};

const getStudentFees = async (req, res) => {
  try {
    const filter = {
      school: req.user.school._id,
    };

    if (req.query.studentId) {
      filter.student = req.query.studentId;
    }

    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const studentFees = await StudentFee.find(filter)
      .populate(
        "student",
        "admissionNumber firstName lastName rollNumber class section"
      )
      .populate(
        "academicYear",
        "name startDate endDate"
      )
      .populate(
        "feeStructure",
        "name description components"
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      data: {
        studentFees,
      },
    });
  } catch (error) {
    console.error(
      "Get Student Fees Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch student fees",
    });
  }
};

const getStudentFeeById = async (req, res) => {
  try {
    const studentFee = await StudentFee.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    })
      .populate(
        "student",
        "admissionNumber firstName lastName rollNumber class section"
      )
      .populate(
        "academicYear",
        "name startDate endDate"
      )
      .populate(
        "feeStructure",
        "name description components"
      );

    if (!studentFee) {
      return res.status(404).json({
        success: false,
        message: "Student fee not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        studentFee,
      },
    });
  } catch (error) {
    console.error(
      "Get Student Fee Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch student fee",
    });
  }
};

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

    // Don't allow changing the original fee assignment
    // after payment has been made.
    if (studentFee.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Fee cannot be modified after payment has been made",
      });
    }

    if (req.body.discount !== undefined) {
      const discount = Number(req.body.discount);

      if (discount < 0) {
        return res.status(400).json({
          success: false,
          message: "Discount cannot be negative",
        });
      }

      if (discount > studentFee.totalAmount) {
        return res.status(400).json({
          success: false,
          message:
            "Discount cannot be greater than total fee",
        });
      }

      studentFee.discount = discount;
      studentFee.payableAmount =
        studentFee.totalAmount - discount;

      studentFee.dueAmount =
        studentFee.payableAmount -
        studentFee.paidAmount;

      studentFee.status =
        studentFee.dueAmount === 0
          ? "paid"
          : studentFee.paidAmount > 0
          ? "partial"
          : "pending";
    }

    await studentFee.save();

    res.status(200).json({
      success: true,
      message: "Student fee updated successfully",
      data: {
        studentFee,
      },
    });
  } catch (error) {
    console.error(
      "Update Student Fee Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update student fee",
    });
  }
};

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
        message:
          "Student fee cannot be deleted after payment has been made",
      });
    }

    await studentFee.deleteOne();

    res.status(200).json({
      success: true,
      message: "Student fee deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Student Fee Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to delete student fee",
    });
  }
};

module.exports = {
  createStudentFee,
  getStudentFees,
  getStudentFeeById,
  updateStudentFee,
  deleteStudentFee,
};
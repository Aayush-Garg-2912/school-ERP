const bcrypt = require("bcryptjs");

const Parent = require("../models/Parent");
const Student = require("../models/Student");
const ParentStudent = require("../models/ParentStudent");
const User = require("../models/User");
const Role = require("../models/Role");
const StudentFee = require("../models/StudentFee");
const FeePayment = require("../models/FeePayment");

const createParent = async (req, res) => {
  try {
    const {
      parentId,
      firstName,
      lastName,
      phone,
      email,
      password,
      relation,
      studentId,
    } = req.body;

    if (
      !parentId ||
      !firstName ||
      !phone ||
      !password ||
      !studentId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Parent ID, name, phone, password and student are required",
      });
    }

    const schoolId = req.user.school._id;

    // Check student
    const student = await Student.findOne({
      _id: studentId,
      school: schoolId,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check Parent ID / phone
    const existingParent = await Parent.findOne({
      school: schoolId,
      $or: [
        {
          parentId: parentId.toUpperCase(),
        },
        {
          phone,
        },
      ],
    });

    if (existingParent) {
      return res.status(409).json({
        success: false,
        message:
          "Parent ID or phone number already exists",
      });
    }

    // Email is required for User authentication
    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required for parent login",
      });
    }

    // Check User email
    const existingUser = await User.findOne({
      school: schoolId,
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Email is already registered",
      });
    }

    // Find parent role
    const parentRole = await Role.findOne({
      name: "parent",
    });

    if (!parentRole) {
      return res.status(500).json({
        success: false,
        message:
          "Parent role is not configured",
      });
    }

    // Hash password once
    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    // Create User account
    let parent;
    const user = await User.create({
      school: schoolId,
      name: `${firstName} ${lastName || ""}`.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: parentRole._id,
      phone,
    });

    try {
      // Create Parent profile
      parent = await Parent.create({
        school: schoolId,
        user: user._id,
        parentId: parentId.toUpperCase(),
        firstName,
        lastName,
        phone,
        email: email.toLowerCase(),
        password: hashedPassword,
        relation,
      });

      // Link Parent profile back to the User account
      user.parent = parent._id;
      await user.save({ validateBeforeSave: false });

      // Link Parent → Student
      await ParentStudent.create({
        school: schoolId,
        parent: parent._id,
        student: student._id,
        relation: relation || "guardian",
        isPrimary: true,
      });

      const parentResponse =
        parent.toObject();

      delete parentResponse.password;

      res.status(201).json({
        success: true,
        message:
          "Parent and login account created successfully",
        data: {
          parent: parentResponse,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: "parent",
          },
        },
      });
    } catch (error) {
      // Roll back all records created for this parent.
      if (typeof parent !== "undefined" && parent?._id) {
        await ParentStudent.deleteMany({ parent: parent._id, school: schoolId });
        await Parent.findByIdAndDelete(parent._id);
      }
      await User.findByIdAndDelete(user._id);
      throw error;
    }
  } catch (error) {
    console.error(
      "Create Parent Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to create parent",
    });
  }
};

const getParents = async (req, res) => {
  try {
    const parents = await Parent.find({
      school: req.user.school._id,
    })
      .select("-password")
      .sort({
        firstName: 1,
      });

    res.status(200).json({
      success: true,
      data: {
        parents,
      },
    });
  } catch (error) {
    console.error("Get Parents Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch parents",
    });
  }
};

const getParentById = async (req, res) => {
  try {
    const parent = await Parent.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    }).select("-password");

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    const students = await ParentStudent.find({
      school: req.user.school._id,
      parent: parent._id,
    }).populate(
      "student",
      "admissionNumber firstName lastName rollNumber"
    );

    res.status(200).json({
      success: true,
      data: {
        parent,
        students,
      },
    });
  } catch (error) {
    console.error("Get Parent Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch parent",
    });
  }
};

const updateParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    const user = await User.findOne({
      _id: parent.user,
      school: req.user.school._id,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Parent login account not found",
      });
    }

    const {
      firstName,
      lastName,
      phone,
      email,
      relation,
      isActive,
      password,
    } = req.body;

    // Update Parent profile
    if (firstName !== undefined)
      parent.firstName = firstName;

    if (lastName !== undefined)
      parent.lastName = lastName;

    if (phone !== undefined)
      parent.phone = phone;

    if (email !== undefined)
      parent.email = email.toLowerCase();

    if (relation !== undefined)
      parent.relation = relation;

    if (isActive !== undefined)
      parent.isActive = isActive;

    // Update User account
    if (
      firstName !== undefined ||
      lastName !== undefined
    ) {
      user.name =
        `${firstName ?? parent.firstName} ${
          lastName ?? parent.lastName
        }`.trim();
    }

    if (phone !== undefined)
      user.phone = phone;

    if (email !== undefined)
      user.email = email.toLowerCase();

    if (isActive !== undefined)
      user.isActive = isActive;

    if (password) {
      const hashedPassword =
        await bcrypt.hash(password, 12);

      parent.password = hashedPassword;
      user.password = hashedPassword;
    }

    await parent.save();
    await user.save();

    const response = parent.toObject();
    delete response.password;

    res.status(200).json({
      success: true,
      message:
        "Parent updated successfully",
      data: {
        parent: response,
      },
    });
  } catch (error) {
    console.error(
      "Update Parent Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to update parent",
    });
  }
};

const deleteParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    // Delete parent-student relationships
    await ParentStudent.deleteMany({
      parent: parent._id,
      school: req.user.school._id,
    });

    // Delete linked User account
    if (parent.user) {
      await User.findOneAndDelete({
        _id: parent.user,
        school: req.user.school._id,
      });
    }

    // Delete Parent profile
    await parent.deleteOne();

    res.status(200).json({
      success: true,
      message:
        "Parent and login account deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Parent Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to delete parent",
    });
  }
};
const getMyChildren = async (req, res) => {
  try {
    // Find Parent profile linked with logged-in User
    const parent = await Parent.findOne({
      user: req.user._id,
      school: req.user.school._id,
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent profile not found",
      });
    }

    // Find only this parent's children
    const parentStudents = await ParentStudent.find({
      school: req.user.school._id,
      parent: parent._id,
    }).populate({
      path: "student",
      select: "admissionNumber firstName lastName rollNumber class section transport phone bloodGroup",
      populate: [
        { path: "class", select: "name code" },
        { path: "section", select: "name code" },
        { path: "transport.vehicle" },
      ],
    });

    const students = parentStudents.map(
      (item) => ({
        relationship: item.relation,
        isPrimary: item.isPrimary,
        student: item.student,
      })
    );

    res.status(200).json({
      success: true,
      data: {
        parent: {
          id: parent._id,
          parentId: parent.parentId,
          firstName: parent.firstName,
          lastName: parent.lastName,
          phone: parent.phone,
          email: parent.email,
        },
        students,
      },
    });
  } catch (error) {
    console.error(
      "Get My Children Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch children",
    });
  }
};
const getMyChildById = async (req, res) => {
  try {
    const parent = await Parent.findOne({
      user: req.user._id,
      school: req.user.school._id,
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent profile not found",
      });
    }

    // Verify that this student actually belongs to this parent
    const parentStudent = await ParentStudent.findOne({
      school: req.user.school._id,
      parent: parent._id,
      student: req.params.studentId,
    }).populate({
      path: "student",
      select: "admissionNumber firstName lastName rollNumber class section transport phone bloodGroup address",
      populate: [
        { path: "class", select: "name code" },
        { path: "section", select: "name code" },
        { path: "transport.vehicle" },
      ],
    });

    if (!parentStudent || !parentStudent.student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found or you are not authorized to view this student",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        relationship: parentStudent.relation,
        isPrimary: parentStudent.isPrimary,
        student: parentStudent.student,
      },
    });
  } catch (error) {
    console.error(
      "Get My Child Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch child details",
    });
  }
};
const getMyChildFees = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear } = req.query;

    const schoolId = req.user.school._id;

    // Find logged-in parent
    const parent = await Parent.findOne({
      user: req.user._id,
      school: schoolId,
      isActive: true,
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent profile not found",
      });
    }

    // Verify student belongs to this parent
    const parentStudent = await ParentStudent.findOne({
      school: schoolId,
      parent: parent._id,
      student: studentId,
    });

    if (!parentStudent) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view this student's fees",
      });
    }

    // Student fees
    const feeFilter = {
      school: schoolId,
      student: studentId,
    };

    if (academicYear) {
      feeFilter.academicYear = academicYear;
    }

    const studentFees = await StudentFee.find(
      feeFilter
    )
      .populate(
        "academicYear",
        "name"
      )
      .populate(
        "feeStructure",
        "name description components"
      )
      .sort({
        createdAt: -1,
      });

    // Payment history
    const paymentFilter = {
      school: schoolId,
      student: studentId,
    };

    const payments = await FeePayment.find(
      paymentFilter
    )
      .populate(
        "studentFee",
        "payableAmount paidAmount dueAmount status"
      )
      .sort({
        paymentDate: -1,
      });

    // Calculate summary
    const summary = studentFees.reduce(
      (result, fee) => {
        result.totalFee += fee.payableAmount;
        result.paid += fee.paidAmount;
        result.pending += fee.dueAmount;

        return result;
      },
      {
        totalFee: 0,
        paid: 0,
        pending: 0,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: studentId,
          relationship: parentStudent.relation,
          isPrimary: parentStudent.isPrimary,
        },

        summary,

        fees: studentFees,

        payments,
      },
    });
  } catch (error) {
    console.error(
      "Get My Child Fees Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch child fees",
    });
  }
};
module.exports = {
  createParent,
  getParents,
  getParentById,
  updateParent,
  deleteParent,
   getMyChildren,
   getMyChildById,
   getMyChildFees,
};
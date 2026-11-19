const Leave = require("../models/Leave");

const createLeave = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      leaveType,
      reason,
    } = req.body;

    if (
      !fromDate ||
      !toDate ||
      !leaveType ||
      !reason
    ) {
      return res.status(400).json({
        success: false,
        message:
          "From date, to date, leave type and reason are required",
      });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message:
          "From date cannot be after to date",
      });
    }

    const allowedTypes = [
      "casual",
      "sick",
      "emergency",
      "personal",
      "other",
    ];

    if (!allowedTypes.includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave type",
      });
    }

    const schoolId = req.user.school._id;
    const userRole = req.user.role.name;

if (
  userRole !== "teacher" &&
  userRole !== "staff"
) {
  return res.status(403).json({
    success: false,
    message:
      "Only teachers and staff can apply for leave",
  });
}

    // Check overlapping leave
    const overlappingLeave =
      await Leave.findOne({
        school: schoolId,
        applicant: req.user._id,
        status: {
          $in: ["pending", "approved"],
        },
        fromDate: {
          $lte: end,
        },
        toDate: {
          $gte: start,
        },
      });

    if (overlappingLeave) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a leave request for these dates",
      });
    }

    const leave = await Leave.create({
      school: schoolId,
      applicant: req.user._id,
      applicantType: req.user.role.name,
      fromDate: start,
      toDate: end,
      leaveType,
      reason,
    });

    res.status(201).json({
      success: true,
      message:
        "Leave request submitted successfully",
      data: {
        leave,
      },
    });
  } catch (error) {
    console.error(
      "Create Leave Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to create leave request",
    });
  }
};

const getLeaves = async (req, res) => {
  try {
    const filter = {
      school: req.user.school._id,
    };

    // Normal teacher/staff sees their own leaves
    if (
      req.user.role.name === "teacher" ||
      req.user.role.name === "staff"
    ) {
      filter.applicant = req.user._id;
    }

    // Principal/Admin can filter
   const userRole = req.user.role.name;

if (
  userRole === "teacher" ||
  userRole === "staff"
) {
  filter.applicant = req.user._id;
} else if (req.query.applicantId) {
  filter.applicant = req.query.applicantId;
}

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.leaveType) {
      filter.leaveType =
        req.query.leaveType;
    }

    const leaves = await Leave.find(filter)
      .populate(
        "applicant",
        "name email role"
      )
      .populate(
        "reviewedBy",
        "name email role"
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      data: {
        leaves,
      },
    });
  } catch (error) {
    console.error(
      "Get Leaves Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch leave requests",
    });
  }
};

const reviewLeave = async (req, res) => {
  try {
    const {
      status,
      reviewRemarks = "",
    } = req.body;

    if (
      !["approved", "rejected"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be approved or rejected",
      });
    }

    const leave = await Leave.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending leave requests can be reviewed",
      });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewRemarks = reviewRemarks;

    await leave.save();

    res.status(200).json({
      success: true,
      message:
        `Leave request ${status} successfully`,
      data: {
        leave,
      },
    });
  } catch (error) {
    console.error(
      "Review Leave Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to review leave request",
    });
  }
};

const cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findOne({
      _id: req.params.id,
      school: req.user.school._id,
      applicant: req.user._id,
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (
      !["pending", "approved"].includes(
        leave.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This leave cannot be cancelled",
      });
    }

    leave.status = "cancelled";

    await leave.save();

    res.status(200).json({
      success: true,
      message:
        "Leave cancelled successfully",
      data: {
        leave,
      },
    });
  } catch (error) {
    console.error(
      "Cancel Leave Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to cancel leave",
    });
  }
};

module.exports = {
  createLeave,
  getLeaves,
  reviewLeave,
  cancelLeave,
};
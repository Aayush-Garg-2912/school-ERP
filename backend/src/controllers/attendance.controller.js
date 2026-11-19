const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Class = require("../models/Class");
const Section = require("../models/Section");
const AcademicYear = require("../models/AcademicYear");
const Teacher = require("../models/Teacher");
const Parent = require("../models/Parent");
const ParentStudent = require("../models/ParentStudent");

const markAttendance = async (req, res) => {
  try {
    const {
      academicYear,
      date,
      classId,
      sectionId,
      attendance,
    } = req.body;

    if (
      !academicYear ||
      !date ||
      !classId ||
      !sectionId ||
      !Array.isArray(attendance) ||
      attendance.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, date, class, section and attendance data are required",
      });
    }

    const schoolId = req.user.school._id;

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

    const classData = await Class.findOne({
      _id: classId,
      school: schoolId,
      academicYear,
      isActive: true,
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const section = await Section.findOne({
      _id: sectionId,
      school: schoolId,
      academicYear,
      class: classId,
      isActive: true,
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    const teacher = await Teacher.findOne({
      _id: req.user.teacher,
      school: schoolId,
      isActive: true,
    });

    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: "Teacher account not found",
      });
    }

    const studentIds = attendance.map(
      (item) => item.studentId
    );

    const students = await Student.find({
      _id: { $in: studentIds },
      school: schoolId,
      academicYear,
      class: classId,
      section: sectionId,
      status: "active",
    }).select("_id");

    const validStudentIds = new Set(
      students.map((student) =>
        student._id.toString()
      )
    );

    for (const item of attendance) {
      if (!validStudentIds.has(item.studentId)) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid student for this class/section: ${item.studentId}`,
        });
      }

      if (
        ![
          "present",
          "absent",
          "late",
          "leave",
        ].includes(item.status)
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid attendance status for student ${item.studentId}`,
        });
      }
    }

    const operations = attendance.map((item) => ({
      updateOne: {
        filter: {
          school: schoolId,
          academicYear,
          date,
          class: classId,
          section: sectionId,
          student: item.studentId,
        },

        update: {
          $set: {
            markedBy: teacher._id,
            status: item.status,
            remarks: item.remarks || "",
          },
        },

        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations);

    res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      data: {
        totalStudents: attendance.length,
      },
    });
  } catch (error) {
    console.error("Mark Attendance Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
    });
  }
};

const getAttendance = async (req, res) => {
  try {
    const {
      academicYear,
      date,
      classId,
      sectionId,
      studentId,
    } = req.query;

    const filter = {
      school: req.user.school._id,
    };

    if (academicYear) {
      filter.academicYear = academicYear;
    }

    if (date) {
      filter.date = date;
    }

    if (classId) {
      filter.class = classId;
    }

    if (sectionId) {
      filter.section = sectionId;
    }

    if (req.user.role?.name === "student") {
      filter.student = req.user.student?._id || req.user.student;
    } else if (studentId) {
      filter.student = studentId;
    }

    const attendance = await Attendance.find(filter)
      .populate(
        "student",
        "admissionNumber firstName lastName rollNumber"
      )
      .populate("class", "name code")
      .populate("section", "name code")
      .populate("markedBy", "employeeId firstName lastName")
      .sort({
        date: -1,
        "student.rollNumber": 1,
      });

    res.status(200).json({
      success: true,
      data: {
        attendance,
      },
    });
  } catch (error) {
    console.error("Get Attendance Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
    });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    if (req.body.status) {
      if (
        ![
          "present",
          "absent",
          "late",
          "leave",
        ].includes(req.body.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status",
        });
      }

      attendance.status = req.body.status;
    }

    if (req.body.remarks !== undefined) {
      attendance.remarks = req.body.remarks;
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: {
        attendance,
      },
    });
  } catch (error) {
    console.error("Update Attendance Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update attendance",
    });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    await attendance.deleteOne();

    res.status(200).json({
      success: true,
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    console.error("Delete Attendance Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete attendance",
    });
  }
};
const getMyChildAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, from, to } = req.query;

    const schoolId = req.user.school._id;

    // Find parent profile linked to logged-in user
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
          "You are not authorized to view this student's attendance",
      });
    }

    // Build attendance filter
    const filter = {
      school: schoolId,
      student: studentId,
    };

    if (academicYear) {
      filter.academicYear = academicYear;
    }

    if (from || to) {
      filter.date = {};

      if (from) {
        filter.date.$gte = new Date(from);
      }

      if (to) {
        filter.date.$lte = new Date(to);
      }
    }

    const attendance = await Attendance.find(filter)
      .populate(
        "student",
        "admissionNumber firstName lastName rollNumber"
      )
      .populate("class", "name code")
      .populate("section", "name code")
      .sort({
        date: -1,
      });

    // Attendance summary
    const summary = {
      total: attendance.length,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
    };

    attendance.forEach((record) => {
      if (summary[record.status] !== undefined) {
        summary[record.status]++;
      }
    });

    const percentage =
      summary.total > 0
        ? Number(
            (
              ((summary.present + summary.late) /
                summary.total) *
              100
            ).toFixed(2)
          )
        : 0;

    res.status(200).json({
      success: true,
      data: {
        student: attendance[0]?.student || {
          _id: studentId,
        },
        summary: {
          ...summary,
          percentage,
        },
        attendance,
      },
    });
  } catch (error) {
    console.error(
      "Get My Child Attendance Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch child attendance",
    });
  }
};

module.exports = {
  markAttendance,
  getAttendance,
  updateAttendance,
  deleteAttendance,
  getMyChildAttendance,
};
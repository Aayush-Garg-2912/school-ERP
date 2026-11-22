const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Class = require("../models/Class");
const Section = require("../models/Section");
const AcademicYear = require("../models/AcademicYear");
const Teacher = require("../models/Teacher");
const TeacherAssignment = require("../models/TeacherAssignment");
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

    // Strict Role Check: ONLY teachers can mark attendance
    const userRole = req.user.role?.name || req.user.role;
    if (userRole !== "teacher") {
      return res.status(403).json({
        success: false,
        message:
          "Attendance can only be taken by the designated Class Teacher. Administrators, Principals, and other staff have read-only access.",
      });
    }

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

    // Strict Class Teacher Check: Must be the designated Class Teacher for this class and section
    const isClassTeacher = await TeacherAssignment.findOne({
      school: schoolId,
      teacher: teacher._id,
      class: classId,
      section: sectionId,
      isClassTeacher: true,
      isActive: true,
    });

    const isSectionTeacher =
      section.classTeacher &&
      String(section.classTeacher) === String(teacher._id);

    if (!isClassTeacher && !isSectionTeacher) {
      return res.status(403).json({
        success: false,
        message:
          "Access Denied: Only the designated Class Teacher of this class and section can mark attendance.",
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

    const userRole = req.user.role?.name || req.user.role;

    if (userRole === "student") {
      // 1. Student can see ONLY their own self attendance
      const selfStudentId = req.user.student?._id || req.user.student;
      if (!selfStudentId) {
        return res.status(200).json({ success: true, data: { attendance: [] } });
      }
      filter.student = selfStudentId;
    } else if (userRole === "parent") {
      // 2. Parent can see ONLY their own children's attendance
      const parent = await Parent.findOne({
        user: req.user._id,
        school: req.user.school._id,
      });

      if (!parent) {
        return res.status(200).json({ success: true, data: { attendance: [] } });
      }

      const parentStudents = await ParentStudent.find({
        school: req.user.school._id,
        parent: parent._id,
      });

      const childIds = parentStudents.map((ps) => ps.student);
      if (studentId) {
        const isMyChild = childIds.some((id) => String(id) === String(studentId));
        if (!isMyChild) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized: You can only view attendance for your own children.",
          });
        }
        filter.student = studentId;
      } else {
        filter.student = { $in: childIds };
      }
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

    // Strict Role Check: ONLY teachers can modify attendance
    const userRole = req.user.role?.name || req.user.role;
    if (userRole !== "teacher") {
      return res.status(403).json({
        success: false,
        message:
          "Attendance can only be modified by the designated Class Teacher. Administrators and other staff have read-only access.",
      });
    }

    const teacher = await Teacher.findOne({
      _id: req.user.teacher,
      school: req.user.school._id,
      isActive: true,
    });

    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: "Teacher account not found",
      });
    }

    // Verify Class Teacher authority
    const isClassTeacher = await TeacherAssignment.findOne({
      school: req.user.school._id,
      teacher: teacher._id,
      class: attendance.class,
      section: attendance.section,
      isClassTeacher: true,
      isActive: true,
    });

    const sectionDoc = await Section.findById(attendance.section);
    const isSectionTeacher =
      sectionDoc?.classTeacher &&
      String(sectionDoc.classTeacher) === String(teacher._id);

    if (!isClassTeacher && !isSectionTeacher) {
      return res.status(403).json({
        success: false,
        message:
          "Access Denied: Only the designated Class Teacher of this class and section can update attendance.",
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

    // Strict Role Check: ONLY teachers can delete attendance
    const userRole = req.user.role?.name || req.user.role;
    if (userRole !== "teacher") {
      return res.status(403).json({
        success: false,
        message:
          "Attendance can only be deleted by the designated Class Teacher. Administrators and other staff have read-only access.",
      });
    }

    const teacher = await Teacher.findOne({
      _id: req.user.teacher,
      school: req.user.school._id,
      isActive: true,
    });

    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: "Teacher account not found",
      });
    }

    const isClassTeacher = await TeacherAssignment.findOne({
      school: req.user.school._id,
      teacher: teacher._id,
      class: attendance.class,
      section: attendance.section,
      isClassTeacher: true,
      isActive: true,
    });

    const sectionDoc = await Section.findById(attendance.section);
    const isSectionTeacher =
      sectionDoc?.classTeacher &&
      String(sectionDoc.classTeacher) === String(teacher._id);

    if (!isClassTeacher && !isSectionTeacher) {
      return res.status(403).json({
        success: false,
        message:
          "Access Denied: Only the designated Class Teacher of this class and section can delete attendance.",
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
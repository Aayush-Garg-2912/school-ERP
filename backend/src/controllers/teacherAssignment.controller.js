const TeacherAssignment = require("../models/TeacherAssignment");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Section = require("../models/Section");
const Subject = require("../models/Subject");
const AcademicYear = require("../models/AcademicYear");

const createTeacherAssignment = async (req, res) => {
  try {
    const {
      academicYear,
      teacherId,
      classId,
      sectionId,
      subjectId,
      isClassTeacher,
    } = req.body;

    if (
      !academicYear ||
      !teacherId ||
      !classId ||
      !sectionId ||
      !subjectId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, teacher, class, section and subject are required",
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

    const teacher = await Teacher.findOne({
      _id: teacherId,
      school: schoolId,
      isActive: true,
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
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
        message:
          "Section does not belong to this class or academic year",
      });
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      school: schoolId,
      isActive: true,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    const assignment = await TeacherAssignment.findOne({
      school: schoolId,
      academicYear,
      teacher: teacherId,
      class: classId,
      section: sectionId,
      subject: subjectId,
    });

    if (assignment) {
      return res.status(409).json({
        success: false,
        message: "This teacher assignment already exists",
      });
    }

    const newAssignment = await TeacherAssignment.create({
      school: schoolId,
      academicYear,
      teacher: teacherId,
      class: classId,
      section: sectionId,
      subject: subjectId,
      isClassTeacher: isClassTeacher || false,
    });

    res.status(201).json({
      success: true,
      message: "Teacher assigned successfully",
      data: {
        assignment: newAssignment,
      },
    });
  } catch (error) {
    console.error("Create Teacher Assignment Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to assign teacher",
    });
  }
};

const getTeacherAssignments = async (req, res) => {
  try {
    const filter = {
      school: req.user.school._id,
    };

    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }

    if (req.query.teacherId) {
      filter.teacher = req.query.teacherId;
    }

    if (req.query.classId) {
      filter.class = req.query.classId;
    }

    if (req.query.sectionId) {
      filter.section = req.query.sectionId;
    }

    const assignments = await TeacherAssignment.find(filter)
      .populate(
        "teacher",
        "employeeId firstName lastName designation"
      )
      .populate("academicYear", "name")
      .populate("class", "name code")
      .populate("section", "name code")
      .populate("subject", "name code type")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        assignments,
      },
    });
  } catch (error) {
    console.error("Get Teacher Assignments Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch teacher assignments",
    });
  }
};

const getTeacherAssignmentById = async (req, res) => {
  try {
    const assignment = await TeacherAssignment.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    })
      .populate(
        "teacher",
        "employeeId firstName lastName designation"
      )
      .populate("academicYear", "name")
      .populate("class", "name code")
      .populate("section", "name code")
      .populate("subject", "name code type");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Teacher assignment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        assignment,
      },
    });
  } catch (error) {
    console.error("Get Teacher Assignment Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch teacher assignment",
    });
  }
};

const updateTeacherAssignment = async (req, res) => {
  try {
    const assignment = await TeacherAssignment.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Teacher assignment not found",
      });
    }

    if (req.body.isClassTeacher !== undefined) {
      assignment.isClassTeacher =
        req.body.isClassTeacher;
    }

    if (req.body.isActive !== undefined) {
      assignment.isActive = req.body.isActive;
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Teacher assignment updated successfully",
      data: {
        assignment,
      },
    });
  } catch (error) {
    console.error("Update Teacher Assignment Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update teacher assignment",
    });
  }
};

const deleteTeacherAssignment = async (req, res) => {
  try {
    const assignment = await TeacherAssignment.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Teacher assignment not found",
      });
    }

    await assignment.deleteOne();

    res.status(200).json({
      success: true,
      message: "Teacher assignment removed successfully",
    });
  } catch (error) {
    console.error("Delete Teacher Assignment Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove teacher assignment",
    });
  }
};

module.exports = {
  createTeacherAssignment,
  getTeacherAssignments,
  getTeacherAssignmentById,
  updateTeacherAssignment,
  deleteTeacherAssignment,
};
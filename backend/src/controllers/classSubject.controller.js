const ClassSubject = require("../models/ClassSubject");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const AcademicYear = require("../models/AcademicYear");

const createClassSubject = async (req, res) => {
  try {
    const {
      academicYear,
      classId,
      subjectId,
      isCompulsory,
      periodsPerWeek,
      maxMarks,
      passingMarks,
    } = req.body;

    if (!academicYear || !classId || !subjectId) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, class and subject are required",
      });
    }

    const year = await AcademicYear.findOne({
      _id: academicYear,
      school: req.user.school._id,
    });

    if (!year) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found",
      });
    }

    const classData = await Class.findOne({
      _id: classId,
      school: req.user.school._id,
      academicYear,
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      school: req.user.school._id,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    const existing = await ClassSubject.findOne({
      school: req.user.school._id,
      academicYear,
      class: classId,
      subject: subjectId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Subject already assigned to this class",
      });
    }

    const classSubject = await ClassSubject.create({
      school: req.user.school._id,
      academicYear,
      class: classId,
      subject: subjectId,
      isCompulsory,
      periodsPerWeek,
      maxMarks,
      passingMarks,
    });

    res.status(201).json({
      success: true,
      message: "Subject assigned to class successfully",
      data: {
        classSubject,
      },
    });
  } catch (error) {
    console.error("Create Class Subject Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to assign subject",
    });
  }
};

const getClassSubjects = async (req, res) => {
  try {
    const filter = {
      school: req.user.school._id,
    };

    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }

    if (req.query.classId) {
      filter.class = req.query.classId;
    }

    const classSubjects = await ClassSubject.find(filter)
      .populate("academicYear", "name")
      .populate("class", "name code")
      .populate(
        "subject",
        "name code type"
      )
      .sort({ "subject.name": 1 });

    res.status(200).json({
      success: true,
      data: {
        classSubjects,
      },
    });
  } catch (error) {
    console.error("Get Class Subjects Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch class subjects",
    });
  }
};

const getClassSubjectById = async (req, res) => {
  try {
    const classSubject = await ClassSubject.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    })
      .populate("academicYear", "name")
      .populate("class", "name code")
      .populate("subject", "name code type");

    if (!classSubject) {
      return res.status(404).json({
        success: false,
        message: "Class subject not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        classSubject,
      },
    });
  } catch (error) {
    console.error("Get Class Subject Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch class subject",
    });
  }
};

const updateClassSubject = async (req, res) => {
  try {
    const classSubject = await ClassSubject.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!classSubject) {
      return res.status(404).json({
        success: false,
        message: "Class subject not found",
      });
    }

    const allowedFields = [
      "isCompulsory",
      "periodsPerWeek",
      "maxMarks",
      "passingMarks",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        classSubject[field] = req.body[field];
      }
    });

    await classSubject.save();

    res.status(200).json({
      success: true,
      message: "Class subject updated successfully",
      data: {
        classSubject,
      },
    });
  } catch (error) {
    console.error("Update Class Subject Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update class subject",
    });
  }
};

const deleteClassSubject = async (req, res) => {
  try {
    const classSubject = await ClassSubject.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!classSubject) {
      return res.status(404).json({
        success: false,
        message: "Class subject not found",
      });
    }

    await classSubject.deleteOne();

    res.status(200).json({
      success: true,
      message: "Subject removed from class successfully",
    });
  } catch (error) {
    console.error("Delete Class Subject Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove subject",
    });
  }
};

module.exports = {
  createClassSubject,
  getClassSubjects,
  getClassSubjectById,
  updateClassSubject,
  deleteClassSubject,
};
const Exam = require("../models/Exam");
const ExamSubject = require("../models/ExamSubject");
const AcademicYear = require("../models/AcademicYear");
const Class = require("../models/Class");
const Subject = require("../models/Subject");

const createExam = async (req, res) => {
  try {
    const {
      academicYear,
      name,
      type,
      startDate,
      endDate,
      description,
    } = req.body;

    if (
      !academicYear ||
      !name ||
      !type ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, name, type, start date and end date are required",
      });
    }

    if (
      new Date(startDate) >
      new Date(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Start date cannot be after end date",
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

    const existingExam = await Exam.findOne({
      school: schoolId,
      academicYear,
      name,
      isActive: true,
    });

    if (existingExam) {
      return res.status(409).json({
        success: false,
        message: "Exam with this name already exists",
      });
    }

    const exam = await Exam.create({
      school: schoolId,
      academicYear,
      name,
      type,
      startDate,
      endDate,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      data: {
        exam,
      },
    });
  } catch (error) {
    console.error("Create Exam Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create exam",
    });
  }
};

const getExams = async (req, res) => {
  try {
    const filter = {
      school: req.user.school._id,
    };

    if (req.query.academicYear) {
      filter.academicYear =
        req.query.academicYear;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const exams = await Exam.find(filter)
      .populate("academicYear", "name")
      .sort({
        startDate: -1,
      });

    res.status(200).json({
      success: true,
      data: {
        exams,
      },
    });
  } catch (error) {
    console.error("Get Exams Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch exams",
    });
  }
};

const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    }).populate("academicYear", "name");

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const subjects = await ExamSubject.find({
      exam: exam._id,
      school: req.user.school._id,
    })
      .populate("class", "name code")
      .populate("subject", "name code type")
      .sort({
        examDate: 1,
      });

    res.status(200).json({
      success: true,
      data: {
        exam,
        subjects,
      },
    });
  } catch (error) {
    console.error("Get Exam Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch exam",
    });
  }
};

const addExamSubject = async (req, res) => {
  try {
    const {
      classId,
      subjectId,
      maxMarks,
      passingMarks,
      theoryMaxMarks = 0,
      practicalMaxMarks = 0,
      examDate,
      startTime,
      endTime,
    } = req.body;

    if (
      !classId ||
      !subjectId ||
      !maxMarks ||
      passingMarks === undefined ||
      !examDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Class, subject, max marks, passing marks and exam date are required",
      });
    }

    if (
      Number(theoryMaxMarks) +
        Number(practicalMaxMarks) !==
      Number(maxMarks)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Theory + practical marks must equal max marks",
      });
    }

    if (passingMarks > maxMarks) {
      return res.status(400).json({
        success: false,
        message:
          "Passing marks cannot exceed max marks",
      });
    }

    const schoolId = req.user.school._id;

    const exam = await Exam.findOne({
      _id: req.params.id,
      school: schoolId,
      isActive: true,
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const classData = await Class.findOne({
      _id: classId,
      school: schoolId,
      academicYear: exam.academicYear,
      isActive: true,
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
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

    const existing = await ExamSubject.findOne({
      school: schoolId,
      exam: exam._id,
      class: classId,
      subject: subjectId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "This subject is already added to the exam for this class",
      });
    }

    const examSubject =
      await ExamSubject.create({
        school: schoolId,
        exam: exam._id,
        class: classId,
        subject: subjectId,
        maxMarks,
        passingMarks,
        theoryMaxMarks,
        practicalMaxMarks,
        examDate,
        startTime,
        endTime,
      });

    res.status(201).json({
      success: true,
      message:
        "Subject added to exam successfully",
      data: {
        examSubject,
      },
    });
  } catch (error) {
    console.error(
      "Add Exam Subject Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to add subject to exam",
    });
  }
};

const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, school: req.user.school._id });
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    await ExamSubject.deleteMany({ exam: exam._id, school: exam.school });
    await exam.deleteOne();
    return res.json({ success: true, message: "Exam deleted successfully" });
  } catch (error) { return res.status(500).json({ success: false, message: error.message || "Failed to delete exam" });
  }
};

const updateExamStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "draft",
      "scheduled",
      "ongoing",
      "completed",
      "published",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam status",
      });
    }

    const exam = await Exam.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    exam.status = status;

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Exam status updated successfully",
      data: {
        exam,
      },
    });
  } catch (error) {
    console.error(
      "Update Exam Status Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to update exam status",
    });
  }
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  addExamSubject,
  updateExamStatus,
  deleteExam,
};
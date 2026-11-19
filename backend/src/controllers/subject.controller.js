const Subject = require("../models/Subject");

const createSubject = async (req, res) => {
  try {
    const {
      name,
      code,
      type,
      maxMarks,
      passingMarks,
      isOptional,
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Name and code are required",
      });
    }

    const existingSubject = await Subject.findOne({
      school: req.user.school._id,
      code: code.toUpperCase(),
    });

    if (existingSubject) {
      return res.status(409).json({
        success: false,
        message: "Subject with this code already exists",
      });
    }

    const subject = await Subject.create({
      school: req.user.school._id,
      name: name.trim(),
      code: code.toUpperCase(),
      type,
      maxMarks,
      passingMarks,
      isOptional,
    });

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: {
        subject,
      },
    });
  } catch (error) {
    console.error("Create Subject Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create subject",
    });
  }
};

const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({
      school: req.user.school._id,
    }).sort({
      name: 1,
    });

    res.status(200).json({
      success: true,
      data: {
        subjects,
      },
    });
  } catch (error) {
    console.error("Get Subjects Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
    });
  }
};

const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        subject,
      },
    });
  } catch (error) {
    console.error("Get Subject Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch subject",
    });
  }
};

const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    const allowedFields = [
      "name",
      "code",
      "type",
      "maxMarks",
      "passingMarks",
      "isOptional",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        subject[field] =
          field === "code"
            ? req.body[field].toUpperCase()
            : req.body[field];
      }
    });

    await subject.save();

    res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      data: {
        subject,
      },
    });
  } catch (error) {
    console.error("Update Subject Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update subject",
    });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    await subject.deleteOne();

    res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("Delete Subject Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete subject",
    });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
const Class = require("../models/Class");
const AcademicYear = require("../models/AcademicYear");

const createClass = async (req, res) => {
  try {
    const {
      academicYear,
      name,
      code,
      order,
    } = req.body;

    if (
      !academicYear ||
      !name ||
      !code ||
      order === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, name, code and order are required",
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

    const existingClass = await Class.findOne({
      school: req.user.school._id,
      academicYear,
      $or: [
        { name: name.trim() },
        { code: code.toUpperCase() },
      ],
    });

    if (existingClass) {
      return res.status(409).json({
        success: false,
        message: "Class with this name or code already exists",
      });
    }

    const newClass = await Class.create({
      school: req.user.school._id,
      academicYear,
      name: name.trim(),
      code: code.toUpperCase(),
      order,
    });

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: {
        class: newClass,
      },
    });
  } catch (error) {
    console.error("Create Class Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create class",
    });
  }
};

const getClasses = async (req, res) => {
  try {
    const filter = {
      school: req.user.school._id,
    };

    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }

    const classes = await Class.find(filter)
      .populate("academicYear", "name startDate endDate")
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: {
        classes,
      },
    });
  } catch (error) {
    console.error("Get Classes Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
    });
  }
};

const getClassById = async (req, res) => {
  try {
    const classData = await Class.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    }).populate(
      "academicYear",
      "name startDate endDate"
    );

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        class: classData,
      },
    });
  } catch (error) {
    console.error("Get Class Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch class",
    });
  }
};

const updateClass = async (req, res) => {
  try {
    const classData = await Class.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const allowedFields = [
      "name",
      "code",
      "order",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        classData[field] =
          field === "code"
            ? req.body[field].toUpperCase()
            : req.body[field];
      }
    });

    await classData.save();

    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      data: {
        class: classData,
      },
    });
  } catch (error) {
    console.error("Update Class Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update class",
    });
  }
};

const deleteClass = async (req, res) => {
  try {
    const classData = await Class.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    await classData.deleteOne();

    res.status(200).json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Delete Class Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete class",
    });
  }
};

module.exports = {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
};
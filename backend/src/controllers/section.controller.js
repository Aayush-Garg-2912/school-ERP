const Section = require("../models/Section");
const Class = require("../models/Class");
const AcademicYear = require("../models/AcademicYear");

const createSection = async (req, res) => {
  try {
    const {
      academicYear,
      classId,
      name,
      code,
      capacity,
      roomNumber,
    } = req.body;

    if (!academicYear || !classId || !name || !code) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, class, name and code are required",
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
        message: "Class not found for this academic year",
      });
    }

    const existingSection = await Section.findOne({
      school: req.user.school._id,
      academicYear,
      class: classId,
      $or: [
        { name: name.trim() },
        { code: code.toUpperCase() },
      ],
    });

    if (existingSection) {
      return res.status(409).json({
        success: false,
        message: "Section with this name or code already exists",
      });
    }

    const section = await Section.create({
      school: req.user.school._id,
      academicYear,
      class: classId,
      name: name.trim(),
      code: code.toUpperCase(),
      capacity,
      roomNumber,
    });

    res.status(201).json({
      success: true,
      message: "Section created successfully",
      data: {
        section,
      },
    });
  } catch (error) {
    console.error("Create Section Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create section",
    });
  }
};

const getSections = async (req, res) => {
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

    const sections = await Section.find(filter)
      .populate("academicYear", "name")
      .populate("class", "name code order")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: {
        sections,
      },
    });
  } catch (error) {
    console.error("Get Sections Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch sections",
    });
  }
};

const getSectionById = async (req, res) => {
  try {
    const section = await Section.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    })
      .populate("academicYear", "name")
      .populate("class", "name code order");

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        section,
      },
    });
  } catch (error) {
    console.error("Get Section Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch section",
    });
  }
};

const updateSection = async (req, res) => {
  try {
    const section = await Section.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    const allowedFields = [
      "name",
      "code",
      "capacity",
      "roomNumber",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        section[field] =
          field === "code"
            ? req.body[field].toUpperCase()
            : req.body[field];
      }
    });

    await section.save();

    res.status(200).json({
      success: true,
      message: "Section updated successfully",
      data: {
        section,
      },
    });
  } catch (error) {
    console.error("Update Section Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update section",
    });
  }
};

const deleteSection = async (req, res) => {
  try {
    const section = await Section.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    await section.deleteOne();

    res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    console.error("Delete Section Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete section",
    });
  }
};

module.exports = {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
};
const School = require("../models/School");

const getSchool = async (req, res) => {
  try {
    const school = await School.findById(req.user.school._id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        school,
      },
    });
  } catch (error) {
    console.error("Get School Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch school information",
    });
  }
};

const updateSchool = async (req, res) => {
  try {
    const school = await School.findById(req.user.school._id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    const allowedFields = [
      "name",
      "email",
      "phone",
      "address",
      "logo",
      "website",
      "currentAcademicYear",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        school[field] = req.body[field];
      }
    });

    await school.save();

    res.status(200).json({
      success: true,
      message: "School information updated successfully",
      data: {
        school,
      },
    });
  } catch (error) {
    console.error("Update School Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update school information",
    });
  }
};

module.exports = {
  getSchool,
  updateSchool,
};
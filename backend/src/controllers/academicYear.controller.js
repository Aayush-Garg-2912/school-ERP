const AcademicYear = require("../models/AcademicYear");
const createAcademicYear = async (req, res) => {
  try {
    const { name, startDate, endDate, isCurrent } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Name, start date and end date are required",
      });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    const school = req.user.school._id;

    const existingYear = await AcademicYear.findOne({
      school,
      name: name.trim(),
    });

    if (existingYear) {
      return res.status(409).json({
        success: false,
        message: "Academic year already exists",
      });
    }

    // Check whether this school already has a current academic year
    const currentYear = await AcademicYear.findOne({
      school,
      isCurrent: true,
    });

    // First academic year automatically becomes current
    const shouldBeCurrent =
      isCurrent === true || !currentYear;

    // If explicitly making this year current,
    // remove current status from all other years
    if (shouldBeCurrent) {
      await AcademicYear.updateMany(
        { school },
        { $set: { isCurrent: false } }
      );
    }

    const academicYear = await AcademicYear.create({
      school,
      name: name.trim(),
      startDate,
      endDate,
      isCurrent: shouldBeCurrent,
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "Academic year created successfully",
      data: { academicYear },
    });
  } catch (e) {
    console.error("Create Academic Year Error:", e);

    return res.status(500).json({
      success: false,
      message: e.message || "Failed to create academic year",
    });
  }
};
const getAcademicYears = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        academicYears: await AcademicYear.find({
          school: req.user.school._id,
        }).sort({ startDate: -1 }),
      },
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch academic years" });
  }
};
const getCurrentAcademicYear = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findOne({
      school: req.user.school._id,
      isCurrent: true,
    });
    if (!academicYear)
      return res
        .status(404)
        .json({ success: false, message: "No current academic year found" });
    return res.json({ success: true, data: { academicYear } });
  } catch (e) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch current academic year",
      });
  }
};
const updateAcademicYear = async (req, res) => {
  try {
    const y = await AcademicYear.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });
    if (!y)
      return res
        .status(404)
        .json({ success: false, message: "Academic year not found" });
    const { name, startDate, endDate, isCurrent, status } = req.body;
    if (startDate && endDate && new Date(startDate) >= new Date(endDate))
      return res
        .status(400)
        .json({ success: false, message: "End date must be after start date" });
    if (name !== undefined) y.name = name.trim();
    if (startDate !== undefined) y.startDate = startDate;
    if (endDate !== undefined) y.endDate = endDate;
    if (status !== undefined) y.status = status;
    if (isCurrent === true) {
      await AcademicYear.updateMany(
        { school: y.school, _id: { $ne: y._id } },
        { $set: { isCurrent: false } },
      );
      y.isCurrent = true;
    } else if (isCurrent === false) y.isCurrent = false;
    await y.save();
    return res.json({
      success: true,
      message: "Academic year updated successfully",
      data: { academicYear: y },
    });
  } catch (e) {
    return res
      .status(500)
      .json({
        success: false,
        message: e.message || "Failed to update academic year",
      });
  }
};
const deleteAcademicYear = async (req, res) => {
  try {
    const y = await AcademicYear.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });
    if (!y)
      return res
        .status(404)
        .json({ success: false, message: "Academic year not found" });
    if (y.isCurrent)
      return res
        .status(400)
        .json({
          success: false,
          message: "Current academic year cannot be deleted",
        });
    await y.deleteOne();
    return res.json({
      success: true,
      message: "Academic year deleted successfully",
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete academic year" });
  }
};
module.exports = {
  createAcademicYear,
  getAcademicYears,
  getCurrentAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
};

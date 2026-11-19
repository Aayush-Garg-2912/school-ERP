const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Parent = require("../models/Parent");

const getDashboard = async (req, res) => {
  try {
    const schoolId = req.user.school._id;

    const [totalUsers, totalTeachers, totalStudents, totalParents] = await Promise.all([
      User.countDocuments({ school: schoolId, isActive: true }),
      Teacher.countDocuments({ school: schoolId, isActive: true }),
      Student.countDocuments({ school: schoolId, status: "active" }),
      Parent.countDocuments({ school: schoolId, isActive: true }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Chairman dashboard data fetched successfully",
      data: {
        school: {
          id: req.user.school._id,
          name: req.user.school.name,
          code: req.user.school.code,
        },
        statistics: {
          totalUsers,
          totalTeachers,
          totalStudents,
          totalParents,
        },
      },
    });
  } catch (error) {
    console.error("Chairman Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load chairman dashboard",
    });
  }
};

module.exports = { getDashboard };

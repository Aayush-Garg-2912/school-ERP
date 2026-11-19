const Notice = require("../models/Notice");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Role = require("../models/Role");

const createNotice = async (req, res) => {
  try {
    const {
      title,
      content,
      category = "general",
      targetAudience = ["all"],
      expiryDate = null,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const allowedCategories = [
      "general",
      "academic",
      "event",
      "holiday",
      "exam",
      "fee",
      "emergency",
      "other",
    ];

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice category",
      });
    }

    const allowedAudience = [
      "all",
      "teacher",
      "staff",
      "student",
      "parent",
    ];

    if (
      !Array.isArray(targetAudience) ||
      targetAudience.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Target audience is required",
      });
    }

    const invalidAudience =
      targetAudience.some(
        (item) =>
          !allowedAudience.includes(item)
      );

    if (invalidAudience) {
      return res.status(400).json({
        success: false,
        message: "Invalid target audience",
      });
    }

    const schoolId = req.user.school._id;

    const notice = await Notice.create({
      school: schoolId,
      title,
      content,
      category,
      targetAudience,
      expiryDate: expiryDate
        ? new Date(expiryDate)
        : null,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Notice created successfully",
      data: {
        notice,
      },
    });
  } catch (error) {
    console.error(
      "Create Notice Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create notice",
    });
  }
};
const getNotices = async (req, res) => {
  try {
    const schoolId = req.user.school._id;

    const filter = {
      school: schoolId,
      published: true,
    };

    const userRole = req.user.role.name;

    // Only show notices applicable to the logged-in user
    if (userRole !== "principal" && userRole !== "chairman" && userRole !== "admin") {
      filter.targetAudience = {
        $in: ["all", userRole],
      };
    }

    const notices = await Notice.find(filter)
      .populate(
        "createdBy",
        "name email role"
      )
      .sort({
        pinned: -1,
        publishDate: -1,
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      data: {
        notices,
      },
    });
  } catch (error) {
    console.error(
      "Get Notices Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch notices",
    });
  }
};
const getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find({
      school: req.user.school._id,
    })
      .populate(
        "createdBy",
        "name email role"
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      data: {
        notices,
      },
    });
  } catch (error) {
    console.error(
      "Get All Notices Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch all notices",
    });
  }
};
const togglePublish = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    // Unpublish
    if (notice.published) {
      notice.published = false;
      notice.publishDate = null;

      await notice.save();

      return res.status(200).json({
        success: true,
        message: "Notice unpublished successfully",
        data: {
          notice,
        },
      });
    }

    // Publish
    notice.published = true;
    notice.publishDate = new Date();

    await notice.save();

    // Find target users
let userFilter = {
  school: req.user.school._id,
  isActive: true,
};

const audience = notice.targetAudience;

if (!audience.includes("all")) {
  const roles = await Role.find({
    name: {
      $in: audience,
    },
  }).select("_id");

  const roleIds = roles.map(
    (role) => role._id
  );

  userFilter.role = {
    $in: roleIds,
  };
}

const users = await User.find(userFilter).select(
  "_id"
);

    // Create notifications
   if (users.length > 0) {
  const notifications = [];

  for (const user of users) {
    const existingNotification =
      await Notification.findOne({
        school: req.user.school._id,
        recipient: user._id,
        referenceId: notice._id,
        referenceType: "Notice",
        type: "notice",
      });

    if (!existingNotification) {
      notifications.push({
        school: req.user.school._id,
        recipient: user._id,
        type: "notice",
        title: notice.title,
        message: notice.content,
        referenceId: notice._id,
        referenceType: "Notice",
        isRead: false,
      });
    }
  }

  if (notifications.length > 0) {
    await Notification.insertMany(
      notifications
    );
  }
}
    res.status(200).json({
      success: true,
      message:
        "Notice published and notifications sent successfully",

      data: {
        notice,
        notificationsSent: users.length,
      },
    });
  } catch (error) {
    console.error(
      "Publish Notice Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to publish notice",
    });
  }
};
const togglePin = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    notice.pinned = !notice.pinned;

    await notice.save();

    res.status(200).json({
      success: true,
      message: notice.pinned
        ? "Notice pinned successfully"
        : "Notice unpinned successfully",
      data: {
        notice,
      },
    });
  } catch (error) {
    console.error(
      "Pin Notice Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to pin/unpin notice",
    });
  }
};
const updateNotice = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    const {
      title,
      content,
      category,
      targetAudience,
      expiryDate,
    } = req.body;
    const allowedCategories = [
  "general",
  "academic",
  "event",
  "holiday",
  "exam",
  "fee",
  "emergency",
  "other",
];

const allowedAudience = [
  "all",
  "teacher",
  "staff",
  "student",
  "parent",
];

if (
  category !== undefined &&
  !allowedCategories.includes(category)
) {
  return res.status(400).json({
    success: false,
    message: "Invalid notice category",
  });
}

if (targetAudience !== undefined) {
  if (
    !Array.isArray(targetAudience) ||
    targetAudience.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid target audience",
    });
  }

  const invalidAudience =
    targetAudience.some(
      (item) =>
        !allowedAudience.includes(item)
    );

  if (invalidAudience) {
    return res.status(400).json({
      success: false,
      message: "Invalid target audience",
    });
  }
}

    if (title !== undefined) {
      notice.title = title;
    }

    if (content !== undefined) {
      notice.content = content;
    }

    if (category !== undefined) {
      notice.category = category;
    }

    if (targetAudience !== undefined) {
      notice.targetAudience =
        targetAudience;
    }

    if (expiryDate !== undefined) {
      notice.expiryDate = expiryDate
        ? new Date(expiryDate)
        : null;
    }

    await notice.save();

    res.status(200).json({
      success: true,
      message: "Notice updated successfully",
      data: {
        notice,
      },
    });
  } catch (error) {
    console.error(
      "Update Notice Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update notice",
    });
  }
};
const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    await Notification.deleteMany({
  school: req.user.school._id,
  referenceId: notice._id,
  referenceType: "Notice",
});

await notice.deleteOne();

    res.status(200).json({
      success: true,
      message: "Notice deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Notice Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to delete notice",
    });
  }
};
module.exports = {
  createNotice,
  getNotices,
  getAllNotices,
  updateNotice,
  deleteNotice,
  togglePublish,
  togglePin,
};
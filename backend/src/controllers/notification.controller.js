const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
  try {
    const notifications =
      await Notification.find({
        school: req.user.school._id,
        recipient: req.user._id,
      })
        .sort({
          createdAt: -1,
        })
        .limit(50);

    const unreadCount =
      await Notification.countDocuments({
        school: req.user.school._id,
        recipient: req.user._id,
        isRead: false,
      });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error(
      "Get Notifications Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch notifications",
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification =
      await Notification.findOne({
        _id: req.params.id,
        school: req.user.school._id,
        recipient: req.user._id,
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

   if (!notification.isRead) {
  notification.isRead = true;
  notification.readAt = new Date();

  await notification.save();
}

    await notification.save();

    res.status(200).json({
      success: true,
      message:
        "Notification marked as read",
      data: {
        notification,
      },
    });
  } catch (error) {
    console.error(
      "Mark Notification Read Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to update notification",
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        school: req.user.school._id,
        recipient: req.user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message:
        "All notifications marked as read",
    });
  } catch (error) {
    console.error(
      "Mark All Notifications Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to update notifications",
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
const WhatsAppMessage = require("../models/WhatsAppMessage");
const WhatsAppService = require("../services/whatsapp.service");
const StudentFee = require("../models/StudentFee");

// 1. Get WhatsApp Overview Metrics
const getWhatsAppStats = async (req, res) => {
  try {
    const schoolId = req.user.school._id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalSent,
      sentToday,
      deliveredCount,
      failedCount,
      birthdays,
      pendingFeesCount,
    ] = await Promise.all([
      WhatsAppMessage.countDocuments({ school: schoolId }),
      WhatsAppMessage.countDocuments({ school: schoolId, createdAt: { $gte: startOfToday } }),
      WhatsAppMessage.countDocuments({ school: schoolId, status: "delivered" }),
      WhatsAppMessage.countDocuments({ school: schoolId, status: "failed" }),
      WhatsAppService.getTodayBirthdays(schoolId),
      StudentFee.countDocuments({
        school: schoolId,
        status: { $in: ["pending", "partial", "overdue"] },
        dueAmount: { $gt: 0 },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSent,
        sentToday,
        deliveredCount,
        failedCount,
        todayBirthdays: birthdays.totalBirthdays,
        studentsBirthday: birthdays.students.length,
        staffBirthday: birthdays.teachers.length,
        pendingFeesCount,
      },
    });
  } catch (err) {
    console.error("Get WhatsApp Stats Error:", err);
    res.status(500).json({ success: false, message: "Failed to load WhatsApp statistics" });
  }
};

// 2. Get Historical WhatsApp Messages (Paginated & Filterable)
const getWhatsAppMessages = async (req, res) => {
  try {
    const schoolId = req.user.school._id;
    const {
      page = 1,
      limit = 20,
      messageType,
      status,
      targetScope,
      search,
    } = req.query;

    const query = { school: schoolId };

    if (messageType && messageType !== "all") query.messageType = messageType;
    if (status && status !== "all") query.status = status;
    if (targetScope && targetScope !== "all") query.targetScope = targetScope;

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { recipientName: searchRegex },
        { phoneNumber: searchRegex },
        { title: searchRegex },
        { content: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [messages, total] = await Promise.all([
      WhatsAppMessage.find(query)
        .populate("sentBy", "name email role")
        .populate("class", "name")
        .populate("section", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      WhatsAppMessage.countDocuments(query),
    ]);

    // Attach direct wa.me link for convenience
    const enrichedMessages = messages.map((m) => ({
      ...m,
      directUrl: WhatsAppService.getDirectChatUrl(m.phoneNumber, m.content),
    }));

    res.status(200).json({
      success: true,
      data: {
        messages: enrichedMessages,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (err) {
    console.error("Get WhatsApp Messages Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch WhatsApp logs" });
  }
};

// 3. Send / Broadcast WhatsApp Message
const sendMessage = async (req, res) => {
  try {
    const schoolId = req.user.school._id;
    const {
      targetScope, // 'individual' | 'class' | 'school' | 'staff'
      recipientType = "general",
      recipientId,
      recipientName,
      phoneNumber,
      classId,
      sectionId,
      messageType = "custom",
      title,
      content,
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Message content is required" });
    }

    if (!targetScope) {
      return res.status(400).json({ success: false, message: "Target scope is required" });
    }

    // Role boundary guardrail: Teachers cannot broadcast to full school or full staff
    const userRole = req.user.role;
    if (["school", "staff"].includes(targetScope)) {
      if (!["chairman", "principal", "admin"].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to broadcast to the entire school or staff.",
        });
      }
    }

    const result = await WhatsAppService.broadcastMessage({
      schoolId,
      targetScope,
      classId,
      sectionId,
      recipientType,
      recipientId,
      recipientName,
      phoneNumber,
      messageType,
      title: title || `${messageType.toUpperCase()} Message`,
      content: content.trim(),
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: "WhatsApp message(s) processed successfully",
      data: result,
    });
  } catch (err) {
    console.error("Send WhatsApp Message Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to dispatch message" });
  }
};

// 4. Get Today's Birthdays
const getBirthdays = async (req, res) => {
  try {
    const schoolId = req.user.school._id;
    const data = await WhatsAppService.getTodayBirthdays(schoolId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Get Birthdays Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch birthday list" });
  }
};

// 5. Trigger Automated / Batch Birthday Wishes
const dispatchBirthdays = async (req, res) => {
  try {
    const schoolId = req.user.school._id;
    const { customTemplate } = req.body;

    const result = await WhatsAppService.dispatchBirthdayWishes(
      schoolId,
      req.user,
      customTemplate
    );

    res.status(200).json({
      success: true,
      message: `Birthday wishes dispatched! Sent: ${result.totalDispatched}, Failed: ${result.failed}`,
      data: result,
    });
  } catch (err) {
    console.error("Dispatch Birthdays Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to dispatch birthday wishes" });
  }
};

// 6. Trigger Bulk Fee Reminders
const dispatchFeeReminders = async (req, res) => {
  try {
    const schoolId = req.user.school._id;
    const { classId, sectionId, minDueAmount, customNote } = req.body;

    const result = await WhatsAppService.sendFeeReminders({
      schoolId,
      classId,
      sectionId,
      minDueAmount,
      customNote,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: `Fee reminders processed! Targeted: ${result.totalTargeted}, Sent: ${result.sentCount}`,
      data: result,
    });
  } catch (err) {
    console.error("Dispatch Fee Reminders Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to dispatch fee reminders" });
  }
};

module.exports = {
  getWhatsAppStats,
  getWhatsAppMessages,
  sendMessage,
  getBirthdays,
  dispatchBirthdays,
  dispatchFeeReminders,
};

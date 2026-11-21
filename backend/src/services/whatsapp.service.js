const WhatsAppMessage = require("../models/WhatsAppMessage");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Parent = require("../models/Parent");
const User = require("../models/User");
const FeePayment = require("../models/FeePayment");
const StudentFee = require("../models/StudentFee");
const Class = require("../models/Class");
const School = require("../models/School");

class WhatsAppService {
  /**
   * Format phone number to international WhatsApp standard
   * Standardizes 10-digit numbers with Indian prefix 91 if not present
   */
  static formatPhoneNumber(phone) {
    if (!phone) return "";
    let cleaned = String(phone).replace(/\D/g, "");
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }
    return cleaned;
  }

  /**
   * Generate direct WhatsApp Web / Click-to-Chat URL
   */
  static getDirectChatUrl(phoneNumber, message) {
    const formatted = this.formatPhoneNumber(phoneNumber);
    if (!formatted) return "";
    return `https://wa.me/${formatted}?text=${encodeURIComponent(message || "")}`;
  }

  /**
   * Core dispatch method
   */
  static async sendWhatsAppDirect({
    schoolId,
    recipientType,
    recipientId = null,
    recipientModel = null,
    recipientName,
    phoneNumber,
    messageType = "custom",
    targetScope = "individual",
    classId = null,
    sectionId = null,
    title = "",
    content,
    sentBy,
    metadata = {},
  }) {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      throw new Error(`Invalid phone number provided for recipient: ${recipientName}`);
    }

    let status = "sent";
    let gateway = "simulator";
    let gatewayResponseId = `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let errorMessage = null;

    // Check if live Meta Cloud API / Twilio credentials exist in env
    const metaToken = process.env.WHATSAPP_API_TOKEN;
    const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (metaToken && metaPhoneId) {
      try {
        gateway = "meta_cloud_api";
        const metaRes = await fetch(
          `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${metaToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: formattedPhone,
              type: "text",
              text: { preview_url: true, body: content },
            }),
          }
        );
        const metaData = await metaRes.json();
        if (metaRes.ok && metaData.messages?.[0]?.id) {
          gatewayResponseId = metaData.messages[0].id;
          status = "delivered";
        } else {
          status = "failed";
          errorMessage = metaData.error?.message || "Meta API error";
        }
      } catch (err) {
        status = "failed";
        errorMessage = err.message;
      }
    }

    // Persist in WhatsAppMessage collection
    const log = await WhatsAppMessage.create({
      school: schoolId,
      recipientType,
      recipientId,
      recipientModel,
      recipientName,
      phoneNumber: formattedPhone,
      messageType,
      targetScope,
      class: classId,
      section: sectionId,
      title,
      content,
      status,
      gateway,
      gatewayResponseId,
      sentBy,
      metadata,
      errorMessage,
    });

    return {
      success: status !== "failed",
      logId: log._id,
      status,
      gateway,
      phoneNumber: formattedPhone,
      directUrl: this.getDirectChatUrl(formattedPhone, content),
    };
  }

  /**
   * Find today's birthdays for students and faculty
   */
  static async getTodayBirthdays(schoolId) {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // 1. Students whose DOB matches today (MM and DD)
    const students = await Student.find({
      school: schoolId,
      status: "active",
      $expr: {
        $and: [
          { $eq: [{ $month: "$dateOfBirth" }, currentMonth] },
          { $eq: [{ $dayOfMonth: "$dateOfBirth" }, currentDay] },
        ],
      },
    })
      .populate("class", "name")
      .populate("section", "name")
      .select("firstName lastName admissionNumber dateOfBirth phone guardian class section gender")
      .lean();

    // 2. Teachers whose DOB matches today
    const teachers = await Teacher.find({
      school: schoolId,
      $expr: {
        $and: [
          { $eq: [{ $month: "$dateOfBirth" }, currentMonth] },
          { $eq: [{ $dayOfMonth: "$dateOfBirth" }, currentDay] },
        ],
      },
    })
      .select("firstName lastName employeeId dateOfBirth phone email qualification")
      .lean();

    // 3. Check if birthday messages were already sent today
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const sentToday = await WhatsAppMessage.find({
      school: schoolId,
      messageType: "birthday",
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    })
      .select("recipientId phoneNumber")
      .lean();

    const sentIds = new Set(sentToday.map((m) => String(m.recipientId)));

    const studentsWithStatus = students.map((s) => ({
      ...s,
      type: "student",
      phone: s.guardian?.phone || s.phone || "",
      guardianName: s.guardian?.name || s.guardian?.guardianName || s.guardian?.fatherName || "Parent",
      alreadySent: sentIds.has(String(s._id)),
    }));

    const teachersWithStatus = teachers.map((t) => ({
      ...t,
      type: "teacher",
      phone: t.phone || "",
      alreadySent: sentIds.has(String(t._id)),
    }));

    return {
      todayDate: today.toISOString().split("T")[0],
      totalBirthdays: studentsWithStatus.length + teachersWithStatus.length,
      students: studentsWithStatus,
      teachers: teachersWithStatus,
    };
  }

  /**
   * Dispatch automated or manual birthday wishes to today's celebrants
   */
  static async dispatchBirthdayWishes(schoolId, user, customTemplate = null) {
    const school = await School.findById(schoolId).select("name").lean();
    const schoolName = school?.name || "Our School";
    const birthdays = await this.getTodayBirthdays(schoolId);

    const defaultStudentTemplate =
      customTemplate ||
      "🎂 *Happy Birthday, {name}!* 🎉\n\nWishing you a joyous birthday filled with happiness, learning, and success. May all your dreams come true!\n\nWarmest wishes,\n*{school_name}* 🏫";

    const defaultStaffTemplate =
      customTemplate ||
      "🎂 *Warm Birthday Greetings, {name}!* 🎉\n\nThank you for your valuable dedication and commitment to education. May this year bring you good health, prosperity, and joy.\n\nWarm regards,\n*{school_name}* 🏫";

    const results = [];

    // Send to students
    for (const s of birthdays.students) {
      if (s.alreadySent) continue;
      const phone = s.phone;
      if (!phone) continue;

      const studentFullName = `${s.firstName} ${s.lastName || ""}`.trim();
      const messageContent = defaultStudentTemplate
        .replace(/{name}/g, studentFullName)
        .replace(/{school_name}/g, schoolName);

      try {
        const res = await this.sendWhatsAppDirect({
          schoolId,
          recipientType: "student",
          recipientId: s._id,
          recipientModel: "Student",
          recipientName: studentFullName,
          phoneNumber: phone,
          messageType: "birthday",
          targetScope: "individual",
          classId: s.class?._id || null,
          sectionId: s.section?._id || null,
          title: `Happy Birthday ${studentFullName}`,
          content: messageContent,
          sentBy: user._id,
          metadata: {
            dateOfBirth: s.dateOfBirth,
            admissionNumber: s.admissionNumber,
            guardianName: s.guardianName,
          },
        });
        results.push({ name: studentFullName, type: "student", success: true, ...res });
      } catch (err) {
        results.push({ name: studentFullName, type: "student", success: false, error: err.message });
      }
    }

    // Send to teachers
    for (const t of birthdays.teachers) {
      if (t.alreadySent) continue;
      const phone = t.phone;
      if (!phone) continue;

      const teacherFullName = `${t.firstName} ${t.lastName || ""}`.trim();
      const messageContent = defaultStaffTemplate
        .replace(/{name}/g, teacherFullName)
        .replace(/{school_name}/g, schoolName);

      try {
        const res = await this.sendWhatsAppDirect({
          schoolId,
          recipientType: "teacher",
          recipientId: t._id,
          recipientModel: "Teacher",
          recipientName: teacherFullName,
          phoneNumber: phone,
          messageType: "birthday",
          targetScope: "individual",
          title: `Happy Birthday ${teacherFullName}`,
          content: messageContent,
          sentBy: user._id,
          metadata: { employeeId: t.employeeId },
        });
        results.push({ name: teacherFullName, type: "teacher", success: true, ...res });
      } catch (err) {
        results.push({ name: teacherFullName, type: "teacher", success: false, error: err.message });
      }
    }

    return {
      totalDispatched: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      details: results,
    };
  }

  /**
   * Send WhatsApp fee slip / receipt after payment is collected
   */
  static async sendFeeReceipt({ schoolId, paymentId, user }) {
    const payment = await FeePayment.findById(paymentId)
      .populate("student")
      .populate("studentFee")
      .populate("school", "name phone email")
      .lean();

    if (!payment) throw new Error("Fee payment not found");

    const student = payment.student;
    const school = payment.school;
    const studentFee = payment.studentFee;

    const studentName = `${student.firstName} ${student.lastName || ""}`.trim();
    const schoolName = school?.name || "School Administration";
    const guardianName =
      student.guardian?.name ||
      student.guardian?.guardianName ||
      student.guardian?.fatherName ||
      "Parent/Guardian";

    const phone = student.guardian?.phone || student.phone;
    if (!phone) {
      console.warn(`No phone number available for student ${student.admissionNumber}`);
      return { success: false, message: "No phone number available for student/guardian" };
    }

    const paymentDateStr = new Date(payment.paymentDate || payment.createdAt).toLocaleDateString(
      "en-IN",
      { day: "numeric", month: "short", year: "numeric" }
    );

    const content =
      `🧾 *FEE PAYMENT RECEIPT* - ${schoolName}\n` +
      `----------------------------------------\n` +
      `Dear ${guardianName},\n\n` +
      `We have successfully received the fee payment for:\n` +
      `• *Student:* ${studentName}\n` +
      `• *Admission No:* ${student.admissionNumber}\n` +
      `• *Receipt No:* ${payment.receiptNumber}\n` +
      `• *Amount Paid:* ₹${Number(payment.amount).toLocaleString("en-IN")}\n` +
      `• *Payment Method:* ${String(payment.paymentMethod).toUpperCase()}\n` +
      `• *Payment Date:* ${paymentDateStr}\n` +
      (payment.transactionId ? `• *Txn ID:* ${payment.transactionId}\n` : "") +
      `• *Remaining Balance:* ₹${Number(studentFee?.dueAmount ?? 0).toLocaleString("en-IN")}\n` +
      `----------------------------------------\n` +
      `Thank you for your prompt payment!\n` +
      `*${schoolName} Accounts Office*`;

    return await this.sendWhatsAppDirect({
      schoolId,
      recipientType: "parent",
      recipientId: student._id,
      recipientModel: "Student",
      recipientName: `${studentName} (${guardianName})`,
      phoneNumber: phone,
      messageType: "fee_receipt",
      targetScope: "individual",
      classId: student.class || null,
      sectionId: student.section || null,
      title: `Fee Receipt ${payment.receiptNumber}`,
      content,
      sentBy: user._id,
      metadata: {
        receiptNumber: payment.receiptNumber,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        studentId: student._id,
        admissionNumber: student.admissionNumber,
      },
    });
  }

  /**
   * Send bulk fee reminders for students with outstanding dues
   */
  static async sendFeeReminders({
    schoolId,
    classId = null,
    sectionId = null,
    minDueAmount = 1,
    customNote = "",
    user,
  }) {
    const school = await School.findById(schoolId).select("name").lean();
    const schoolName = school?.name || "School Administration";

    const query = {
      school: schoolId,
      status: { $in: ["pending", "partial", "overdue"] },
      dueAmount: { $gte: Number(minDueAmount) },
    };

    if (classId || sectionId) {
      const studentFilter = { school: schoolId };
      if (classId) studentFilter.class = classId;
      if (sectionId) studentFilter.section = sectionId;
      const classStudents = await Student.find(studentFilter).select("_id");
      query.student = { $in: classStudents.map((s) => s._id) };
    }

    const fees = await StudentFee.find(query)
      .populate({
        path: "student",
        select: "firstName lastName admissionNumber phone guardian class section",
        populate: [
          { path: "class", select: "name" },
          { path: "section", select: "name" },
        ],
      })
      .populate("academicYear", "name")
      .lean();

    const results = [];

    for (const f of fees) {
      const student = f.student;
      if (!student) continue;

      const phone = student.guardian?.phone || student.phone;
      if (!phone) continue;

      const studentName = `${student.firstName} ${student.lastName || ""}`.trim();
      const guardianName =
        student.guardian?.name ||
        student.guardian?.guardianName ||
        student.guardian?.fatherName ||
        "Parent";
      const className = student.class?.name
        ? `${student.class.name} ${student.section?.name || ""}`.trim()
        : "Assigned Class";

      const dueDateStr = f.dueDate
        ? new Date(f.dueDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Immediate";

      const content =
        `📢 *FEE PAYMENT REMINDER* - ${schoolName}\n` +
        `----------------------------------------\n` +
        `Dear ${guardianName},\n\n` +
        `This is a gentle reminder regarding the pending fee for your ward:\n` +
        `• *Student:* ${studentName}\n` +
        `• *Admission No:* ${student.admissionNumber}\n` +
        `• *Class:* ${className}\n` +
        `• *Total Payable:* ₹${Number(f.payableAmount).toLocaleString("en-IN")}\n` +
        `• *Amount Paid:* ₹${Number(f.paidAmount).toLocaleString("en-IN")}\n` +
        `• *Outstanding Due:* ₹${Number(f.dueAmount).toLocaleString("en-IN")}\n` +
        `• *Due Date:* ${dueDateStr}\n` +
        (customNote ? `\n*Note:* ${customNote}\n` : "") +
        `----------------------------------------\n` +
        `Kindly clear the pending dues to avoid late fees. For queries, visit the Accounts Department.\n` +
        `*${schoolName}*`;

      try {
        const res = await this.sendWhatsAppDirect({
          schoolId,
          recipientType: "parent",
          recipientId: student._id,
          recipientModel: "Student",
          recipientName: `${studentName} (${guardianName})`,
          phoneNumber: phone,
          messageType: "fee_reminder",
          targetScope: "individual",
          classId: student.class?._id || null,
          sectionId: student.section?._id || null,
          title: `Fee Due Reminder: ₹${f.dueAmount}`,
          content,
          sentBy: user._id,
          metadata: {
            studentFeeId: f._id,
            dueAmount: f.dueAmount,
            admissionNumber: student.admissionNumber,
          },
        });
        results.push({ studentName, dueAmount: f.dueAmount, success: true, ...res });
      } catch (err) {
        results.push({ studentName, dueAmount: f.dueAmount, success: false, error: err.message });
      }
    }

    return {
      totalTargeted: fees.length,
      sentCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      details: results,
    };
  }

  /**
   * Broadcast WhatsApp message to single person, full class, full school, or full staff
   */
  static async broadcastMessage({
    schoolId,
    targetScope, // 'individual' | 'class' | 'school' | 'staff'
    classId = null,
    sectionId = null,
    recipientType = "general",
    recipientId = null,
    recipientName = "",
    phoneNumber = "",
    messageType = "custom",
    title = "",
    content,
    user,
  }) {
    const school = await School.findById(schoolId).select("name").lean();
    const schoolName = school?.name || "School Administration";

    // 1. INDIVIDUAL RECIPIENT
    if (targetScope === "individual") {
      if (!phoneNumber) throw new Error("Recipient phone number is required");
      const personalizedContent = content
        .replace(/{name}/g, recipientName || "Student / Parent")
        .replace(/{school_name}/g, schoolName);

      return await this.sendWhatsAppDirect({
        schoolId,
        recipientType,
        recipientId,
        recipientName: recipientName || "Direct Recipient",
        phoneNumber,
        messageType,
        targetScope: "individual",
        classId,
        sectionId,
        title,
        content: personalizedContent,
        sentBy: user._id,
      });
    }

    // 2. FULL CLASS & SECTION
    if (targetScope === "class") {
      if (!classId) throw new Error("Class is required for class broadcast");

      const studentQuery = { school: schoolId, class: classId, status: "active" };
      if (sectionId) studentQuery.section = sectionId;

      const students = await Student.find(studentQuery)
        .populate("class", "name")
        .select("firstName lastName admissionNumber phone guardian class section")
        .lean();

      let sentCount = 0;
      let failedCount = 0;

      for (const s of students) {
        const phone = s.guardian?.phone || s.phone;
        if (!phone) continue;

        const studentFullName = `${s.firstName} ${s.lastName || ""}`.trim();
        const guardianName =
          s.guardian?.name ||
          s.guardian?.guardianName ||
          s.guardian?.fatherName ||
          "Parent";

        const personalizedContent = content
          .replace(/{name}/g, studentFullName)
          .replace(/{parent_name}/g, guardianName)
          .replace(/{class_name}/g, s.class?.name || "Class")
          .replace(/{school_name}/g, schoolName);

        try {
          await this.sendWhatsAppDirect({
            schoolId,
            recipientType: "parent",
            recipientId: s._id,
            recipientModel: "Student",
            recipientName: `${studentFullName} (${guardianName})`,
            phoneNumber: phone,
            messageType,
            targetScope: "class",
            classId,
            sectionId: s.section || sectionId,
            title,
            content: personalizedContent,
            sentBy: user._id,
          });
          sentCount++;
        } catch {
          failedCount++;
        }
      }

      return { totalTargeted: students.length, sentCount, failedCount };
    }

    // 3. FULL SCHOOL (ALL STUDENTS & PARENTS)
    if (targetScope === "school") {
      const students = await Student.find({ school: schoolId, status: "active" })
        .populate("class", "name")
        .select("firstName lastName admissionNumber phone guardian class")
        .lean();

      let sentCount = 0;
      let failedCount = 0;

      for (const s of students) {
        const phone = s.guardian?.phone || s.phone;
        if (!phone) continue;

        const studentFullName = `${s.firstName} ${s.lastName || ""}`.trim();
        const guardianName =
          s.guardian?.name ||
          s.guardian?.guardianName ||
          s.guardian?.fatherName ||
          "Parent";

        const personalizedContent = content
          .replace(/{name}/g, studentFullName)
          .replace(/{parent_name}/g, guardianName)
          .replace(/{class_name}/g, s.class?.name || "Class")
          .replace(/{school_name}/g, schoolName);

        try {
          await this.sendWhatsAppDirect({
            schoolId,
            recipientType: "parent",
            recipientId: s._id,
            recipientModel: "Student",
            recipientName: `${studentFullName} (${guardianName})`,
            phoneNumber: phone,
            messageType,
            targetScope: "school",
            classId: s.class?._id || null,
            title,
            content: personalizedContent,
            sentBy: user._id,
          });
          sentCount++;
        } catch {
          failedCount++;
        }
      }

      return { totalTargeted: students.length, sentCount, failedCount };
    }

    // 4. FULL STAFF (ALL TEACHERS & NON-TEACHING STAFF)
    if (targetScope === "staff") {
      const teachers = await Teacher.find({ school: schoolId })
        .select("firstName lastName phone employeeId")
        .lean();

      const users = await User.find({
        school: schoolId,
        role: { $in: ["admin", "accountant", "principal", "chairman"] },
      })
        .select("name email phone")
        .lean();

      let sentCount = 0;
      let failedCount = 0;

      // Teachers
      for (const t of teachers) {
        if (!t.phone) continue;
        const staffName = `${t.firstName} ${t.lastName || ""}`.trim();
        const personalizedContent = content
          .replace(/{name}/g, staffName)
          .replace(/{school_name}/g, schoolName);

        try {
          await this.sendWhatsAppDirect({
            schoolId,
            recipientType: "teacher",
            recipientId: t._id,
            recipientModel: "Teacher",
            recipientName: staffName,
            phoneNumber: t.phone,
            messageType,
            targetScope: "staff",
            title,
            content: personalizedContent,
            sentBy: user._id,
          });
          sentCount++;
        } catch {
          failedCount++;
        }
      }

      // Administrative Staff
      for (const u of users) {
        if (!u.phone) continue;
        const personalizedContent = content
          .replace(/{name}/g, u.name)
          .replace(/{school_name}/g, schoolName);

        try {
          await this.sendWhatsAppDirect({
            schoolId,
            recipientType: "staff",
            recipientId: u._id,
            recipientModel: "User",
            recipientName: u.name,
            phoneNumber: u.phone,
            messageType,
            targetScope: "staff",
            title,
            content: personalizedContent,
            sentBy: user._id,
          });
          sentCount++;
        } catch {
          failedCount++;
        }
      }

      return { totalTargeted: teachers.length + users.length, sentCount, failedCount };
    }

    throw new Error(`Unsupported target scope: ${targetScope}`);
  }
}

module.exports = WhatsAppService;

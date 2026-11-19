const Permission = require("../models/Permission");

const permissions = [
  // Student
  {
    name: "student:create",
    module: "student",
    action: "create",
    description: "Create student",
  },
  {
    name: "student:view",
    module: "student",
    action: "view",
    description: "View students",
  },
  {
    name: "student:update",
    module: "student",
    action: "update",
    description: "Update student",
  },
  {
    name: "student:delete",
    module: "student",
    action: "delete",
    description: "Delete student",
  },

  // Teacher
  {
    name: "teacher:create",
    module: "teacher",
    action: "create",
    description: "Create teacher",
  },
  {
    name: "teacher:view",
    module: "teacher",
    action: "view",
    description: "View teachers",
  },
  {
    name: "teacher:update",
    module: "teacher",
    action: "update",
    description: "Update teacher",
  },
  {
    name: "teacher:delete",
    module: "teacher",
    action: "delete",
    description: "Delete teacher",
  },

  // Attendance
  {
    name: "attendance:view",
    module: "attendance",
    action: "view",
    description: "View attendance",
  },
  {
    name: "attendance:mark",
    module: "attendance",
    action: "mark",
    description: "Mark attendance",
  },
  {
    name: "attendance:update",
    module: "attendance",
    action: "update",
    description: "Update attendance",
  },

  // Exams
  {
    name: "exam:create",
    module: "exam",
    action: "create",
    description: "Create exam",
  },
  {
    name: "exam:view",
    module: "exam",
    action: "view",
    description: "View exams",
  },
  {
    name: "exam:update",
    module: "exam",
    action: "update",
    description: "Update exam",
  },

  // Results
  {
    name: "result:view",
    module: "result",
    action: "view",
    description: "View results",
  },
  {
    name: "result:publish",
    module: "result",
    action: "publish",
    description: "Publish results",
  },

  // Fees
  {
    name: "fee:view",
    module: "fee",
    action: "view",
    description: "View fees",
  },
  {
    name: "fee:collect",
    module: "fee",
    action: "collect",
    description: "Collect fees",
  },
  {
    name: "fee:refund",
    module: "fee",
    action: "refund",
    description: "Refund fees",
  },

  // Staff
  {
    name: "staff:create",
    module: "staff",
    action: "create",
    description: "Create staff",
  },
  {
    name: "staff:view",
    module: "staff",
    action: "view",
    description: "View staff",
  },
  {
    name: "staff:update",
    module: "staff",
    action: "update",
    description: "Update staff",
  },

  { name: "staff:delete", module: "staff", action: "delete", description: "Delete staff" },

  // School
  {
    name: "school:view",
    module: "school",
    action: "view",
    description: "View school",
  },
  {
    name: "school:update",
    module: "school",
    action: "update",
    description: "Update school",
  },

  // Reports
  {
    name: "report:view",
    module: "report",
    action: "view",
    description: "View reports",
  },
  {
  name: "academicYear:create",
  module: "academicYear",
  action: "create",
  description: "Create academic year",
},
{
  name: "academicYear:view",
  module: "academicYear",
  action: "view",
  description: "View academic years",
},
{
  name: "academicYear:update",
  module: "academicYear",
  action: "update",
  description: "Update academic year",
},
{
  name: "academicYear:delete",
  module: "academicYear",
  action: "delete",
  description: "Delete academic year",
},
{
  name: "class:create",
  module: "class",
  action: "create",
  description: "Create class",
},
{
  name: "class:view",
  module: "class",
  action: "view",
  description: "View classes",
},
{
  name: "class:update",
  module: "class",
  action: "update",
  description: "Update class",
},
{
  name: "class:delete",
  module: "class",
  action: "delete",
  description: "Delete class",
},
{
  name: "section:create",
  module: "section",
  action: "create",
  description: "Create section",
},
{
  name: "section:view",
  module: "section",
  action: "view",
  description: "View sections",
},
{
  name: "section:update",
  module: "section",
  action: "update",
  description: "Update section",
},
{
  name: "section:delete",
  module: "section",
  action: "delete",
  description: "Delete section",
},
{
  name: "subject:create",
  module: "subject",
  action: "create",
  description: "Create subject",
},
{
  name: "subject:view",
  module: "subject",
  action: "view",
  description: "View subjects",
},
{
  name: "subject:update",
  module: "subject",
  action: "update",
  description: "Update subject",
},
{
  name: "subject:delete",
  module: "subject",
  action: "delete",
  description: "Delete subject",
},
{
  name: "classSubject:create",
  module: "classSubject",
  action: "create",
  description: "Assign subject to class",
},
{
  name: "classSubject:view",
  module: "classSubject",
  action: "view",
  description: "View class subjects",
},
{
  name: "classSubject:update",
  module: "classSubject",
  action: "update",
  description: "Update class subject",
},
{
  name: "classSubject:delete",
  module: "classSubject",
  action: "delete",
  description: "Remove subject from class",
},
{
  name: "teacher:create",
  module: "teacher",
  action: "create",
  description: "Create teacher",
},
{
  name: "teacher:view",
  module: "teacher",
  action: "view",
  description: "View teachers",
},
{
  name: "teacher:update",
  module: "teacher",
  action: "update",
  description: "Update teacher",
},
{
  name: "teacher:delete",
  module: "teacher",
  action: "delete",
  description: "Delete teacher",
},
{
  name: "teacherAssignment:create",
  module: "teacherAssignment",
  action: "create",
  description: "Assign teacher",
},
{
  name: "teacherAssignment:view",
  module: "teacherAssignment",
  action: "view",
  description: "View teacher assignments",
},
{
  name: "teacherAssignment:update",
  module: "teacherAssignment",
  action: "update",
  description: "Update teacher assignment",
},
{
  name: "teacherAssignment:delete",
  module: "teacherAssignment",
  action: "delete",
  description: "Remove teacher assignment",
},
{
  name: "student:create",
  module: "student",
  action: "create",
  description: "Create student",
},
{
  name: "student:view",
  module: "student",
  action: "view",
  description: "View students",
},
{
  name: "student:update",
  module: "student",
  action: "update",
  description: "Update student",
},
{
  name: "student:delete",
  module: "student",
  action: "delete",
  description: "Delete student",
},
{
  name: "parent:create",
  module: "parent",
  action: "create",
  description: "Create parent account",
},
{
  name: "parent:view",
  module: "parent",
  action: "view",
  description: "View parents",
},
{
  name: "parent:update",
  module: "parent",
  action: "update",
  description: "Update parent",
},
{
  name: "parent:delete",
  module: "parent",
  action: "delete",
  description: "Delete parent",
},
{
  name: "attendance:create",
  module: "attendance",
  action: "create",
  description: "Mark attendance",
},
{
  name: "attendance:view",
  module: "attendance",
  action: "view",
  description: "View attendance",
},
{
  name: "attendance:update",
  module: "attendance",
  action: "update",
  description: "Update attendance",
},
{
  name: "attendance:delete",
  module: "attendance",
  action: "delete",
  description: "Delete attendance",
},
{
  name: "feeStructure:create",
  module: "feeStructure",
  action: "create",
  description: "Create fee structure",
},
{
  name: "feeStructure:view",
  module: "feeStructure",
  action: "view",
  description: "View fee structure",
},
{
  name: "feeStructure:delete",
  module: "feeStructure",
  action: "delete",
  description: "Delete fee structure",
},
{
  name: "feeStructure:update",
  module: "feeStructure",
  action: "update",
  description: "Update fee structure",
},
{
  name: "feePayment:create",
  module: "feePayment",
  action: "create",
  description: "Collect fee payment",
},
{
  name: "feePayment:view",
  module: "feePayment",
  action: "view",
  description: "View fee payments",
},
{
  name: "feePayment:create",
  module: "feePayment",
  action: "create",
  description: "Collect fee payment",
},
{
  name: "feePayment:view",
  module: "feePayment",
  action: "view",
  description: "View fee payments",
},
{
  name: "exam:create",
  module: "exam",
  action: "create",
  description: "Create exam",
},
{
  name: "exam:view",
  module: "exam",
  action: "view",
  description: "View exams",
},
{
  name: "exam:update",
  module: "exam",
  action: "update",
  description: "Update exam",
},
{
  name: "exam:delete",
  module: "exam",
  action: "delete",
  description: "Delete exam",
},
{
  name: "result:create",
  module: "result",
  action: "create",
  description: "Enter student marks",
},
{
  name: "result:view",
  module: "result",
  action: "view",
  description: "View student results",
},
{
  name: "result:update",
  module: "result",
  action: "update",
  description: "Update student marks",
},
{
  name: "timetable:create",
  module: "timetable",
  action: "create",
  description: "Create timetable",
},
{
  name: "timetable:view",
  module: "timetable",
  action: "view",
  description: "View timetable",
},
{
  name: "timetable:update",
  module: "timetable",
  action: "update",
  description: "Update timetable",
},
{
  name: "timetable:delete",
  module: "timetable",
  action: "delete",
  description: "Delete timetable",
},
{
  name: "leave:create",
  module: "leave",
  action: "create",
  description: "Apply for leave",
},
{
  name: "leave:view",
  module: "leave",
  action: "view",
  description: "View leave requests",
},
{
  name: "leave:approve",
  module: "leave",
  action: "approve",
  description: "Approve or reject leave",
},
{
  name: "leave:cancel",
  module: "leave",
  action: "cancel",
  description: "Cancel leave request",
},
{
  name: "notice:create",
  module: "notice",
  action: "create",
  description: "Create school notice",
},
{
  name: "notice:view",
  module: "notice",
  action: "view",
  description: "View school notices",
},
{
  name: "notice:update",
  module: "notice",
  action: "update",
  description: "Update school notice",
},
{
  name: "notice:delete",
  module: "notice",
  action: "delete",
  description: "Delete school notice",
},
{
  name: "notice:publish",
  module: "notice",
  action: "publish",
  description: "Publish or unpublish notice",
},
{
  name: "notice:pin",
  module: "notice",
  action: "pin",
  description: "Pin or unpin notice",
},
{
  name: "notification:view",
  module: "notification",
  action: "view",
  description: "View notifications",
},
{
  name: "notification:update",
  module: "notification",
  action: "update",
  description: "Mark notifications as read",
},
{
  name: "studentFee:create",
  module: "studentFee",
  action: "create",
  description: "Assign fee to student",
},
{
  name: "studentFee:view",
  module: "studentFee",
  action: "view",
  description: "View student fees",
},
{
  name: "studentFee:update",
  module: "studentFee",
  action: "update",
  description: "Update student fee",
},
{
  name: "studentFee:delete",
  module: "studentFee",
  action: "delete",
  description: "Delete student fee",
},
{
  name: "whatsapp:view",
  module: "whatsapp",
  action: "view",
  description: "View WhatsApp communications, templates, and delivery logs",
},
{
  name: "whatsapp:send",
  module: "whatsapp",
  action: "send",
  description: "Send WhatsApp messages, fee slips, reminders, and birthday wishes",
},
{
  name: "whatsapp:broadcast",
  module: "whatsapp",
  action: "broadcast",
  description: "Broadcast WhatsApp messages school-wide or staff-wide",
},
];

const seedPermissions = async () => {
  const uniquePermissions = [...new Map(permissions.map((permission) => [permission.name, permission])).values()];
  for (const permission of uniquePermissions) {
    await Permission.findOneAndUpdate(
      { name: permission.name },
      permission,
      {
        upsert: true,
        new: true,
      }
    );
  }

  console.log("Permissions seeded successfully");
};

module.exports = seedPermissions;
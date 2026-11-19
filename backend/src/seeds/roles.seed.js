const Role = require("../models/Role");
const Permission = require("../models/Permission");

const roles = [
  {
    name: "chairman",
    description: "Full control over the school",
  },
  {
    name: "principal",
    description: "School operational management",
  },
  {
    name: "admin",
    description: "Administrative management",
  },
  {
    name: "teacher",
    description: "Academic and student management",
  },
  {
    name: "accountant",
    description: "Finance and fee management",
  },
  {
    name: "student",
    description: "Student access",
  },
  {
    name: "parent",
    description: "Parent access",
  },
];

const seedRoles = async () => {
  const allPermissions = await Permission.find();

  for (const roleData of roles) {
    let permissions = [];

    switch (roleData.name) {
      case "chairman":
        permissions = allPermissions.map((permission) => permission._id);
        break;

      case "principal":
        permissions = allPermissions
          .filter((permission) => !["fee:refund"].includes(permission.name))
          .map((permission) => permission._id);
        break;

      case "teacher":
        permissions = allPermissions
          .filter((permission) =>
            [
              // Academic context & dependencies (Read-Only)
              "academicYear:view",
              "class:view",
              "section:view",
              "subject:view",
              "classSubject:view",
              "teacherAssignment:view",
              "teacher:view",
              "student:view",

              // Attendance
              "attendance:view",
              "attendance:create",
              "attendance:mark",
              "attendance:update",

              // Exams & Marks
              "exam:view",
              "result:view",
              "result:create",
              "result:update",

              // Timetable
              "timetable:view",

              // Leaves
              "leave:create",
              "leave:view",
              "leave:cancel",

              // Overview & Communications
              "report:view",
              "notice:view",
              "notification:view",
              "notification:update",
              "whatsapp:view",
              "whatsapp:send",
            ].includes(permission.name),
          )
          .map((permission) => permission._id);
        break;

      case "accountant":
        permissions = allPermissions
          .filter((permission) =>
            [
              // Academic & student dependencies (Read-Only)
              "academicYear:view",
              "class:view",
              "section:view",
              "student:view",
              "parent:view",

              // Fee structures, student fees & collections
              "fee:view",
              "fee:collect",
              "fee:refund",
              "feePayment:view",
              "feePayment:create",
              "studentFee:view",
              "studentFee:create",
              "studentFee:update",
              "studentFee:delete",
              "feeStructure:view",
              "feeStructure:create",
              "feeStructure:update",
              "feeStructure:delete",

              // Financial Reports & Communications
              "report:view",
              "notice:view",
              "notification:view",
              "notification:update",
              "whatsapp:view",
              "whatsapp:send",
            ].includes(permission.name),
          )
          .map((permission) => permission._id);
        break;

      case "student":
        permissions = allPermissions
          .filter((permission) =>
            [
              // Academic context (Read-Only)
              "academicYear:view",
              "class:view",
              "section:view",
              "subject:view",

              // Personal records (Read-Only)
              "student:view",
              "attendance:view",
              "exam:view",
              "result:view",
              "timetable:view",

              // Communications
              "notice:view",
              "notification:view",
              "notification:update",
            ].includes(permission.name),
          )
          .map((permission) => permission._id);
        break;

      case "parent":
        permissions = allPermissions
          .filter((permission) =>
            [
              // Academic context (Read-Only)
              "academicYear:view",
              "class:view",
              "section:view",
              "subject:view",

              // Child records & monitoring (Read-Only)
              "parent:view",
              "student:view",
              "attendance:view",
              "exam:view",
              "result:view",
              "timetable:view",
              "studentFee:view",
              "feePayment:view",

              // Communications
              "notice:view",
              "notification:view",
              "notification:update",
            ].includes(permission.name),
          )
          .map((permission) => permission._id);
        break;

      case "admin":
        permissions = allPermissions.map((permission) => permission._id);
        break;
    }

    await Role.findOneAndUpdate(
      { name: roleData.name },
      {
        ...roleData,
        permissions,
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  console.log("Roles seeded successfully");
};

module.exports = seedRoles;

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const School = require("../models/School");
const AcademicYear = require("../models/AcademicYear");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const User = require("../models/User");
const Class = require("../models/Class");
const Section = require("../models/Section");
const Subject = require("../models/Subject");
const ClassSubject = require("../models/ClassSubject");
const Teacher = require("../models/Teacher");
const TeacherAssignment = require("../models/TeacherAssignment");
const Student = require("../models/Student");
const Parent = require("../models/Parent");
const ParentStudent = require("../models/ParentStudent");
const FeeStructure = require("../models/FeeStructure");
const StudentFee = require("../models/StudentFee");
const FeePayment = require("../models/FeePayment");
const Exam = require("../models/Exam");
const ExamSubject = require("../models/ExamSubject");
const StudentResult = require("../models/StudentResult");
const Attendance = require("../models/Attendance");
const Timetable = require("../models/Timetable");
const Notice = require("../models/Notice");
const Leave = require("../models/Leave");

const seedPermissions = require("./permissions.seed");
const seedRoles = require("./roles.seed");

// Names dataset for realistic generation
const FIRST_NAMES_MALE = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
  "Dhruv", "Kabir", "Ritvik", "Rohan", "Atharv", "Pranav", "Aryan", "Advik", "Devansh", "Shaurya",
  "Samarth", "Anay", "Rudra", "Nirvaan", "Shlok", "Ayush", "Tanmay", "Vedant", "Yash", "Kunal",
  "Manish", "Kartik", "Karan", "Siddharth", "Gaurav", "Nikhil", "Akash", "Varun", "Abhishek", "Harsh"
];

const FIRST_NAMES_FEMALE = [
  "Aadhya", "Diya", "Saanvi", "Ananya", "Pari", "Anika", "Navya", "Angel", "Myra", "Sara",
  "Ira", "Riya", "Avni", "Ahana", "Prisha", "Isha", "Tara", "Kiara", "Kavya", "Aarohi",
  "Meera", "Tanvi", "Siya", "Khushi", "Sneha", "Pooja", "Shreya", "Neha", "Divya", "Anjali",
  "Ritu", "Swati", "Nidhi", "Komal", "Simran", "Muskan", "Tanya", "Priyanka", "Shruti", "Akanksha"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Joshi", "Mehta", "Bhatia", "Chopra",
  "Malhotra", "Saxena", "Agarwal", "Reddy", "Nair", "Rao", "Das", "Mukherjee", "Banerjee", "Bose",
  "Choudhury", "Mishra", "Pandey", "Trivedi", "Shukla", "Dubey", "Tiwari", "Yadav", "Chauhan", "Thakur"
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

async function runSeed() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/school_erp";
  console.log("Connecting to MongoDB at:", mongoUri);
  await mongoose.connect(mongoUri);
  console.log("MongoDB Connected!");

  // 1. Seed Roles & Permissions
  console.log("Seeding Permissions & Roles...");
  await seedPermissions();
  await seedRoles();

  const roles = await Role.find();
  const roleMap = {};
  roles.forEach((r) => {
    roleMap[r.name] = r._id;
  });

  // Pre-compute standard password hash
  const DEFAULT_PASSWORD = "Password123!";
  console.log("Generating bcrypt hash for default testing password:", DEFAULT_PASSWORD);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 2. Setup School
  console.log("Setting up School...");
  let school = await School.findOne({ code: "00001" });
  if (!school) {
    school = await School.findOne({ code: "CQST001" });
  }
  if (!school) {
    school = await School.findOne();
  }

  if (school) {
    school.name = "CQST International School";
    school.code = school.code || "CQST001";
    school.email = "admin@cqstschool.com";
    school.phone = "+91 9876543210";
    school.address = "Sector 42, Institutional Area, New Delhi";
    school.currentAcademicYear = "2026-27";
    school.isActive = true;
    await school.save();
  } else {
    school = await School.create({
      name: "CQST International School",
      code: "CQST001",
      email: "admin@cqstschool.com",
      phone: "+91 9876543210",
      address: "Sector 42, Institutional Area, New Delhi",
      currentAcademicYear: "2026-27",
      isActive: true,
    });
  }

  const schoolId = school._id;
  console.log("Active School:", school.name, `[ID: ${schoolId}, Code: ${school.code}]`);

  // 3. Setup Academic Years
  console.log("Configuring Academic Years...");
  let currentYear = await AcademicYear.findOne({ school: schoolId, name: "2026-27" });
  if (!currentYear) {
    currentYear = await AcademicYear.create({
      school: schoolId,
      name: "2026-27",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      isCurrent: true,
      status: "active",
    });
  } else {
    currentYear.isCurrent = true;
    currentYear.status = "active";
    await currentYear.save();
  }

  let prevYear = await AcademicYear.findOne({ school: schoolId, name: "2025-26" });
  if (!prevYear) {
    prevYear = await AcademicYear.create({
      school: schoolId,
      name: "2025-26",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      isCurrent: false,
      status: "completed",
    });
  }

  // 4. Clean previous child data for this school to avoid duplicate keys during seed
  console.log("Cleaning previous records for clean bulk seed...");
  await Promise.all([
    StudentResult.deleteMany({ school: schoolId }),
    ExamSubject.deleteMany({ school: schoolId }),
    Exam.deleteMany({ school: schoolId }),
    Attendance.deleteMany({ school: schoolId }),
    Timetable.deleteMany({ school: schoolId }),
    FeePayment.deleteMany({ school: schoolId }),
    StudentFee.deleteMany({ school: schoolId }),
    FeeStructure.deleteMany({ school: schoolId }),
    ParentStudent.deleteMany({ school: schoolId }),
    TeacherAssignment.deleteMany({ school: schoolId }),
    ClassSubject.deleteMany({ school: schoolId }),
    Section.deleteMany({ school: schoolId }),
    Class.deleteMany({ school: schoolId }),
    Subject.deleteMany({ school: schoolId }),
    Notice.deleteMany({ school: schoolId }),
    Leave.deleteMany({ school: schoolId }),
  ]);

  // Clean students and their user accounts
  const existingStudents = await Student.find({ school: schoolId });
  const studentUserIds = existingStudents.map((s) => s.user).filter(Boolean);
  await Student.deleteMany({ school: schoolId });
  if (studentUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: studentUserIds } });
  }

  // Clean teachers and their user accounts (except if user was Chairman)
  const existingTeachers = await Teacher.find({ school: schoolId });
  const teacherUserIds = existingTeachers.map((t) => t.user).filter(Boolean);
  await Teacher.deleteMany({ school: schoolId });
  if (teacherUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: teacherUserIds }, role: { $ne: roleMap.chairman } });
  }

  // Clean parents and their user accounts
  const existingParents = await Parent.find({ school: schoolId });
  const parentUserIds = existingParents.map((p) => p.user).filter(Boolean);
  await Parent.deleteMany({ school: schoolId });
  if (parentUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: parentUserIds } });
  }

  // Also remove old student and parent users matching pattern
  await User.deleteMany({
    school: schoolId,
    email: { $in: [
      "principal@school.edu",
      "admin@school.edu",
      "admin2@school.edu",
      "accountant@school.edu",
      "teacher@school.edu",
      "student@school.edu",
      "parent@school.edu",
      "chairman@school.edu"
    ] }
  });

  // 5. Create Core Administrative Staff Accounts
  console.log("Creating Core Staff Accounts (Chairman, Principal, Admin, Accountant)...");

  // Chairman
  let chairmanUser = await User.findOne({ school: schoolId, role: roleMap.chairman });
  if (!chairmanUser) {
    chairmanUser = await User.create({
      school: schoolId,
      name: "Dr. Vikram Singhania (Chairman)",
      email: "chairman@school.edu",
      password: passwordHash,
      role: roleMap.chairman,
      phone: "+91 9811000001",
      isActive: true,
    });
  } else {
    chairmanUser.password = passwordHash;
    await chairmanUser.save();
  }

  // Ensure user aayush@gmail.com has password set to Password123!
  const aayushUser = await User.findOne({ email: "aayush@gmail.com" });
  if (aayushUser) {
    aayushUser.password = passwordHash;
    await aayushUser.save();
  }

  // Principal
  const principalUser = await User.create({
    school: schoolId,
    name: "Dr. Shailesh Verma",
    email: "principal@school.edu",
    password: passwordHash,
    role: roleMap.principal,
    phone: "+91 9811001122",
    isActive: true,
  });

  // Admin
  const adminUser = await User.create({
    school: schoolId,
    name: "Rajesh Sharma",
    email: "admin@school.edu",
    password: passwordHash,
    role: roleMap.admin,
    phone: "+91 9811001133",
    isActive: true,
  });

  // Accountant
  const accountantUser = await User.create({
    school: schoolId,
    name: "Alok Bansal",
    email: "accountant@school.edu",
    password: passwordHash,
    role: roleMap.accountant,
    phone: "+91 9811001144",
    isActive: true,
  });

  // 6. Create Classes (Grade 1 to Grade 10)
  console.log("Creating 10 Classes (Grade 1 through Grade 10)...");
  const classDocs = [];
  for (let i = 1; i <= 10; i++) {
    classDocs.push({
      school: schoolId,
      academicYear: currentYear._id,
      name: `Grade ${i}`,
      code: `G${i}`,
      order: i,
      isActive: true,
    });
  }
  const createdClasses = await Class.insertMany(classDocs);

  // 7. Create Sections (A, B, C for each Grade = 30 Sections)
  console.log("Creating 30 Sections (A, B, C for each class)...");
  const sectionDocs = [];
  const sectionNames = ["Section A", "Section B", "Section C"];
  const sectionCodes = ["A", "B", "C"];

  createdClasses.forEach((cls) => {
    sectionNames.forEach((sName, idx) => {
      sectionDocs.push({
        school: schoolId,
        academicYear: currentYear._id,
        class: cls._id,
        name: sName,
        code: `${cls.code}-${sectionCodes[idx]}`,
        capacity: 40,
        roomNumber: `Room ${cls.order}0${idx + 1}`,
        isActive: true,
      });
    });
  });
  const createdSections = await Section.insertMany(sectionDocs);

  // 8. Create Subjects
  console.log("Creating 8 Core Academic Subjects...");
  const subjectList = [
    { name: "Mathematics", code: "MATH", type: "theory", maxMarks: 100, passingMarks: 33 },
    { name: "English Language & Literature", code: "ENG", type: "theory", maxMarks: 100, passingMarks: 33 },
    { name: "Science & Technology", code: "SCI", type: "both", maxMarks: 100, passingMarks: 33 },
    { name: "Social Studies", code: "SST", type: "theory", maxMarks: 100, passingMarks: 33 },
    { name: "Hindi", code: "HIN", type: "theory", maxMarks: 100, passingMarks: 33 },
    { name: "Computer Applications", code: "COMP", type: "both", maxMarks: 100, passingMarks: 33 },
    { name: "Visual Arts", code: "ART", type: "practical", maxMarks: 100, passingMarks: 33 },
    { name: "Physical Education", code: "PE", type: "practical", maxMarks: 100, passingMarks: 33 },
  ];
  const subjectDocs = subjectList.map((s) => ({ ...s, school: schoolId, isActive: true }));
  const createdSubjects = await Subject.insertMany(subjectDocs);

  // 9. Class-Subject mappings (Attach 8 subjects to each of the 10 classes = 80 mappings)
  console.log("Mapping Curriculum (80 Class-Subject links)...");
  const classSubjectDocs = [];
  createdClasses.forEach((cls) => {
    createdSubjects.forEach((sub) => {
      classSubjectDocs.push({
        school: schoolId,
        academicYear: currentYear._id,
        class: cls._id,
        subject: sub._id,
        isCompulsory: true,
        periodsPerWeek: 5,
        maxMarks: sub.maxMarks,
        passingMarks: sub.passingMarks,
        isActive: true,
      });
    });
  });
  await ClassSubject.insertMany(classSubjectDocs);

  // 10. Create 25 Teachers & Faculty
  console.log("Creating 25 Teachers & User Accounts...");
  const teacherDataList = [
    { firstName: "Ananya", lastName: "Sen", email: "teacher@school.edu", empId: "EMP1001", dept: "Science", desig: "Senior PGT Science", qual: "M.Sc., B.Ed." },
    { firstName: "Rakesh", lastName: "Mehta", email: "rakesh.math@school.edu", empId: "EMP1002", dept: "Mathematics", desig: "HOD Mathematics", qual: "M.Sc. Maths, B.Ed." },
    { firstName: "Sunita", lastName: "Kapoor", email: "sunita.eng@school.edu", empId: "EMP1003", dept: "English", desig: "PGT English", qual: "M.A. English, B.Ed." },
    { firstName: "Deepak", lastName: "Mishra", email: "deepak.sst@school.edu", empId: "EMP1004", dept: "Social Studies", desig: "TGT Social Studies", qual: "M.A. History, B.Ed." },
    { firstName: "Pooja", lastName: "Chawla", email: "pooja.comp@school.edu", empId: "EMP1005", dept: "Computer Science", desig: "HOD Computer Science", qual: "MCA, B.Ed." },
    { firstName: "Manoj", lastName: "Tiwari", email: "manoj.hin@school.edu", empId: "EMP1006", dept: "Hindi", desig: "TGT Hindi", qual: "M.A. Hindi, B.Ed." },
    { firstName: "Vandana", lastName: "Joshi", email: "vandana.art@school.edu", empId: "EMP1007", dept: "Arts", desig: "Art Instructor", qual: "MFA" },
    { firstName: "Gurpreet", lastName: "Singh", email: "gurpreet.pe@school.edu", empId: "EMP1008", dept: "Sports", desig: "Physical Director", qual: "M.P.Ed." },
  ];

  for (let i = 9; i <= 25; i++) {
    const fName = FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length];
    const lName = LAST_NAMES[i % LAST_NAMES.length];
    teacherDataList.push({
      firstName: fName,
      lastName: lName,
      email: `faculty${i}@school.edu`,
      empId: `EMP10${i < 10 ? "0" + i : i}`,
      dept: subjectList[(i - 1) % subjectList.length].name,
      desig: "Assistant Teacher",
      qual: "B.Sc., B.Ed.",
    });
  }

  const createdTeachers = [];
  for (const t of teacherDataList) {
    const teacherDoc = await Teacher.create({
      school: schoolId,
      employeeId: t.empId,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: `+91 98110022${createdTeachers.length < 10 ? "0" + createdTeachers.length : createdTeachers.length}`,
      gender: createdTeachers.length % 2 === 0 ? "female" : "male",
      qualification: t.qual,
      department: t.dept,
      designation: t.desig,
      joiningDate: new Date("2024-06-15"),
      isActive: true,
    });

    const userDoc = await User.create({
      school: schoolId,
      name: `${t.firstName} ${t.lastName}`,
      email: t.email,
      password: passwordHash,
      role: roleMap.teacher,
      phone: teacherDoc.phone,
      teacher: teacherDoc._id,
      isActive: true,
    });

    teacherDoc.user = userDoc._id;
    await teacherDoc.save();
    createdTeachers.push(teacherDoc);
  }

  // 11. Teacher Assignments (Assign class teachers & subject teachers)
  console.log("Allocating Teachers to Classes & Sections...");
  const assignmentDocs = [];
  createdSections.forEach((sec, idx) => {
    const classTeacher = createdTeachers[idx % createdTeachers.length];
    assignmentDocs.push({
      school: schoolId,
      academicYear: currentYear._id,
      teacher: classTeacher._id,
      class: sec.class,
      section: sec._id,
      subject: createdSubjects[0]._id, // Math
      isClassTeacher: true,
      isActive: true,
    });

    // Also assign a science teacher
    const sciTeacher = createdTeachers[(idx + 1) % createdTeachers.length];
    assignmentDocs.push({
      school: schoolId,
      academicYear: currentYear._id,
      teacher: sciTeacher._id,
      class: sec.class,
      section: sec._id,
      subject: createdSubjects[2]._id, // Science
      isClassTeacher: false,
      isActive: true,
    });
  });
  await TeacherAssignment.insertMany(assignmentDocs);

  // 12. Create 1,050 Students + User Accounts
  console.log("Generating 1,050 Students across 30 Sections (35 students per section)...");
  const studentInsertList = [];
  const userInsertList = [];

  let studentSeq = 1;
  const grade10 = createdClasses.find((c) => c.order === 10);
  const grade10SecA = createdSections.find(
    (s) => s.class.toString() === grade10._id.toString() && s.name === "Section A"
  );

  createdSections.forEach((sec) => {
    for (let r = 1; r <= 35; r++) {
      const isLeadTestStudent = sec._id.toString() === grade10SecA._id.toString() && r === 1;
      const isMale = r % 2 === 1;
      const firstName = isLeadTestStudent
        ? "Aarav"
        : isMale
        ? FIRST_NAMES_MALE[(studentSeq + r) % FIRST_NAMES_MALE.length]
        : FIRST_NAMES_FEMALE[(studentSeq + r) % FIRST_NAMES_FEMALE.length];
      const lastName = isLeadTestStudent ? "Sharma" : LAST_NAMES[(studentSeq + r) % LAST_NAMES.length];
      const padNum = String(studentSeq).padStart(4, "0");
      const admNo = `GIS-2026-${padNum}`;
      const email = isLeadTestStudent ? "student@school.edu" : `stu${padNum}@student.local`;

      const studentId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      studentInsertList.push({
        _id: studentId,
        school: schoolId,
        user: userId,
        admissionNumber: admNo,
        firstName,
        lastName,
        gender: isMale ? "male" : "female",
        dateOfBirth: new Date(2010 + Math.floor(studentSeq / 150), (studentSeq % 12), (r % 28) + 1),
        phone: `+91 98700${String(studentSeq).padStart(5, "0")}`,
        email,
        address: `${r * 12}, Block ${String.fromCharCode(65 + (r % 6))}, Green Park, New Delhi`,
        bloodGroup: BLOOD_GROUPS[r % BLOOD_GROUPS.length],
        academicYear: currentYear._id,
        class: sec.class,
        section: sec._id,
        rollNumber: r,
        guardian: {
          fatherName: `Rajesh ${lastName}`,
          motherName: `Sunita ${lastName}`,
          relation: "father",
          phone: `+91 98111${String(studentSeq).padStart(5, "0")}`,
          email: `guardian.${padNum}@gmail.com`,
          address: "New Delhi",
        },
        admissionDate: new Date("2024-04-05"),
        status: "active",
      });

      userInsertList.push({
        _id: userId,
        school: schoolId,
        name: `${firstName} ${lastName}`,
        email,
        password: passwordHash,
        role: roleMap.student,
        phone: `+91 98700${String(studentSeq).padStart(5, "0")}`,
        student: studentId,
        isActive: true,
      });

      studentSeq++;
    }
  });

  console.log(`Inserting ${userInsertList.length} User accounts for students...`);
  await User.insertMany(userInsertList);

  console.log(`Inserting ${studentInsertList.length} Student records...`);
  const createdStudents = await Student.insertMany(studentInsertList);

  const testStudent = createdStudents.find((s) => s.admissionNumber === "GIS-2026-0001");
  console.log("Primary Test Student Created:", testStudent.firstName, testStudent.lastName, testStudent.admissionNumber);

  // 13. Create Parents (including Lead Test Parent)
  console.log("Creating 300+ Parent Accounts and linking to students...");
  const leadParentId = new mongoose.Types.ObjectId();
  const leadParentUserId = new mongoose.Types.ObjectId();

  const leadParentUser = {
    _id: leadParentUserId,
    school: schoolId,
    name: "Ramesh Sharma",
    email: "parent@school.edu",
    password: passwordHash,
    role: roleMap.parent,
    phone: "+91 9811223344",
    parent: leadParentId,
    isActive: true,
  };

  const leadParentDoc = {
    _id: leadParentId,
    school: schoolId,
    user: leadParentUserId,
    parentId: "PAR1001",
    firstName: "Ramesh",
    lastName: "Sharma",
    phone: "+91 9811223344",
    email: "parent@school.edu",
    password: passwordHash,
    relation: "father",
    isActive: true,
  };

  const parentUserList = [leadParentUser];
  const parentProfileList = [leadParentDoc];
  const parentStudentList = [
    {
      school: schoolId,
      parent: leadParentId,
      student: testStudent._id,
      relation: "father",
      isPrimary: true,
    },
    // Also link second child GIS-2026-0002
    {
      school: schoolId,
      parent: leadParentId,
      student: createdStudents[1]._id,
      relation: "father",
      isPrimary: false,
    },
  ];

  for (let p = 2; p <= 300; p++) {
    const pId = new mongoose.Types.ObjectId();
    const uId = new mongoose.Types.ObjectId();
    const lName = LAST_NAMES[p % LAST_NAMES.length];
    const fName = FIRST_NAMES_MALE[p % FIRST_NAMES_MALE.length];
    const pad = String(p).padStart(4, "0");

    parentUserList.push({
      _id: uId,
      school: schoolId,
      name: `${fName} ${lName}`,
      email: `parent${pad}@family.local`,
      password: passwordHash,
      role: roleMap.parent,
      phone: `+91 98990${pad}`,
      parent: pId,
      isActive: true,
    });

    parentProfileList.push({
      _id: pId,
      school: schoolId,
      user: uId,
      parentId: `PAR${pad}`,
      firstName: fName,
      lastName: lName,
      phone: `+91 98990${pad}`,
      email: `parent${pad}@family.local`,
      password: passwordHash,
      relation: "father",
      isActive: true,
    });

    // Link each parent to student p
    parentStudentList.push({
      school: schoolId,
      parent: pId,
      student: createdStudents[p]._id,
      relation: "father",
      isPrimary: true,
    });
  }

  await User.insertMany(parentUserList);
  await Parent.insertMany(parentProfileList);
  await ParentStudent.insertMany(parentStudentList);

  // 14. Fee Structures
  console.log("Setting up Fee Structures for Primary, Middle & High School...");
  const feeStructureDocs = [
    {
      school: schoolId,
      academicYear: currentYear._id,
      class: createdClasses[0]._id, // Grade 1
      name: "Primary Annual Fee Structure (Grades 1-5)",
      description: "Tuition, activity, computer and development composite fee",
      components: [
        { name: "Tuition Fee", amount: 35000, frequency: "yearly" },
        { name: "Computer & Robotics Lab", amount: 5000, frequency: "yearly" },
        { name: "Sports & Co-curricular", amount: 5000, frequency: "yearly" },
      ],
      isActive: true,
    },
    {
      school: schoolId,
      academicYear: currentYear._id,
      class: createdClasses[5]._id, // Grade 6
      name: "Middle School Annual Fee Structure (Grades 6-8)",
      description: "Tuition, composite science lab & library fee",
      components: [
        { name: "Tuition Fee", amount: 42000, frequency: "yearly" },
        { name: "Science & Math Lab Fee", amount: 7000, frequency: "yearly" },
        { name: "Library & Sports Fee", amount: 6000, frequency: "yearly" },
      ],
      isActive: true,
    },
    {
      school: schoolId,
      academicYear: currentYear._id,
      class: grade10._id, // Grade 10
      name: "Secondary High School Annual Fee (Grades 9-10)",
      description: "CBSE curriculum tuition, science laboratories, examination and development fee",
      components: [
        { name: "Tuition Fee", amount: 48000, frequency: "yearly" },
        { name: "Physics, Chem, Bio Labs", amount: 9000, frequency: "yearly" },
        { name: "Exam Board & Assessment Fee", amount: 8000, frequency: "yearly" },
      ],
      isActive: true,
    },
  ];
  const createdFeeStructures = await FeeStructure.insertMany(feeStructureDocs);

  // 15. Student Fee Records & Fee Payments
  console.log("Generating Student Invoices & Payment Ledger...");
  const studentFeeDocs = [];
  const feePaymentDocs = [];

  createdStudents.forEach((stu, idx) => {
    const feeStruct =
      idx < 525
        ? createdFeeStructures[0] // Primary
        : idx < 840
        ? createdFeeStructures[1] // Middle
        : createdFeeStructures[2]; // High

    const totalAmt = feeStruct.components.reduce((acc, c) => acc + c.amount, 0);
    const isTestStudent = stu.admissionNumber === "GIS-2026-0001";

    let paidAmt = 0;
    let dueAmt = totalAmt;
    let status = "pending";

    if (isTestStudent) {
      // Test student has paid partially: ₹45,000 paid, ₹20,000 due
      paidAmt = 45000;
      dueAmt = totalAmt - paidAmt;
      status = "partial";
    } else if (idx % 3 === 0) {
      paidAmt = totalAmt;
      dueAmt = 0;
      status = "paid";
    } else if (idx % 3 === 1) {
      paidAmt = Math.round(totalAmt * 0.6);
      dueAmt = totalAmt - paidAmt;
      status = "partial";
    } else {
      paidAmt = 0;
      dueAmt = totalAmt;
      status = "pending";
    }

    const sFeeId = new mongoose.Types.ObjectId();
    studentFeeDocs.push({
      _id: sFeeId,
      school: schoolId,
      student: stu._id,
      academicYear: currentYear._id,
      feeStructure: feeStruct._id,
      totalAmount: totalAmt,
      discount: 0,
      payableAmount: totalAmt,
      paidAmount: paidAmt,
      dueAmount: dueAmt,
      status,
    });

    if (paidAmt > 0) {
      const padReceipt = String(feePaymentDocs.length + 1).padStart(5, "0");
      feePaymentDocs.push({
        school: schoolId,
        student: stu._id,
        studentFee: sFeeId,
        receiptNumber: `RCP-2026-${padReceipt}`,
        amount: paidAmt,
        paymentMethod: isTestStudent ? "upi" : ["online", "upi", "card", "cash"][idx % 4],
        transactionId: `TXN${Date.now() + idx}`,
        paymentDate: new Date(2026, 3 + (idx % 5), 10 + (idx % 15)),
        collectedBy: accountantUser._id,
        remarks: "Term Fee installment received with digital receipt",
      });
    }
  });

  await StudentFee.insertMany(studentFeeDocs);
  console.log(`Recorded ${feePaymentDocs.length} Fee Payments with receipts...`);
  await FeePayment.insertMany(feePaymentDocs);

  // 16. Exams, Subjects & Marks
  console.log("Setting up Exams and Student Marks Results...");
  const examTerm1 = await Exam.create({
    school: schoolId,
    academicYear: currentYear._id,
    name: "Term 1 Mid-Term Assessment 2026",
    type: "periodic_test",
    startDate: new Date("2026-09-15"),
    endDate: new Date("2026-09-28"),
    description: "Half-yearly comprehensive assessment across theory and practical subjects",
    status: "published",
    isActive: true,
  });

  const examTerm2 = await Exam.create({
    school: schoolId,
    academicYear: currentYear._id,
    name: "Term 2 Annual Board Mock 2027",
    type: "annual",
    startDate: new Date("2027-02-15"),
    endDate: new Date("2027-03-05"),
    description: "Annual final evaluation examinations",
    status: "scheduled",
    isActive: true,
  });

  // Create ExamSubjects for Grade 10
  const examSubjectDocs = createdSubjects.map((sub, sIdx) => ({
    school: schoolId,
    exam: examTerm1._id,
    class: grade10._id,
    subject: sub._id,
    maxMarks: 100,
    passingMarks: 33,
    theoryMaxMarks: sub.type === "both" ? 70 : 100,
    practicalMaxMarks: sub.type === "both" ? 30 : 0,
    examDate: new Date(2026, 8, 16 + sIdx),
    startTime: "09:30 AM",
    endTime: "12:30 PM",
  }));
  const createdExamSubjects = await ExamSubject.insertMany(examSubjectDocs);

  // Enter Results for Grade 10 Section A students (including test student Aarav Sharma)
  const g10Students = createdStudents.filter(
    (s) => s.class.toString() === grade10._id.toString() && s.section.toString() === grade10SecA._id.toString()
  );

  const studentResultDocs = [];
  const testStudentMarks = [94, 88, 92, 89, 86, 96, 90, 95]; // High scorer

  g10Students.forEach((stu, sIndex) => {
    const isTest = stu.admissionNumber === "GIS-2026-0001";

    createdExamSubjects.forEach((es, esIdx) => {
      const score = isTest
        ? testStudentMarks[esIdx]
        : Math.min(100, Math.max(42, 60 + ((sIndex * 7 + esIdx * 13) % 38)));
      const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D";

      studentResultDocs.push({
        school: schoolId,
        exam: examTerm1._id,
        examSubject: es._id,
        student: stu._id,
        theoryMarks: es.practicalMaxMarks > 0 ? Math.round(score * 0.7) : score,
        practicalMarks: es.practicalMaxMarks > 0 ? Math.round(score * 0.3) : 0,
        totalMarks: score,
        maxMarks: 100,
        percentage: score,
        grade,
        isPublished: true,
        result: score >= 33 ? "pass" : "fail",
        remarks: isTest ? "Outstanding academic consistency!" : "Good performance",
        enteredBy: createdTeachers[0]._id,
      });
    });
  });

  console.log(`Inserting ${studentResultDocs.length} Exam Marks & Results...`);
  await StudentResult.insertMany(studentResultDocs);

  // 17. Attendance Logs (Generate 10 days of attendance for Grade 10 Section A)
  console.log("Generating Attendance Records...");
  const attendanceDocs = [];
  const today = new Date();

  for (let dayOffset = 1; dayOffset <= 12; dayOffset++) {
    const logDate = new Date();
    logDate.setDate(today.getDate() - dayOffset);
    if (logDate.getDay() === 0) continue; // Skip Sunday

    g10Students.forEach((stu, sIdx) => {
      const isTest = stu.admissionNumber === "GIS-2026-0001";
      // Test student is present almost always
      const status = isTest
        ? dayOffset === 4 ? "late" : "present"
        : (sIdx + dayOffset) % 11 === 0
        ? "absent"
        : (sIdx + dayOffset) % 19 === 0
        ? "late"
        : "present";

      attendanceDocs.push({
        school: schoolId,
        academicYear: currentYear._id,
        date: logDate,
        class: grade10._id,
        section: grade10SecA._id,
        student: stu._id,
        markedBy: createdTeachers[0]._id,
        status,
        remarks: status === "late" ? "Arrived 10 mins late" : "",
      });
    });
  }
  console.log(`Inserting ${attendanceDocs.length} Attendance Records...`);
  await Attendance.insertMany(attendanceDocs);

  // 18. Timetable
  console.log("Generating Timetable Matrix for Grade 10 Section A...");
  const timetableDocs = [];
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const periods = [
    { period: 1, startTime: "08:30 AM", endTime: "09:15 AM" },
    { period: 2, startTime: "09:15 AM", endTime: "10:00 AM" },
    { period: 3, startTime: "10:15 AM", endTime: "11:00 AM" },
    { period: 4, startTime: "11:00 AM", endTime: "11:45 AM" },
    { period: 5, startTime: "12:30 PM", endTime: "01:15 PM" },
    { period: 6, startTime: "01:15 PM", endTime: "02:00 PM" },
  ];

  days.forEach((day, dIdx) => {
    periods.forEach((p, pIdx) => {
      const subject = createdSubjects[(dIdx + pIdx) % createdSubjects.length];
      const teacher = createdTeachers[(dIdx + pIdx) % createdTeachers.length];
      timetableDocs.push({
        school: schoolId,
        academicYear: currentYear._id,
        class: grade10._id,
        section: grade10SecA._id,
        subject: subject._id,
        teacher: teacher._id,
        room: "Lab 3 / Room 1001",
        day,
        period: p.period,
        startTime: p.startTime,
        endTime: p.endTime,
        isActive: true,
      });
    });
  });
  await Timetable.insertMany(timetableDocs);

  // 19. School Notices
  console.log("Publishing School Bulletins & Notices...");
  await Notice.insertMany([
    {
      school: schoolId,
      title: "Annual Sports Day 2026 - Schedule & Guidelines",
      content: "The Annual Inter-House Athletic Meet will be held on December 12th. All track and field events begin at 8:30 AM. Attendance is mandatory for all students.",
      category: "event",
      targetAudience: ["all"],
      published: true,
      pinned: true,
      publishDate: new Date(),
      createdBy: principalUser._id,
    },
    {
      school: schoolId,
      title: "Term 1 Mid-Term Examination Report Cards Released",
      content: "The digitized report cards for Term 1 Mid-Term Assessments are now published and accessible online in the Student and Parent portals.",
      category: "academic",
      targetAudience: ["student", "parent", "teacher"],
      published: true,
      pinned: true,
      publishDate: new Date(),
      createdBy: principalUser._id,
    },
    {
      school: schoolId,
      title: "Parent-Teacher Conference (PTC) Schedule",
      content: "Parent-Teacher interactions for Grades 1 to 10 will be conducted this Saturday from 9:00 AM to 1:00 PM. Parents are requested to adhere to their allotted slot.",
      category: "general",
      targetAudience: ["parent", "teacher"],
      published: true,
      pinned: false,
      publishDate: new Date(),
      createdBy: adminUser._id,
    },
    {
      school: schoolId,
      title: "Quarterly Fee Settlement Reminder",
      content: "Parents who have outstanding balances for the current quarter are requested to settle their dues through the online portal or accounts counter.",
      category: "fee",
      targetAudience: ["parent", "staff"],
      published: true,
      pinned: false,
      publishDate: new Date(),
      createdBy: accountantUser._id,
    },
  ]);

  // 20. Sample Leave Applications
  console.log("Creating Teacher Leave Requests...");
  await Leave.insertMany([
    {
      school: schoolId,
      applicant: createdTeachers[0].user,
      applicantType: "teacher",
      fromDate: new Date("2026-11-20"),
      toDate: new Date("2026-11-21"),
      leaveType: "casual",
      reason: "Attending national science pedagogy workshop",
      status: "approved",
      reviewedBy: principalUser._id,
      reviewedAt: new Date(),
      reviewRemarks: "Approved. Please ensure class coverage is arranged.",
    },
    {
      school: schoolId,
      applicant: createdTeachers[1].user,
      applicantType: "teacher",
      fromDate: new Date("2026-11-25"),
      toDate: new Date("2026-11-26"),
      leaveType: "sick",
      reason: "Medical consultation and rest",
      status: "pending",
    },
  ]);

  console.log("\n=======================================================");
  console.log("✅ FULL ERP SEEDING COMPLETED SUCCESSFULLY!");
  console.log("=======================================================");
  console.log(`School:              ${school.name} (Code: ${school.code})`);
  console.log(`Academic Year:       ${currentYear.name} (Active)`);
  console.log(`Classes:             10 Grades (Grade 1 to Grade 10)`);
  console.log(`Sections:            30 Sections (3 per grade)`);
  console.log(`Subjects:            8 Core Subjects`);
  console.log(`Total Students:      ${createdStudents.length} Students (1,000+ Enrolled)`);
  console.log(`Faculty / Teachers:  ${createdTeachers.length} Active Teachers`);
  console.log(`Staff Members:       Principal, Admins, Accountant`);
  console.log(`Parents Linked:      300 Parents`);
  console.log(`Invoices & Fees:     ${studentFeeDocs.length} Student Fees, ${feePaymentDocs.length} Payments`);
  console.log(`Exams & Results:     2 Terms, ${studentResultDocs.length} Marks Recorded`);
  console.log(`Attendance Entries:  ${attendanceDocs.length} Records`);
  console.log("=======================================================\n");

  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Seeding Failed with Error:", err);
  process.exit(1);
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Section = require("../models/Section");
const AcademicYear = require("../models/AcademicYear");
const Subject = require("../models/Subject");
const TransportVehicle = require("../models/TransportVehicle");
const User = require("../models/User");
const Role = require("../models/Role");
const Parent = require("../models/Parent");
const ParentStudent = require("../models/ParentStudent");

// Helper: generate next unique admission number for school
const getNextAdmissionNumber = async (schoolId) => {
  const year = new Date().getFullYear();
  const students = await Student.find({ school: schoolId })
    .select("admissionNumber")
    .sort({ createdAt: -1 })
    .limit(300);

  let prefix = "GIS";
  let maxSeq = 0;
  const regex = new RegExp(`^${prefix}-${year}-(\\d+)$`, "i");

  for (const s of students) {
    if (s.admissionNumber) {
      const match = s.admissionNumber.match(regex);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}-${year}-${String(nextSeq).padStart(4, "0")}`;
  while (await Student.findOne({ school: schoolId, admissionNumber: candidate })) {
    nextSeq++;
    candidate = `${prefix}-${year}-${String(nextSeq).padStart(4, "0")}`;
  }
  return candidate;
};

// Helper: generate next roll number for section
const getNextRollNumber = async (schoolId, academicYear, classId, sectionId) => {
  const students = await Student.find({
    school: schoolId,
    academicYear,
    class: classId,
    section: sectionId,
  }).select("rollNumber");

  let maxRoll = 0;
  for (const s of students) {
    if (typeof s.rollNumber === "number" && s.rollNumber > maxRoll) {
      maxRoll = s.rollNumber;
    }
  }
  return maxRoll + 1;
};

// Helper: generate next unique parent ID
const getNextParentId = async (schoolId) => {
  const parents = await Parent.find({ school: schoolId })
    .select("parentId")
    .sort({ createdAt: -1 })
    .limit(300);

  let maxSeq = 1000;
  for (const p of parents) {
    if (p.parentId) {
      const match = p.parentId.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `PAR${nextSeq}`;
  while (await Parent.findOne({ school: schoolId, parentId: candidate })) {
    nextSeq++;
    candidate = `PAR${nextSeq}`;
  }
  return candidate;
};

// Helper: generate next teacher employee ID
const getNextEmployeeId = async (schoolId) => {
  const teachers = await Teacher.find({ school: schoolId })
    .select("employeeId")
    .sort({ createdAt: -1 })
    .limit(300);

  let maxSeq = 100;
  for (const t of teachers) {
    if (t.employeeId) {
      const match = t.employeeId.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `TCH${nextSeq}`;
  while (await Teacher.findOne({ school: schoolId, employeeId: candidate })) {
    nextSeq++;
    candidate = `TCH${nextSeq}`;
  }
  return candidate;
};

/**
 * 1. BULK IMPORT STUDENTS
 */
const importStudents = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const schoolId = new mongoose.Types.ObjectId(String(rawSchoolId));
    const rows = req.body.rows || req.body.data || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "No data rows provided for import" });
    }

    // Determine target Academic Year
    let academicYearDoc = null;
    if (req.body.academicYearId) {
      academicYearDoc = await AcademicYear.findOne({ _id: req.body.academicYearId, school: schoolId });
    }
    if (!academicYearDoc) {
      academicYearDoc = await AcademicYear.findOne({ school: schoolId, isCurrent: true });
    }
    if (!academicYearDoc) {
      academicYearDoc = await AcademicYear.findOne({ school: schoolId }).sort({ createdAt: -1 });
    }
    if (!academicYearDoc) {
      return res.status(400).json({ success: false, message: "No active Academic Year found in school" });
    }

    const studentRole = await Role.findOne({ name: "student" });
    const parentRole = await Role.findOne({ name: "parent" });
    if (!studentRole || !parentRole) {
      return res.status(500).json({ success: false, message: "Student or Parent roles are not configured" });
    }

    // Cache classes and sections for fast lookup
    const allClasses = await Class.find({ school: schoolId, academicYear: academicYearDoc._id });
    const allSections = await Section.find({ school: schoolId, academicYear: academicYearDoc._id });
    const allVehicles = await TransportVehicle.find({ school: schoolId, status: "active" });

    const results = {
      total: rows.length,
      successCount: 0,
      errorCount: 0,
      credentials: [],
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      try {
        const firstName = String(row.firstName || row.first_name || row.name || "").trim();
        const lastName = String(row.lastName || row.last_name || "").trim();

        if (!firstName) {
          throw new Error("Student first name is required");
        }

        // Match Class
        const classQuery = String(row.className || row.class || row.class_name || row.grade || "").trim();
        if (!classQuery) {
          throw new Error("Class / Grade is required");
        }
        const matchedClass = allClasses.find(
          (c) =>
            c.name.toLowerCase() === classQuery.toLowerCase() ||
            c.code.toLowerCase() === classQuery.toLowerCase()
        );
        if (!matchedClass) {
          throw new Error(`Class '${classQuery}' not found in current session`);
        }

        // Match Section
        const sectionQuery = String(row.sectionName || row.section || row.section_name || "A").trim();
        const matchedSection = allSections.find(
          (s) =>
            String(s.class) === String(matchedClass._id) &&
            (s.name.toLowerCase() === sectionQuery.toLowerCase() ||
              s.code.toLowerCase() === sectionQuery.toLowerCase())
        );
        if (!matchedSection) {
          throw new Error(`Section '${sectionQuery}' not found for Class '${matchedClass.name}'`);
        }

        // Admission Number
        let admission = String(row.admissionNumber || row.admission_no || row.adm_no || "").trim().toUpperCase();
        if (!admission || admission === "AUTO") {
          admission = await getNextAdmissionNumber(schoolId);
        }
        const duplicateAdm = await Student.findOne({ school: schoolId, admissionNumber: admission });
        if (duplicateAdm) {
          throw new Error(`Admission number '${admission}' already exists`);
        }

        // Roll Number
        let assignedRoll = parseInt(row.rollNumber || row.roll_no || row.roll, 10);
        if (isNaN(assignedRoll) || assignedRoll <= 0) {
          assignedRoll = await getNextRollNumber(schoolId, academicYearDoc._id, matchedClass._id, matchedSection._id);
        }

        // Gender & DOB
        let gender = String(row.gender || "").trim().toLowerCase();
        if (!["male", "female", "other"].includes(gender)) {
          gender = "male";
        }

        let dateOfBirth = null;
        if (row.dob || row.dateOfBirth || row.date_of_birth) {
          const rawDob = row.dob || row.dateOfBirth || row.date_of_birth;
          dateOfBirth = new Date(rawDob);
          if (isNaN(dateOfBirth.getTime())) dateOfBirth = new Date("2012-01-01");
        } else {
          dateOfBirth = new Date("2012-01-01");
        }
        const dobYear = dateOfBirth.getFullYear();
        const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");

        // Phone & Email
        const phone = String(row.phone || row.mobile || row.contact || "").trim();
        const rawEmail = String(row.email || row.student_email || "").trim().toLowerCase();

        // Transport Vehicle Match (if given)
        let transportAllocation = null;
        const busQuery = String(row.busNumber || row.bus_no || row.bus || row.transport || "").trim().toUpperCase();
        if (busQuery) {
          const matchedBus = allVehicles.find(
            (v) =>
              v.busNumber.toUpperCase() === busQuery ||
              v.routeName.toLowerCase().includes(busQuery.toLowerCase())
          );
          if (matchedBus) {
            transportAllocation = {
              opted: true,
              vehicle: matchedBus._id,
              busNumber: matchedBus.busNumber,
              routeName: matchedBus.routeName,
              pickupStop: String(row.pickupStop || row.pickup_stop || row.stop || "").trim() || (matchedBus.stops?.[0]?.stopName || "School Campus"),
              dropStop: String(row.dropStop || row.drop_stop || "").trim() || (matchedBus.stops?.[0]?.stopName || "School Campus"),
              annualFee: matchedBus.annualFee || 12000,
            };
          }
        }

        // Guardian / Parent details
        const parentName = String(row.parentName || row.fatherName || row.guardian_name || row.parent || "").trim() || `Parent of ${firstName}`;
        const parentPhone = String(row.parentPhone || row.guardian_phone || row.father_phone || phone || "").trim();
        const parentEmail = String(row.parentEmail || row.guardian_email || "").trim().toLowerCase();
        const parentRelation = String(row.parentRelation || row.relation || "father").trim().toLowerCase();

        // 1. Create Student record
        const studentDoc = await Student.create({
          school: schoolId,
          admissionNumber: admission,
          firstName,
          lastName,
          gender,
          dateOfBirth,
          phone,
          email: rawEmail || undefined,
          academicYear: academicYearDoc._id,
          class: matchedClass._id,
          section: matchedSection._id,
          rollNumber: assignedRoll,
          guardian: {
            name: parentName,
            phone: parentPhone,
            email: parentEmail,
            relation: parentRelation,
          },
          transport: transportAllocation || { opted: false },
          status: "active",
        });

        // 2. Generate Student Portal User Login
        let studentUsername = "";
        if (rawEmail) {
          studentUsername = rawEmail;
        } else if (phone) {
          studentUsername = phone;
        } else {
          studentUsername = `${cleanFirstName}${assignedRoll}`;
        }
        let uCand = studentUsername;
        let uSuf = 1;
        while (await User.findOne({ school: schoolId, username: uCand })) {
          uCand = `${studentUsername}${uSuf}`;
          uSuf++;
        }
        studentUsername = uCand;

        let normalizedEmail = rawEmail;
        if (!normalizedEmail) {
          normalizedEmail = `${studentUsername.replace(/[^a-z0-9]/g, "")}@student.local`;
          let eSuf = 1;
          while (await User.findOne({ school: schoolId, email: normalizedEmail })) {
            normalizedEmail = `${studentUsername.replace(/[^a-z0-9]/g, "")}${eSuf}@student.local`;
            eSuf++;
          }
        }

        let studentPlainPassword = `${cleanFirstName}@${dobYear}`;
        if (studentPlainPassword.length < 6) {
          studentPlainPassword = `${cleanFirstName}123@${dobYear}`;
        }

        const studentUser = await User.create({
          school: schoolId,
          name: `${firstName} ${lastName}`.trim(),
          username: studentUsername,
          email: normalizedEmail,
          password: await bcrypt.hash(studentPlainPassword, 12),
          role: studentRole._id,
          phone: phone || undefined,
          student: studentDoc._id,
        });

        studentDoc.user = studentUser._id;
        await studentDoc.save();

        // 3. Generate Parent Portal User & Parent Record
        const cleanParentName = parentName.toLowerCase().replace(/[^a-z0-9]/g, "");
        let pUsername = "";
        if (parentEmail) {
          pUsername = parentEmail;
        } else if (parentPhone) {
          pUsername = parentPhone;
        } else {
          pUsername = `parent_${cleanParentName}${assignedRoll}`;
        }

        let pCand = pUsername;
        let pSuf = 1;
        while (await User.findOne({ school: schoolId, username: pCand })) {
          pCand = `${pUsername}${pSuf}`;
          pSuf++;
        }
        pUsername = pCand;

        let pEmail = parentEmail;
        if (!pEmail) {
          pEmail = `${pUsername.replace(/[^a-z0-9]/g, "")}@parent.local`;
          let peSuf = 1;
          while (await User.findOne({ school: schoolId, email: pEmail })) {
            pEmail = `${pUsername.replace(/[^a-z0-9]/g, "")}${peSuf}@parent.local`;
            peSuf++;
          }
        }

        let parentPlainPassword = `${cleanParentName}@${dobYear}`;
        if (parentPlainPassword.length < 6) {
          parentPlainPassword = `${cleanParentName}123@${dobYear}`;
        }

        const parentUser = await User.create({
          school: schoolId,
          name: parentName,
          username: pUsername,
          email: pEmail,
          password: await bcrypt.hash(parentPlainPassword, 12),
          role: parentRole._id,
          phone: parentPhone || undefined,
        });

        const nextParentId = await getNextParentId(schoolId);
        const parentDoc = await Parent.create({
          school: schoolId,
          user: parentUser._id,
          parentId: nextParentId,
          firstName: parentName,
          phone: parentPhone || `PAR-${admission}`,
          email: pEmail,
          password: await bcrypt.hash(parentPlainPassword, 12),
          relation: ["father", "mother", "guardian", "other"].includes(parentRelation) ? parentRelation : "guardian",
        });

        parentUser.parent = parentDoc._id;
        await parentUser.save();

        await ParentStudent.create({
          school: schoolId,
          parent: parentDoc._id,
          student: studentDoc._id,
          relation: parentDoc.relation,
          isPrimary: true,
        });

        results.successCount++;
        results.credentials.push({
          row: rowIndex,
          studentName: `${firstName} ${lastName}`.trim(),
          admissionNumber: admission,
          rollNumber: assignedRoll,
          classSection: `${matchedClass.name} - ${matchedSection.name}`,
          studentUsername,
          studentPassword: studentPlainPassword,
          parentName,
          parentUsername: pUsername,
          parentPassword: parentPlainPassword,
          busAssigned: transportAllocation ? transportAllocation.busNumber : "None",
        });
      } catch (rowErr) {
        results.errorCount++;
        results.errors.push({
          row: rowIndex,
          studentName: `${row.firstName || row.name || "Unknown"} ${row.lastName || ""}`.trim(),
          error: rowErr.message || "Failed to import student",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Student import finished: ${results.successCount} imported successfully, ${results.errorCount} failed`,
      data: results,
    });
  } catch (err) {
    console.error("Bulk Import Students Error:", err);
    return res.status(500).json({ success: false, message: "Server error during student bulk import" });
  }
};

/**
 * 2. BULK IMPORT TEACHERS
 */
const importTeachers = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const schoolId = new mongoose.Types.ObjectId(String(rawSchoolId));
    const rows = req.body.rows || req.body.data || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "No data rows provided for import" });
    }

    const teacherRole = await Role.findOne({ name: "teacher" });
    if (!teacherRole) {
      return res.status(500).json({ success: false, message: "Teacher role is not configured" });
    }

    const results = {
      total: rows.length,
      successCount: 0,
      errorCount: 0,
      credentials: [],
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      try {
        const firstName = String(row.firstName || row.first_name || row.name || "").trim();
        const lastName = String(row.lastName || row.last_name || "").trim();

        if (!firstName) {
          throw new Error("Teacher first name is required");
        }

        let empId = String(row.employeeId || row.emp_id || row.employee_no || "").trim().toUpperCase();
        if (!empId || empId === "AUTO") {
          empId = await getNextEmployeeId(schoolId);
        }
        const duplicateEmp = await Teacher.findOne({ school: schoolId, employeeId: empId });
        if (duplicateEmp) {
          throw new Error(`Employee ID '${empId}' already exists`);
        }

        const phone = String(row.phone || row.mobile || "").trim();
        let rawEmail = String(row.email || "").trim().toLowerCase();
        if (!rawEmail) {
          const cleanName = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
          rawEmail = `${cleanName}.${empId.toLowerCase()}@teacher.local`;
        }

        const duplicateEmail = await User.findOne({ school: schoolId, email: rawEmail });
        if (duplicateEmail) {
          throw new Error(`Email '${rawEmail}' is already registered`);
        }

        let gender = String(row.gender || "").trim().toLowerCase();
        if (!["male", "female", "other"].includes(gender)) gender = "female";

        const designation = String(row.designation || row.title || "Subject Teacher").trim();
        const department = String(row.department || "Academics").trim();
        const qualification = String(row.qualification || "Graduate").trim();

        const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
        let teacherPassword = String(row.password || `${cleanFirst}@2026`).trim();
        if (teacherPassword.length < 6) teacherPassword = `${cleanFirst}123@2026`;

        // 1. Create Teacher profile
        const teacherDoc = await Teacher.create({
          school: schoolId,
          employeeId: empId,
          firstName,
          lastName,
          email: rawEmail,
          phone,
          gender,
          designation,
          department,
          qualification,
          isActive: true,
        });

        // 2. Create User account
        const userDoc = await User.create({
          school: schoolId,
          name: `${firstName} ${lastName}`.trim(),
          username: empId.toLowerCase(),
          email: rawEmail,
          password: await bcrypt.hash(teacherPassword, 12),
          role: teacherRole._id,
          phone: phone || undefined,
          teacher: teacherDoc._id,
        });

        teacherDoc.user = userDoc._id;
        await teacherDoc.save();

        results.successCount++;
        results.credentials.push({
          row: rowIndex,
          teacherName: `${firstName} ${lastName}`.trim(),
          employeeId: empId,
          department,
          designation,
          username: empId.toLowerCase(),
          email: rawEmail,
          password: teacherPassword,
        });
      } catch (rowErr) {
        results.errorCount++;
        results.errors.push({
          row: rowIndex,
          teacherName: `${row.firstName || row.name || "Unknown"} ${row.lastName || ""}`.trim(),
          error: rowErr.message || "Failed to import teacher",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Teacher import finished: ${results.successCount} imported successfully, ${results.errorCount} failed`,
      data: results,
    });
  } catch (err) {
    console.error("Bulk Import Teachers Error:", err);
    return res.status(500).json({ success: false, message: "Server error during teacher bulk import" });
  }
};

/**
 * 3. BULK IMPORT CLASSES & SECTIONS
 */
const importClassesAndSections = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const schoolId = new mongoose.Types.ObjectId(String(rawSchoolId));
    const rows = req.body.rows || req.body.data || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "No data rows provided for import" });
    }

    let academicYearDoc = null;
    if (req.body.academicYearId) {
      academicYearDoc = await AcademicYear.findOne({ _id: req.body.academicYearId, school: schoolId });
    }
    if (!academicYearDoc) {
      academicYearDoc = await AcademicYear.findOne({ school: schoolId, isCurrent: true });
    }
    if (!academicYearDoc) {
      return res.status(400).json({ success: false, message: "No active Academic Year found" });
    }

    const results = {
      total: rows.length,
      successCount: 0,
      errorCount: 0,
      classesCreated: 0,
      sectionsCreated: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      try {
        const className = String(row.className || row.class || row.name || "").trim();
        const classCode = String(row.classCode || row.class_code || row.code || className).trim().toUpperCase();
        const sectionName = String(row.sectionName || row.section || "A").trim().toUpperCase();
        const sectionCode = String(row.sectionCode || row.section_code || sectionName).trim().toUpperCase();
        const capacity = parseInt(row.capacity || 40, 10);
        const roomNumber = String(row.roomNumber || row.room_no || "").trim();

        if (!className) throw new Error("Class name is required");

        // 1. Find or create Class
        let classDoc = await Class.findOne({
          school: schoolId,
          academicYear: academicYearDoc._id,
          $or: [{ name: className }, { code: classCode }],
        });

        if (!classDoc) {
          classDoc = await Class.create({
            school: schoolId,
            academicYear: academicYearDoc._id,
            name: className,
            code: classCode,
            isActive: true,
          });
          results.classesCreated++;
        }

        // 2. Find or create Section
        let sectionDoc = await Section.findOne({
          school: schoolId,
          academicYear: academicYearDoc._id,
          class: classDoc._id,
          $or: [{ name: sectionName }, { code: sectionCode }],
        });

        if (!sectionDoc) {
          sectionDoc = await Section.create({
            school: schoolId,
            academicYear: academicYearDoc._id,
            class: classDoc._id,
            name: sectionName,
            code: sectionCode,
            capacity: isNaN(capacity) ? 40 : capacity,
            roomNumber,
            isActive: true,
          });
          results.sectionsCreated++;
        }

        results.successCount++;
      } catch (rowErr) {
        results.errorCount++;
        results.errors.push({
          row: rowIndex,
          item: `${row.className || "Class"} - ${row.sectionName || "Section"}`,
          error: rowErr.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Academic Structure import finished: ${results.classesCreated} classes & ${results.sectionsCreated} sections processed`,
      data: results,
    });
  } catch (err) {
    console.error("Bulk Import Classes & Sections Error:", err);
    return res.status(500).json({ success: false, message: "Server error during classes & sections bulk import" });
  }
};

/**
 * 4. BULK IMPORT SUBJECTS
 */
const importSubjects = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const schoolId = new mongoose.Types.ObjectId(String(rawSchoolId));
    const rows = req.body.rows || req.body.data || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "No data rows provided for import" });
    }

    const results = {
      total: rows.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      try {
        const name = String(row.name || row.subjectName || row.subject_name || "").trim();
        const code = String(row.code || row.subjectCode || row.subject_code || name.slice(0, 4)).trim().toUpperCase();
        let type = String(row.type || "theory").trim().toLowerCase();
        if (!["theory", "practical", "both"].includes(type)) type = "theory";

        const maxMarks = parseInt(row.maxMarks || row.max_marks || 100, 10);
        const passingMarks = parseInt(row.passingMarks || row.passing_marks || 33, 10);
        const isOptional = Boolean(row.isOptional || row.is_optional || false);

        if (!name || !code) throw new Error("Subject name and code are required");

        let existing = await Subject.findOne({
          school: schoolId,
          $or: [{ name }, { code }],
        });

        if (existing) {
          existing.type = type;
          existing.maxMarks = maxMarks;
          existing.passingMarks = passingMarks;
          existing.isOptional = isOptional;
          await existing.save();
        } else {
          await Subject.create({
            school: schoolId,
            name,
            code,
            type,
            maxMarks: isNaN(maxMarks) ? 100 : maxMarks,
            passingMarks: isNaN(passingMarks) ? 33 : passingMarks,
            isOptional,
            isActive: true,
          });
        }

        results.successCount++;
      } catch (rowErr) {
        results.errorCount++;
        results.errors.push({
          row: rowIndex,
          subject: row.name || "Unknown",
          error: rowErr.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Subjects catalog import finished: ${results.successCount} processed successfully, ${results.errorCount} failed`,
      data: results,
    });
  } catch (err) {
    console.error("Bulk Import Subjects Error:", err);
    return res.status(500).json({ success: false, message: "Server error during subjects bulk import" });
  }
};

/**
 * 5. BULK IMPORT TRANSPORT VEHICLES & ROUTES
 */
const importTransport = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const schoolId = new mongoose.Types.ObjectId(String(rawSchoolId));
    const rows = req.body.rows || req.body.data || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "No data rows provided for import" });
    }

    const results = {
      total: rows.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      try {
        const busNumber = String(row.busNumber || row.bus_no || row.bus || "").trim().toUpperCase();
        const routeName = String(row.routeName || row.route || row.route_name || "").trim();
        const driverName = String(row.driverName || row.driver || row.driver_name || "").trim();
        const driverPhone = String(row.driverPhone || row.driver_mobile || row.phone || "").trim();

        if (!busNumber) throw new Error("Bus / Vehicle number is required");
        if (!routeName) throw new Error("Route name is required");
        if (!driverName) throw new Error("Driver name is required");
        if (!driverPhone) throw new Error("Driver phone is required");

        const vehicleModel = String(row.vehicleModel || row.model || "School Bus").trim();
        const registrationNumber = String(row.registrationNumber || row.reg_no || "").trim().toUpperCase();
        const capacity = parseInt(row.capacity || 40, 10);
        const annualFee = parseInt(row.annualFee || row.fee || 12000, 10);
        const driverLicense = String(row.driverLicense || row.license || "").trim();
        const attendantName = String(row.attendantName || row.attendant || "").trim();
        const attendantPhone = String(row.attendantPhone || "").trim();
        const pickupTime = String(row.pickupTime || row.pickup || "07:30 AM").trim();
        const dropTime = String(row.dropTime || row.drop || "02:30 PM").trim();

        // Parse stops if provided as comma-separated or JSON
        let stopsList = [];
        const rawStops = row.stops || row.bus_stops || "";
        if (typeof rawStops === "string" && rawStops.trim()) {
          const parts = rawStops.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
          stopsList = parts.map((stopStr, sIdx) => {
            const timeMatch = stopStr.match(/\((.*?)\)/);
            const stopName = stopStr.replace(/\(.*?\)/, "").trim();
            return {
              stopName: stopName || `Stop ${sIdx + 1}`,
              pickupTime: timeMatch ? timeMatch[1].trim() : pickupTime,
              dropTime: dropTime,
              fare: 0,
            };
          });
        }
        if (stopsList.length === 0) {
          stopsList = [
            { stopName: "Main School Gate", pickupTime, dropTime, fare: 0 },
            { stopName: "City Center Circle", pickupTime, dropTime, fare: 0 },
          ];
        }

        let existingVehicle = await TransportVehicle.findOne({
          school: schoolId,
          busNumber,
        });

        if (existingVehicle) {
          existingVehicle.routeName = routeName;
          existingVehicle.driverName = driverName;
          existingVehicle.driverPhone = driverPhone;
          existingVehicle.driverLicense = driverLicense;
          existingVehicle.vehicleModel = vehicleModel;
          existingVehicle.registrationNumber = registrationNumber;
          existingVehicle.capacity = isNaN(capacity) ? 40 : capacity;
          existingVehicle.annualFee = isNaN(annualFee) ? 12000 : annualFee;
          existingVehicle.attendantName = attendantName;
          existingVehicle.attendantPhone = attendantPhone;
          existingVehicle.pickupTime = pickupTime;
          existingVehicle.dropTime = dropTime;
          if (stopsList.length > 0) existingVehicle.stops = stopsList;
          await existingVehicle.save();
        } else {
          await TransportVehicle.create({
            school: schoolId,
            busNumber,
            vehicleModel,
            registrationNumber,
            capacity: isNaN(capacity) ? 40 : capacity,
            routeName,
            driverName,
            driverPhone,
            driverLicense,
            attendantName,
            attendantPhone,
            pickupTime,
            dropTime,
            annualFee: isNaN(annualFee) ? 12000 : annualFee,
            stops: stopsList,
            status: "active",
          });
        }

        results.successCount++;
      } catch (rowErr) {
        results.errorCount++;
        results.errors.push({
          row: rowIndex,
          bus: row.busNumber || "Unknown",
          error: rowErr.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Transport fleet import finished: ${results.successCount} vehicles processed successfully, ${results.errorCount} failed`,
      data: results,
    });
  } catch (err) {
    console.error("Bulk Import Transport Error:", err);
    return res.status(500).json({ success: false, message: "Server error during transport bulk import" });
  }
};

module.exports = {
  importStudents,
  importTeachers,
  importClassesAndSections,
  importSubjects,
  importTransport,
};

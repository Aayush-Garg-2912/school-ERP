require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
require("./models/Permission");
const routes = {
  auth: require("./routes/auth.routes"),
  chairman: require("./routes/chairman.routes"),
  school: require("./routes/school.routes"),
  academicYears: require("./routes/academicYear.routes"),
  classes: require("./routes/class.routes"),
  sections: require("./routes/section.routes"),
  subjects: require("./routes/subject.routes"),
  classSubjects: require("./routes/classSubject.routes"),
  teachers: require("./routes/teacher.routes"),
  teacherAssignments: require("./routes/teacherAssignment.routes"),
  students: require("./routes/student.routes"),
  parents: require("./routes/parent.routes"),
  staff: require("./routes/staff.routes"),
  attendance: require("./routes/attendance.routes"),
  feeStructures: require("./routes/feeStructure.routes"),
  studentFees: require("./routes/studentFee.routes"),
  feePayments: require("./routes/feePayment.routes"),
  exams: require("./routes/exam.routes"),
  results: require("./routes/result.routes"),
  timetable: require("./routes/timetable.routes"),
  leaves: require("./routes/leave.routes"),
  notices: require("./routes/notice.routes"),
  notifications: require("./routes/notification.routes"),
  reports: require("./routes/report.routes"),
  whatsapp: require("./routes/whatsapp.routes"),
  transport: require("./routes/transport.routes"),
};
const app = express();
const PORT = process.env.PORT || 5000;
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or localhost dev ports
      if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1") || process.env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register-chairman", authLimiter);
app.get("/", (req, res) =>
  res.json({
    success: true,
    message: "School ERP Backend is running 🚀",
    version: "1.0.0",
  }),
);
app.get("/health", (req, res) =>
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  }),
);
const registerRoutes = (prefix = "") => {
  app.use(`${prefix}/auth`, routes.auth);
  app.use(`${prefix}/chairman`, routes.chairman);
  app.use(`${prefix}/school`, routes.school);
  app.use(`${prefix}/academic-years`, routes.academicYears);
  app.use(`${prefix}/classes`, routes.classes);
  app.use(`${prefix}/sections`, routes.sections);
  app.use(`${prefix}/subjects`, routes.subjects);
  app.use(`${prefix}/class-subjects`, routes.classSubjects);
  app.use(`${prefix}/teachers`, routes.teachers);
  app.use(`${prefix}/teacher-assignments`, routes.teacherAssignments);
  app.use(`${prefix}/students`, routes.students);
  app.use(`${prefix}/parents`, routes.parents);
  app.use(`${prefix}/staff`, routes.staff);
  app.use(`${prefix}/attendance`, routes.attendance);
  app.use(`${prefix}/fee-structures`, routes.feeStructures);
  app.use(`${prefix}/student-fees`, routes.studentFees);
  app.use(`${prefix}/fee-payments`, routes.feePayments);
  app.use(`${prefix}/exams`, routes.exams);
  app.use(`${prefix}/results`, routes.results);
  app.use(`${prefix}/timetable`, routes.timetable);
  app.use(`${prefix}/leaves`, routes.leaves);
  app.use(`${prefix}/notices`, routes.notices);
  app.use(`${prefix}/notifications`, routes.notifications);
  app.use(`${prefix}/reports`, routes.reports);
  app.use(`${prefix}/whatsapp`, routes.whatsapp);
  app.use(`${prefix}/transport`, routes.transport);
};

// Mount both with /api and without /api to prevent 404s from environment configuration mismatch
registerRoutes("/api");
registerRoutes("");

app.use((req, res) => {
  console.warn(`[404 NOT FOUND] ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  if (err.code === 11000)
    return res
      .status(409)
      .json({ success: false, message: "Duplicate value already exists" });
  if (err.name === "ValidationError")
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  if (err.name === "CastError")
    return res
      .status(400)
      .json({ success: false, message: `Invalid ${err.path}` });
  res
    .status(err.statusCode || 500)
    .json({ success: false, message: err.message || "Internal server error" });
});
const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};
if (require.main === module)
  start().catch((e) => {
    console.error(e);
    process.exit(1);
  });
module.exports = app;

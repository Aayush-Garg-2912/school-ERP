const express = require("express");
const {
  importStudents,
  importTeachers,
  importClassesAndSections,
  importSubjects,
  importTransport,
} = require("../controllers/import.controller");
const { protect } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

// Bulk data import is exclusively restricted to executive administration (Chairman, Principal, Admin)
const importAccess = [protect, allowRoles("chairman", "principal", "admin")];

router.post("/students", ...importAccess, importStudents);
router.post("/teachers", ...importAccess, importTeachers);
router.post("/classes-sections", ...importAccess, importClassesAndSections);
router.post("/subjects", ...importAccess, importSubjects);
router.post("/transport", ...importAccess, importTransport);

module.exports = router;

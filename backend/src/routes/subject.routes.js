const express = require("express");

const {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require("../controllers/subject.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("subject:create"),
  createSubject
);

router.get(
  "/",
  protect,
  allowPermissions("subject:view"),
  getSubjects
);

router.get(
  "/:id",
  protect,
  allowPermissions("subject:view"),
  getSubjectById
);

router.put(
  "/:id",
  protect,
  allowPermissions("subject:update"),
  updateSubject
);

router.delete(
  "/:id",
  protect,
  allowPermissions("subject:delete"),
  deleteSubject
);

module.exports = router;
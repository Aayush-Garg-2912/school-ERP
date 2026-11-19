const express = require("express");

const {
  createClassSubject,
  getClassSubjects,
  getClassSubjectById,
  updateClassSubject,
  deleteClassSubject,
} = require("../controllers/classSubject.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("classSubject:create"),
  createClassSubject
);

router.get(
  "/",
  protect,
  allowPermissions("classSubject:view"),
  getClassSubjects
);

router.get(
  "/:id",
  protect,
  allowPermissions("classSubject:view"),
  getClassSubjectById
);

router.put(
  "/:id",
  protect,
  allowPermissions("classSubject:update"),
  updateClassSubject
);

router.delete(
  "/:id",
  protect,
  allowPermissions("classSubject:delete"),
  deleteClassSubject
);

module.exports = router;
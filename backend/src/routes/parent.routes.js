const express = require("express");

const {
  createParent,
  getParents,
  getParentById,
  updateParent,
  deleteParent,
    getMyChildren,
      getMyChildById,
      getMyChildFees,
} = require("../controllers/parent.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  allowPermissions,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  allowPermissions("parent:create"),
  createParent
);

router.get(
  "/",
  protect,
  allowPermissions("parent:view"),
  getParents
);

router.get(
  "/me/children",
  protect,
  getMyChildren
);
router.get(
  "/me/children/:studentId",
  protect,
  getMyChildById
);

router.get(
  "/me/children/:studentId/fees",
  protect,
  getMyChildFees
);

router.get(
  "/:id",
  protect,
  allowPermissions("parent:view"),
  getParentById
);

router.put(
  "/:id",
  protect,
  allowPermissions("parent:update"),
  updateParent
);

router.delete(
  "/:id",
  protect,
  allowPermissions("parent:delete"),
  deleteParent
);

module.exports = router;
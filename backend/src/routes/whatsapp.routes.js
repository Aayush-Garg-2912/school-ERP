const express = require("express");
const {
  getWhatsAppStats,
  getWhatsAppMessages,
  sendMessage,
  getBirthdays,
  dispatchBirthdays,
  dispatchFeeReminders,
} = require("../controllers/whatsapp.controller");

const { protect } = require("../middleware/auth.middleware");
const { allowPermissions } = require("../middleware/permissionMiddleware");

const router = express.Router();

router.get("/stats", protect, allowPermissions("whatsapp:view"), getWhatsAppStats);
router.get("/messages", protect, allowPermissions("whatsapp:view"), getWhatsAppMessages);
router.post("/send", protect, allowPermissions("whatsapp:send"), sendMessage);
router.get("/birthdays", protect, allowPermissions("whatsapp:view"), getBirthdays);
router.post("/birthdays/dispatch", protect, allowPermissions("whatsapp:send"), dispatchBirthdays);
router.post("/fee-reminders", protect, allowPermissions("whatsapp:send"), dispatchFeeReminders);

module.exports = router;

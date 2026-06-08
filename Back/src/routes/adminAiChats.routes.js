const express = require("express");

const authJWT = require("../middlewares/authJWT");
const requireRole = require("../middlewares/requireRole");

const c = require("../controllers/adminAiChats.controller");

const router = express.Router();

router.use(authJWT, requireRole("ADMIN"));

// Chats
router.post("/", c.createChat);
router.get("/", c.listChats);
router.get("/:id", c.getChat);
router.delete("/:id", c.deleteChat);

// Messages
router.get("/:id/messages", c.listMessages);
router.post("/:id/messages", c.sendMessage);

// Human edit mandatory
router.put("/:id/template/human-edit", c.humanEditTemplate);

// Publish to contracts (base v1)
router.post("/:id/publish-to-contract", c.publishToContract);

module.exports = router;
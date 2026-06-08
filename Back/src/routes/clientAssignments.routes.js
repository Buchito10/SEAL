const router = require("express").Router();
const authJWT = require("../middlewares/authJWT");
const requireRole = require("../middlewares/requireRole");
const c = require("../controllers/clientAssignments.controller");
const profile = require("../controllers/clientProfile.controller");

// Protegido: CLIENT
router.use(authJWT, requireRole("CLIENT"));

router.get("/profile", profile.getProfile);
router.patch("/profile", profile.updateProfile);

router.get("/assignments", c.list);
router.get("/assignments/:id", c.getById);

router.post("/assignments/:id/view", c.markViewed);

router.get("/assignments/:id/messages", c.listMessages);
router.post("/assignments/:id/messages", c.sendMessage);
router.post("/assignments/:id/ai/ask", c.askAi);

router.post("/assignments/:id/sign-token", c.createSignatureToken);
router.post("/assignments/:id/sign", c.sign);

router.get("/assignments/:id/signature", c.getSignature);
router.get("/assignments/:id/pdf", c.getPdf);

module.exports = router;

const router = require("express").Router();
const authJWT = require("../middlewares/authJWT");
const requireRole = require("../middlewares/requireRole");
const c = require("../controllers/adminAssignments.controller");

// Protegido: ADMIN
router.use(authJWT, requireRole("ADMIN"));

router.post("/assignments/precheck", c.precheck);
router.post("/assignments/request-profile-update", c.requestProfileUpdate);

router.post("/assignments", c.create);
router.get("/assignments", c.list);
router.get("/assignments/:id", c.getById);

router.get("/assignments/:id/messages", c.listMessages);
router.post("/assignments/:id/messages", c.sendMessage);
router.post("/assignments/:id/ai/ask", c.askAi);

router.patch("/assignments/:id/chat", c.setChatStatus);

router.post("/assignments/:id/approve", c.approve);
router.post("/assignments/:id/reject", c.reject);

router.get("/assignments/:id/pdf", c.getPdf);

module.exports = router;

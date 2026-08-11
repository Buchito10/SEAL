const router = require("express").Router();
const authJWT = require("../middlewares/authJWT");
const requireRole = require("../middlewares/requireRole");
const ctrl = require("../controllers/adminUsers.controller");
const systemStatusController = require("../controllers/systemStatus.controller");

// Solo ADMIN puede entrar
router.use(authJWT, requireRole("ADMIN"));

router.get("/system/status", systemStatusController.getSystemStatus);

router.post("/users", ctrl.createUser);
router.post("/users/:id/resend-invitation", ctrl.resendInvitation);
router.get("/users", ctrl.listUsers);
router.get("/users/:id", ctrl.getUser);
router.patch("/users/:id", ctrl.patchUser);
router.patch("/users/:id/disable", ctrl.disableUser);
router.delete("/users/:id", ctrl.deleteUser);

module.exports = router;

const router = require("express").Router();
const authJWT = require("../middlewares/authJWT");
const requireRole = require("../middlewares/requireRole");
const ctrl = require("../controllers/adminUsers.controller");

// Solo ADMIN puede entrar
router.use(authJWT, requireRole("ADMIN"));

router.post("/users", ctrl.createUser);
router.get("/users", ctrl.listUsers);
router.get("/users/:id", ctrl.getUser);
router.patch("/users/:id", ctrl.patchUser);
router.patch("/users/:id/disable", ctrl.disableUser);

module.exports = router;

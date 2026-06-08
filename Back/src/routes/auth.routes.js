const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const authJWT = require("../middlewares/authJWT");
const { login, changePassword } = require("../controllers/auth.controller");

// Rate limit para login (recomendado)
const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/login", loginLimiter, login);
router.post("/change-password", authJWT, changePassword);

module.exports = router;

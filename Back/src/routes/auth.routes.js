const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const authJWT = require("../middlewares/authJWT");
const { login, session, logout, changePassword } = require("../controllers/auth.controller");
const { LOGIN_RATE_LIMIT_MAX } = require("../config/env");

// Rate limit para login (recomendado)
const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: LOGIN_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/login", loginLimiter, login);
router.get("/session", authJWT, session);
router.post("/logout", logout);
router.post("/change-password", authJWT, changePassword);

module.exports = router;

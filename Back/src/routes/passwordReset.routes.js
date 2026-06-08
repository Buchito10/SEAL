const router = require("express").Router();

const {
    requestPasswordReset,
    verifyResetToken,
    confirmPasswordReset,
} = require("../controllers/passwordReset.controller");

// Público: valida que el correo exista y solicita enlace temporal.
router.post("/password/request", requestPasswordReset);

// PÚBLICO: verificar token
router.get("/password/verify", verifyResetToken);

// PÚBLICO: confirmar nueva contraseña
router.post("/password/confirm", confirmPasswordReset);

module.exports = router;

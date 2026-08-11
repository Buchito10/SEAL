const router = require("express").Router();

const {
    requestPasswordReset,
    verifyResetToken,
    confirmPasswordReset,
} = require("../controllers/passwordReset.controller");

// Público: solicita un enlace sin revelar si la cuenta existe.
router.post("/password/request", requestPasswordReset);

// PÚBLICO: verificar token
router.post("/password/verify", verifyResetToken);

// PÚBLICO: confirmar nueva contraseña
router.post("/password/confirm", confirmPasswordReset);

module.exports = router;

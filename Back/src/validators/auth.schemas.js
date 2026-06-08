const { z } = require("zod");

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
});

// ===== Fase 2: Password reset por token =====
const requestResetSchema = z.object({
    email: z.string().email(),
});

const confirmResetSchema = z.object({
    token: z.string().min(10),
    newPassword: z.string().min(8),
});

module.exports = { loginSchema, changePasswordSchema, requestResetSchema, confirmResetSchema };

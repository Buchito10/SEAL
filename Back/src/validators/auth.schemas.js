const { z } = require("zod");
const {
    PRIVACY_NOTICE_VERSION,
    DATA_PROTECTION_VERSION,
} = require("../config/privacy");

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
    acceptsPrivacyNotice: z.boolean().optional(),
    acceptsDataProtection: z.boolean().optional(),
    privacyNoticeVersion: z.literal(PRIVACY_NOTICE_VERSION).optional(),
    dataProtectionVersion: z.literal(DATA_PROTECTION_VERSION).optional(),
});

module.exports = {
    loginSchema,
    changePasswordSchema,
    requestResetSchema,
    confirmResetSchema,
};

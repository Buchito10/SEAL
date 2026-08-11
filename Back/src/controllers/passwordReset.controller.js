const { ok, fail } = require("../utils/response");
const usersService = require("../services/users.service");
const { hashPassword } = require("../utils/password");
const { requestResetSchema, confirmResetSchema } = require("../validators/auth.schemas");
const { FRONT_RESET_URL, PASSWORD_TOKEN_EXPIRES_MIN } = require("../config/env");
const {
    PRIVACY_NOTICE_VERSION,
    DATA_PROTECTION_VERSION,
} = require("../config/privacy");
const { buildPublicUrlWithToken } = require("../utils/publicUrl");

const passwordTokensService = require("../services/passwordTokens.service");
const { sendPasswordAccessEmail } = require("../services/email.service");

function hasCompletedProfile(user) {
    return Boolean(
        user?.rfc &&
        user?.curp &&
        user?.phone &&
        user?.address_line1 &&
        user?.address_city &&
        user?.address_state &&
        user?.address_zip &&
        user?.address_country
    );
}

function hasCurrentConsent(user) {
    const record = user?.consent_record;
    return Boolean(
        record?.privacy_notice?.accepted === true &&
        record?.privacy_notice?.version === PRIVACY_NOTICE_VERSION &&
        record?.data_protection_document?.accepted === true &&
        record?.data_protection_document?.version === DATA_PROTECTION_VERSION
    );
}

function isPurposeAllowedForUser(user, purpose) {
    if (purpose === passwordTokensService.PURPOSES.ACCOUNT_ACTIVATION) {
        return user.status === "PENDING_ACTIVATION" && user.must_change_password === true;
    }
    if (purpose === passwordTokensService.PURPOSES.PASSWORD_RESET) {
        return user.status === "ACTIVE";
    }
    return false;
}

// POST /auth/password/request
async function requestPasswordReset(req, res) {
    const parsed = requestResetSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const { email } = parsed.data;

    const user = await usersService.getByEmail(email);
    if (user?.status === "ACTIVE") {
        try {
            const { rawToken } = await passwordTokensService.createForUser(
                user.id,
                passwordTokensService.PURPOSES.PASSWORD_RESET
            );
            const link = buildPublicUrlWithToken(FRONT_RESET_URL, rawToken);

            await sendPasswordAccessEmail({
                to: user.email,
                name: user.name,
                link,
                expiresMinutes: PASSWORD_TOKEN_EXPIRES_MIN,
                purpose: passwordTokensService.PURPOSES.PASSWORD_RESET,
            });
        } catch (error) {
            // La respuesta publica debe ser indistinguible aunque falle SMTP.
            console.error("No se pudo generar o enviar el correo de recuperacion", error);
        }
    }

    // Respuesta uniforme para no revelar si un correo existe, está pendiente o fue deshabilitado.
    return ok(res, {
        message: "Si el correo corresponde a una cuenta activa, recibirás un enlace de recuperación.",
    });
}

// POST /auth/password/verify
async function verifyResetToken(req, res) {
    const token = String(req.body?.token || "").trim();
    if (!token) return fail(res, "Token required", 400);

    const tokenDoc = await passwordTokensService.getValidByRawToken(token);
    if (!tokenDoc) return fail(res, "Token invalid or expired", 400);

    const user = await usersService.getById(tokenDoc.data.user_id);
    if (!user || !isPurposeAllowedForUser(user, tokenDoc.data.purpose)) {
        return fail(res, "Token invalid or expired", 400);
    }

    const requiresConsent =
        tokenDoc.data.purpose === passwordTokensService.PURPOSES.ACCOUNT_ACTIVATION ||
        !hasCurrentConsent(user);

    return ok(res, {
        valid: true,
        purpose: tokenDoc.data.purpose,
        requires_consent: requiresConsent,
        legal_versions: {
            privacy_notice: PRIVACY_NOTICE_VERSION,
            data_protection: DATA_PROTECTION_VERSION,
        },
    });
}

// POST /auth/password/confirm
async function confirmPasswordReset(req, res) {
    const parsed = confirmResetSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const {
        token,
        newPassword,
        acceptsPrivacyNotice,
        acceptsDataProtection,
        privacyNoticeVersion,
        dataProtectionVersion,
    } = parsed.data;

    const tokenDoc = await passwordTokensService.getValidByRawToken(token);
    if (!tokenDoc) return fail(res, "Token invalid or expired", 400);

    const userId = tokenDoc.data.user_id;
    const user = await usersService.getById(userId);
    if (!user) return fail(res, "User not found", 404);
    if (!isPurposeAllowedForUser(user, tokenDoc.data.purpose)) {
        return fail(res, "Token invalid or expired", 400);
    }

    const requiresConsent =
        tokenDoc.data.purpose === passwordTokensService.PURPOSES.ACCOUNT_ACTIVATION ||
        !hasCurrentConsent(user);

    if (
        requiresConsent &&
        (
            acceptsPrivacyNotice !== true ||
            acceptsDataProtection !== true ||
            privacyNoticeVersion !== PRIVACY_NOTICE_VERSION ||
            dataProtectionVersion !== DATA_PROTECTION_VERSION
        )
    ) {
        return fail(res, "Debes aceptar las versiones vigentes de ambos documentos", 400);
    }

    const password_hash = await hashPassword(newPassword);
    const profile_completed = hasCompletedProfile(user);
    const now = new Date().toISOString();
    const updates = {
        password_hash,
        must_change_password: false,
        profile_completed,
    };

    if (tokenDoc.data.purpose === passwordTokensService.PURPOSES.ACCOUNT_ACTIVATION) {
        updates.status = "ACTIVE";
        updates.activated_at = now;
    }

    if (requiresConsent) {
        updates.consent_record = {
            source: tokenDoc.data.purpose === passwordTokensService.PURPOSES.ACCOUNT_ACTIVATION
                ? "account-activation"
                : "password-recovery-renewal",
            accepted_at: now,
            privacy_notice: {
                accepted: true,
                version: PRIVACY_NOTICE_VERSION,
            },
            data_protection_document: {
                accepted: true,
                version: DATA_PROTECTION_VERSION,
            },
        };
    }

    const consumed = await passwordTokensService.consumeWithUserUpdate(token, {
        userId,
        purpose: tokenDoc.data.purpose,
        userUpdates: updates,
    });
    if (!consumed) return fail(res, "Token invalid or expired", 400);

    return ok(res, {
        changed: true,
        activated: tokenDoc.data.purpose === passwordTokensService.PURPOSES.ACCOUNT_ACTIVATION,
        profile_completed,
    });
}

module.exports = { requestPasswordReset, verifyResetToken, confirmPasswordReset };

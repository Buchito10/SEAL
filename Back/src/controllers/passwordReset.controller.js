const { ok, fail } = require("../utils/response");
const usersService = require("../services/users.service");
const { hashPassword } = require("../utils/password");
const { requestResetSchema, confirmResetSchema } = require("../validators/auth.schemas");
const { FRONT_RESET_URL, PASSWORD_TOKEN_EXPIRES_MIN } = require("../config/env");
const { buildPublicUrlWithToken } = require("../utils/publicUrl");

const passwordTokensService = require("../services/passwordTokens.service");
const { sendPasswordResetEmail } = require("../services/email.service");

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

// POST /auth/password/request
async function requestPasswordReset(req, res) {
    const parsed = requestResetSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const { email } = parsed.data;

    const user = await usersService.getByEmail(email);
    if (!user) {
        return fail(res, "No existe una cuenta registrada con ese correo.", 404);
    }

    if (user.status !== "ACTIVE") {
        return fail(res, "User disabled", 403);
    }

    const { rawToken } = await passwordTokensService.createForUser(user.id);
    const link = buildPublicUrlWithToken(FRONT_RESET_URL, rawToken);

    await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        link,
        expiresMinutes: PASSWORD_TOKEN_EXPIRES_MIN,
    });

    return ok(res, { message: "Se envió un enlace de recuperación al correo registrado." });
}

// GET /auth/password/verify?token=...
async function verifyResetToken(req, res) {
    const token = String(req.query.token || "").trim();
    if (!token) return fail(res, "Token required", 400);

    const tokenDoc = await passwordTokensService.getValidByRawToken(token);
    if (!tokenDoc) return fail(res, "Token invalid or expired", 400);

    return ok(res, { valid: true });
}

// POST /auth/password/confirm
async function confirmPasswordReset(req, res) {
    const parsed = confirmResetSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const { token, newPassword } = parsed.data;

    const tokenDoc = await passwordTokensService.getValidByRawToken(token);
    if (!tokenDoc) return fail(res, "Token invalid or expired", 400);

    const userId = tokenDoc.data.user_id;
    const user = await usersService.getById(userId);
    if (!user) return fail(res, "User not found", 404);
    if (user.status !== "ACTIVE") return fail(res, "User disabled", 403);

    const password_hash = await hashPassword(newPassword);
    const profile_completed = hasCompletedProfile(user);

    await usersService.patch(userId, {
        password_hash,
        must_change_password: false,
        profile_completed,
    });

    await passwordTokensService.markUsed(tokenDoc.docRef);

    return ok(res, { changed: true, profile_completed });
}

module.exports = { requestPasswordReset, verifyResetToken, confirmPasswordReset };

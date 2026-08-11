const { ok, fail } = require("../utils/response");
const usersService = require("../services/users.service");
const { createUserSchema, patchUserSchema } = require("../validators/users.schemas");
const { hashPassword } = require("../utils/password");
const { FRONT_ACTIVATION_URL, PASSWORD_TOKEN_EXPIRES_MIN } = require("../config/env");
const { buildPublicUrlWithToken } = require("../utils/publicUrl");
const passwordTokensService = require("../services/passwordTokens.service");
const signatureTokensService = require("../services/signatureTokens.service");
const { sendPasswordAccessEmail } = require("../services/email.service");

// password temporal simple (en fases futuras lo mandas por correo)
function generateTempPassword() {
    // 12 chars: letras + números
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let out = "";
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

async function createUser(req, res) {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const { name, email, role, position } = parsed.data;
    const invitedAt = new Date().toISOString();

    const exists = await usersService.getByEmail(email);
    if (exists) return fail(res, "Email already exists", 409);

    // Creamos un password aleatorio (NO se entrega). El usuario establecerá el suyo vía link seguro.
    const tempPassword = generateTempPassword();
    const password_hash = await hashPassword(tempPassword);

    const created = await usersService.create({
        name,
        email,
        role,
        position: position || null,
        password_hash,
        must_change_password: true,
        status: "PENDING_ACTIVATION",
        last_login_at: null,
        invited_at: invitedAt,
        invited_by_user_id: req.user.userId,
        activated_at: null,
        consent_record: null,

        // Nuevos campos (incompletos al crear)
        rfc: null,
        curp: null,
        phone: null,

        address_line1: null,
        address_line2: null,
        address_city: null,
        address_state: null,
        address_zip: null,
        address_country: "MX",

        profile_completed: false,
    });

    // Generar token y mandar correo con link
    const { rawToken } = await passwordTokensService.createForUser(
        created.id,
        passwordTokensService.PURPOSES.ACCOUNT_ACTIVATION,
        req.user.userId
    );
    const link = buildPublicUrlWithToken(FRONT_ACTIVATION_URL, rawToken);
    const invitingAdmin = await usersService.getById(req.user.userId);
    let invitationSent = false;

    try {
        const mailResult = await sendPasswordAccessEmail({
            to: created.email,
            name: created.name,
            link,
            expiresMinutes: PASSWORD_TOKEN_EXPIRES_MIN,
            createdByName: invitingAdmin?.name,
            loginEmail: created.email,
            purpose: passwordTokensService.PURPOSES.ACCOUNT_ACTIVATION,
        });
        invitationSent = !mailResult?.skipped;
    } catch (error) {
        console.error("No se pudo enviar la invitación inicial:", error.message);
    }

    const payload = {
        user: {
            id: created.id,
            name: created.name,
            email: created.email,
            role: created.role,
            position: created.position,
            must_change_password: created.must_change_password,
            status: created.status,
            created_at: created.created_at,

            profile_completed: created.profile_completed,

            rfc: created.rfc ?? null,
            curp: created.curp ?? null,
            phone: created.phone ?? null,

            address_line1: created.address_line1 ?? null,
            address_line2: created.address_line2 ?? null,
            address_city: created.address_city ?? null,
            address_state: created.address_state ?? null,
            address_zip: created.address_zip ?? null,
            address_country: created.address_country ?? "MX",
        },
        invitationSent,
    };

    return ok(res, payload, 201);
}

async function listUsers(req, res) {
    const users = await usersService.list();
    // nunca regreses password_hash
    return ok(res, users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        position: u.position ?? null,
        must_change_password: u.must_change_password,
        status: u.status,
        created_at: u.created_at,
        updated_at: u.updated_at,
        last_login_at: u.last_login_at ?? null,

        profile_completed: u.profile_completed ?? false,

        rfc: u.rfc ?? null,
        curp: u.curp ?? null,
        phone: u.phone ?? null,

        address_line1: u.address_line1 ?? null,
        address_line2: u.address_line2 ?? null,
        address_city: u.address_city ?? null,
        address_state: u.address_state ?? null,
        address_zip: u.address_zip ?? null,
        address_country: u.address_country ?? "MX",
    })));
}

async function getUser(req, res) {
    const user = await usersService.getById(req.params.id);
    if (!user) return fail(res, "Not found", 404);

    return ok(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position ?? null,
        must_change_password: user.must_change_password,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at ?? null,

        profile_completed: user.profile_completed ?? false,

        rfc: user.rfc ?? null,
        curp: user.curp ?? null,
        phone: user.phone ?? null,

        address_line1: user.address_line1 ?? null,
        address_line2: user.address_line2 ?? null,
        address_city: user.address_city ?? null,
        address_state: user.address_state ?? null,
        address_zip: user.address_zip ?? null,
        address_country: user.address_country ?? "MX",
    });
}

async function patchUser(req, res) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "status")) {
        return fail(res, "El estado de la cuenta sólo puede cambiarse mediante su endpoint específico", 400);
    }

    const parsed = patchUserSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const id = req.params.id;
    const user = await usersService.getById(id);
    if (!user) return fail(res, "Not found", 404);

    const updated = await usersService.patch(id, parsed.data);

    return ok(res, {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        position: updated.position ?? null,
        must_change_password: updated.must_change_password,
        status: updated.status,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        last_login_at: updated.last_login_at ?? null,

        profile_completed: updated.profile_completed ?? false,

        rfc: updated.rfc ?? null,
        curp: updated.curp ?? null,
        phone: updated.phone ?? null,

        address_line1: updated.address_line1 ?? null,
        address_line2: updated.address_line2 ?? null,
        address_city: updated.address_city ?? null,
        address_state: updated.address_state ?? null,
        address_zip: updated.address_zip ?? null,
        address_country: updated.address_country ?? "MX",
    });
}

async function resendInvitation(req, res) {
    const user = await usersService.getById(req.params.id);
    if (!user) return fail(res, "Not found", 404);
    if (user.status !== "PENDING_ACTIVATION" || !user.must_change_password) {
        return fail(res, "La cuenta ya no tiene una activación pendiente", 409);
    }

    const { rawToken } = await passwordTokensService.createForUser(
        user.id,
        passwordTokensService.PURPOSES.ACCOUNT_ACTIVATION,
        req.user.userId
    );
    const link = buildPublicUrlWithToken(FRONT_ACTIVATION_URL, rawToken);
    const invitingAdmin = await usersService.getById(req.user.userId);
    const mailResult = await sendPasswordAccessEmail({
        to: user.email,
        name: user.name,
        link,
        expiresMinutes: PASSWORD_TOKEN_EXPIRES_MIN,
        createdByName: invitingAdmin?.name,
        loginEmail: user.email,
        purpose: passwordTokensService.PURPOSES.ACCOUNT_ACTIVATION,
    });

    return ok(res, {
        sent: !mailResult?.skipped,
        message: mailResult?.skipped
            ? "La invitación se generó, pero el correo SMTP no está configurado."
            : "La invitación fue reenviada.",
    });
}

async function disableUser(req, res) {
    const id = req.params.id;
    const user = await usersService.getById(id);
    if (!user) return fail(res, "Not found", 404);

    const updated = await usersService.patch(id, { status: "DISABLED" });
    await passwordTokensService.expireAllOpenTokensForUser(id);
    return ok(res, { id: updated.id, status: updated.status });
}

async function deleteUser(req, res) {
    const id = req.params.id;
    const user = await usersService.getById(id);
    if (!user) return fail(res, "Not found", 404);
    if (id === req.user.userId) {
        return fail(res, "No puedes eliminar tu propia cuenta", 409);
    }
    if (user.role !== "CLIENT") {
        return fail(res, "Sólo se pueden eliminar cuentas de clientes desde este endpoint", 409);
    }

    // Cierra cualquier sesión o activación concurrente antes de limpiar credenciales.
    await usersService.patch(id, { status: "DISABLED" });

    const [passwordTokensDeleted, signatureTokensDeleted] = await Promise.all([
        passwordTokensService.deleteAllForUser(id),
        signatureTokensService.deleteAllForClient(id),
    ]);
    await usersService.deleteById(id);

    return ok(res, {
        id,
        deleted: true,
        email_released: true,
        tokens_deleted: passwordTokensDeleted + signatureTokensDeleted,
        message: "Cliente eliminado. El correo puede utilizarse nuevamente.",
    });
}

module.exports = {
    createUser,
    listUsers,
    getUser,
    patchUser,
    disableUser,
    resendInvitation,
    deleteUser,
};

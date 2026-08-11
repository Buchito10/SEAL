const { ok, fail } = require("../utils/response");
const { loginSchema, changePasswordSchema } = require("../validators/auth.schemas");
const usersService = require("../services/users.service");
const { verifyPassword, hashPassword } = require("../utils/password");
const { signToken } = require("../utils/token");
const { setSessionCookie, clearSessionCookie } = require("../utils/sessionCookie");

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        must_change_password: Boolean(user.must_change_password),
        status: user.status,
        profile_completed: Boolean(user.profile_completed),
    };
}

async function login(req, res) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const { email, password } = parsed.data;
    const user = await usersService.getByEmail(email);
    if (!user) return fail(res, "Credenciales inválidas", 401);

    if (user.status !== "ACTIVE") return fail(res, "Usuario deshabilitado", 403);

    const match = await verifyPassword(password, user.password_hash);
    if (!match) return fail(res, "Credenciales inválidas", 401);

    await usersService.patch(user.id, { last_login_at: new Date().toISOString() });

    const token = signToken({ userId: user.id, role: user.role });
    setSessionCookie(res, token);

    return ok(res, {
        user: publicUser(user),
        needs_profile_completion: !Boolean(user.profile_completed),
    });
}

async function session(req, res) {
    const user = await usersService.getById(req.user.userId);
    if (!user) return fail(res, "Sesión no encontrada", 401);
    return ok(res, { user: publicUser(user) });
}

async function logout(req, res) {
    clearSessionCookie(res);
    return ok(res, { logged_out: true });
}

async function changePassword(req, res) {
    // requiere JWT (el userId sale del token)
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const { currentPassword, newPassword } = parsed.data;
    const userId = req.user.userId;

    const user = await usersService.getById(userId);
    if (!user) return fail(res, "Usuario no encontrado", 404);
    if (user.status !== "ACTIVE") return fail(res, "Usuario deshabilitado", 403);

    const match = await verifyPassword(currentPassword, user.password_hash);
    if (!match) return fail(res, "La contraseña actual es incorrecta", 401);

    const newHash = await hashPassword(newPassword);

    await usersService.patch(user.id, {
        password_hash: newHash,
        must_change_password: false,
    });

    return ok(res, { changed: true, user: publicUser({ ...user, must_change_password: false }) });
}

module.exports = { login, session, logout, changePassword };

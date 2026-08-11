const { verifyToken } = require("../utils/token");
const usersService = require("../services/users.service");
const { readCookie } = require("../utils/sessionCookie");

async function authJWT(req, res, next) {
    const header = req.headers.authorization || "";
    const [type, bearerToken] = header.split(" ");
    const cookieToken = readCookie(req.headers.cookie);
    const token = type === "Bearer" && bearerToken ? bearerToken : cookieToken;

    if (!token) {
        return res.status(401).json({ ok: false, message: "Sesión requerida" });
    }

    let payload;
    try {
        payload = verifyToken(token);
    } catch {
        return res.status(401).json({ ok: false, message: "Sesión inválida o expirada" });
    }

    if (!payload?.userId) {
        return res.status(401).json({ ok: false, message: "Sesión inválida o expirada" });
    }

    try {
        const user = await usersService.getById(payload.userId);
        if (!user || user.status !== "ACTIVE") {
            return res.status(401).json({ ok: false, message: "Sesión inválida o inactiva" });
        }

        // Firestore es la fuente vigente para permisos y estado, no el contenido histórico del JWT.
        req.user = {
            userId: user.id,
            role: user.role,
            status: user.status,
            name: user.name,
            email: user.email,
            must_change_password: Boolean(user.must_change_password),
        };

        const passwordChangeAllowed = req.originalUrl.startsWith("/auth/change-password") ||
            req.originalUrl.startsWith("/auth/session");
        if (req.user.must_change_password && !passwordChangeAllowed) {
            return res.status(428).json({
                ok: false,
                message: "Debes cambiar tu contraseña antes de continuar",
                code: "PASSWORD_CHANGE_REQUIRED",
            });
        }
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = authJWT;

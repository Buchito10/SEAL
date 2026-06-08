const { verifyToken } = require("../utils/token");

function authJWT(req, res, next) {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({ ok: false, message: "Missing Bearer token" });
    }

    try {
        const payload = verifyToken(token);
        req.user = payload; // { userId, role }
        return next();
    } catch {
        return res.status(401).json({ ok: false, message: "Invalid or expired token" });
    }
}

module.exports = authJWT;

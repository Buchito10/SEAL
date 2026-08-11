const {
    AUTH_COOKIE_NAME,
    AUTH_COOKIE_SECURE,
} = require("../config/env");

function readCookie(cookieHeader, name = AUTH_COOKIE_NAME) {
    const encodedName = encodeURIComponent(name);
    for (const part of String(cookieHeader || "").split(";")) {
        const [rawKey, ...rawValue] = part.trim().split("=");
        if (rawKey === encodedName) {
            try {
                return decodeURIComponent(rawValue.join("="));
            } catch {
                return rawValue.join("=");
            }
        }
    }
    return "";
}

function cookieOptions() {
    return {
        httpOnly: true,
        secure: AUTH_COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        priority: "high",
    };
}

function setSessionCookie(res, token) {
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
}

function clearSessionCookie(res) {
    res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
}

module.exports = {
    readCookie,
    cookieOptions,
    setSessionCookie,
    clearSessionCookie,
};

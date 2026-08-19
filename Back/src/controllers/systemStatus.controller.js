const { ok } = require("../utils/response");
const storageService = require("../services/storage.service");
const {
    NODE_ENV,
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    API_RATE_LIMIT_MAX,
    AUTH_COOKIE_SECURE,
} = require("../config/env");

async function getSystemStatus(req, res) {
    const storageMode = storageService.isLocalStorageMode() ? "local" : "firebase";

    return ok(res, {
        environment: NODE_ENV,
        storage: {
            mode: storageMode,
            persistent: true,
            external_backup_recommended: storageMode === "local",
        },
        ai: {
            configured: Boolean(
                String(OPENROUTER_API_KEY || "").trim()
            ),
            mode: OPENROUTER_API_KEY
                ? "openrouter"
                : "fallback",
            model: OPENROUTER_API_KEY
                ? OPENROUTER_MODEL
                : null,
        },
        security: {
            http_only_session_cookie: true,
            secure_cookie: AUTH_COOKIE_SECURE,
            api_rate_limit_per_minute: API_RATE_LIMIT_MAX,
        },
        checked_at: new Date().toISOString(),
    });
}

module.exports = { getSystemStatus };

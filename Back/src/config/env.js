function mustGet(name) {
    const v = process.env[name];
    if (!v || String(v).trim() === "") {
        throw new Error(`Missing required env var: ${name}`);
    }
    return v;
}

function getInt(name, def) {
    const v = process.env[name];
    if (v == null || String(v).trim() === "") return def;
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return n;
}

function getBool(name, def) {
    const v = process.env[name];
    if (v == null || String(v).trim() === "") return def;
    return ["1", "true", "yes", "y", "on"].includes(String(v).toLowerCase());
}

const PORT = getInt("PORT", 3001);
const NODE_ENV = process.env.NODE_ENV || "development";
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || `http://localhost:${PORT}`;
const TRUST_PROXY_HOPS = getInt("TRUST_PROXY_HOPS", 0);

const JWT_SECRET = mustGet("JWT_SECRET");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "seal_session";
const AUTH_COOKIE_SECURE = getBool("AUTH_COOKIE_SECURE", NODE_ENV === "production");
const API_RATE_LIMIT_MAX = getInt("API_RATE_LIMIT_MAX", 300);
const LOGIN_RATE_LIMIT_MAX = getInt("LOGIN_RATE_LIMIT_MAX", 10);

const FIREBASE_SERVICE_ACCOUNT = mustGet("FIREBASE_SERVICE_ACCOUNT");
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "";

const FRONT_RESET_URL = process.env.FRONT_RESET_URL || "http://localhost:3000/reset-password";
const FRONT_ACTIVATION_URL = process.env.FRONT_ACTIVATION_URL || "http://localhost:3000/activar-cuenta";
const FRONT_SIGN_URL = process.env.FRONT_SIGN_URL || "http://localhost:3000/firma-movil";
const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || [
    "http://localhost:3000",
    "https://localhost",
    new URL(FRONT_RESET_URL).origin,
].join(",");
const PASSWORD_TOKEN_EXPIRES_MIN = getInt("PASSWORD_TOKEN_EXPIRES_MIN", 30);
const TOKEN_PEPPER = mustGet("TOKEN_PEPPER");
const RETURN_RESET_TOKEN_IN_RESPONSE = getBool("RETURN_RESET_TOKEN_IN_RESPONSE", false);

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = getInt("SMTP_PORT", 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

// ===== Contracts module =====
const MAX_DOCX_MB = getInt("MAX_DOCX_MB", 15);
const EDIT_LOCK_TTL_MIN = getInt("EDIT_LOCK_TTL_MIN", 20);

// ahora opcional (por si no usas endpoint interno)
const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET || "";

// ===== Local cleanup job =====
const ENABLE_LOCAL_DRAFT_CLEANUP = getBool("ENABLE_LOCAL_DRAFT_CLEANUP", true);

// CRON default: diario 03:10 (min hour dom mon dow)
const DRAFT_CLEANUP_CRON = process.env.DRAFT_CLEANUP_CRON || "10 3 * * *";

// Timezone (tu contexto)
const APP_TZ = process.env.TZ || "America/Mexico_City";

// ===== Gemini (AI contract chats) =====
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_TEMPERATURE = Number(process.env.GEMINI_TEMPERATURE ?? "0.4");
const GEMINI_MAX_OUTPUT_TOKENS = getInt("GEMINI_MAX_OUTPUT_TOKENS", 4000);

module.exports = {
    PORT,
    NODE_ENV,
    PUBLIC_API_URL,
    TRUST_PROXY_HOPS,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    AUTH_COOKIE_NAME,
    AUTH_COOKIE_SECURE,
    CORS_ALLOWED_ORIGINS,
    API_RATE_LIMIT_MAX,
    LOGIN_RATE_LIMIT_MAX,

    FIREBASE_SERVICE_ACCOUNT,
    FIREBASE_STORAGE_BUCKET,

    FRONT_RESET_URL,
    FRONT_ACTIVATION_URL,
    FRONT_SIGN_URL,
    PASSWORD_TOKEN_EXPIRES_MIN,
    TOKEN_PEPPER,
    RETURN_RESET_TOKEN_IN_RESPONSE,

    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,

    MAX_DOCX_MB,
    EDIT_LOCK_TTL_MIN,

    INTERNAL_CRON_SECRET,

    ENABLE_LOCAL_DRAFT_CLEANUP,
    DRAFT_CLEANUP_CRON,
    APP_TZ,

    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_TEMPERATURE,
    GEMINI_MAX_OUTPUT_TOKENS,
};

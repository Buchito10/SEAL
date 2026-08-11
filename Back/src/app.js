const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const passwordResetRoutes = require("./routes/passwordReset.routes");
const adminRoutes = require("./routes/admin.routes");
const adminContractsRoutes = require("./routes/adminContracts.routes");
const adminAssignmentsRoutes = require("./routes/adminAssignments.routes");
const clientAssignmentsRoutes = require("./routes/clientAssignments.routes");
const adminAiChatsRoutes = require("./routes/adminAiChats.routes");
const mobileSignatureRoutes = require("./routes/mobileSignature.routes");
const storageService = require("./services/storage.service");
const storageDownloadController = require("./controllers/storageDownload.controller");
const {
    CORS_ALLOWED_ORIGINS,
    API_RATE_LIMIT_MAX,
} = require("./config/env");


const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Nginx es el unico salto de proxy en produccion. Esto permite que Express y
// express-rate-limit identifiquen la IP real enviada en X-Forwarded-For.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
    app.set("trust proxy", trustProxyHops);
}

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: API_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        message: "Demasiadas peticiones desde esta IP. Intenta de nuevo en un minuto.",
    },
});

app.use(helmet());
const allowedOrigins = new Set(
    String(CORS_ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
);
app.use(cors({
    credentials: true,
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(null, false);
    },
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(apiLimiter);

app.get("/health", (req, res) => res.json({ ok: true }));

if (storageService.isLocalStorageMode()) {
    app.get(/^\/storage\/(.+)$/, storageDownloadController.downloadLocalFile);
}

app.use("/auth", authRoutes);
app.use("/auth", passwordResetRoutes);

app.use("/admin", adminRoutes);
app.use("/admin/contracts", adminContractsRoutes);
app.use("/admin", adminAssignmentsRoutes);
app.use("/admin/ai-chats", adminAiChatsRoutes);
app.use("/client", clientAssignmentsRoutes);
app.use("/signatures", mobileSignatureRoutes);


app.use(errorHandler);

module.exports = app;

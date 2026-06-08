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


const errorHandler = require("./middlewares/errorHandler");

const app = express();

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        message: "Demasiadas peticiones desde esta IP. Intenta de nuevo en un minuto.",
    },
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(apiLimiter);

app.get("/health", (req, res) => res.json({ ok: true }));

if (storageService.isLocalStorageMode()) {
    app.use("/storage", express.static(storageService.LOCAL_STORAGE_ROOT));
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

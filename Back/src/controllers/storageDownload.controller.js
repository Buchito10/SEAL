const path = require("path");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const storageService = require("../services/storage.service");

const CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

async function downloadLocalFile(req, res, next) {
    try {
        if (!storageService.isLocalStorageMode()) return res.status(404).end();

        const storagePath = storageService.assertSafeStoragePath(decodeURIComponent(req.params[0] || ""));
        const payload = jwt.verify(String(req.query.token || ""), JWT_SECRET);
        if (payload?.purpose !== "storage-read" || payload.storage_path !== storagePath) {
            return res.status(403).json({ ok: false, message: "Enlace de archivo inválido" });
        }

        const buffer = await storageService.readBuffer(storagePath);
        res.setHeader("Content-Type", CONTENT_TYPES[path.extname(storagePath).toLowerCase()] || "application/octet-stream");
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("Content-Disposition", `inline; filename="${path.basename(storagePath).replace(/\"/g, "")}"`);
        return res.send(buffer);
    } catch (error) {
        if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
            return res.status(403).json({ ok: false, message: "El enlace del archivo expiró o no es válido" });
        }
        if (error?.code === "ENOENT") return res.status(404).end();
        return next(error);
    }
}

module.exports = { downloadLocalFile };

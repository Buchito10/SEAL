const crypto = require("crypto");

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function sha256Hex(input) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
    return crypto.createHash("sha256").update(buf).digest("hex");
}

module.exports = { escapeHtml, sha256Hex };

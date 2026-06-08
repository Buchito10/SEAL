const crypto = require("crypto");

function normalizeHtml(html) {
    const s = String(html || "");
    return s
        .replace(/<!--[\s\S]*?-->/g, "")   // quita comentarios HTML
        .replace(/\s+/g, " ")             // colapsa whitespace
        .trim();
}

function sha256(text) {
    return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function hashHtmlNormalized(html) {
    return sha256(normalizeHtml(html));
}

module.exports = { normalizeHtml, sha256, hashHtmlNormalized };
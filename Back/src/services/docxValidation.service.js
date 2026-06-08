const JSZip = require("jszip");

function ensureDocxBasics({ originalname, mimetype }) {
    const name = String(originalname || "").toLowerCase();
    if (!name.endsWith(".docx")) {
        const err = new Error("Only .docx files are allowed");
        err.code = 400;
        throw err;
    }
    if (name.endsWith(".docm")) {
        const err = new Error("Macro-enabled files (.docm) are not allowed");
        err.code = 400;
        throw err;
    }

    // mimetype típico de docx
    const okMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (mimetype && mimetype !== okMime) {
        const err = new Error("Invalid file type (mimetype)");
        err.code = 400;
        throw err;
    }
}

function ensureZipHeader(buffer) {
    // docx es zip, debe iniciar con 'PK'
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
        const err = new Error("Invalid file");
        err.code = 400;
        throw err;
    }
    const pk = buffer.slice(0, 2).toString("utf8");
    if (pk !== "PK") {
        const err = new Error("Invalid .docx (not a zip container)");
        err.code = 400;
        throw err;
    }
}

async function validateDocxOrThrow({ buffer, originalname, mimetype }) {
    ensureDocxBasics({ originalname, mimetype });
    ensureZipHeader(buffer);

    const zip = await JSZip.loadAsync(buffer);

    // Debe existir el documento principal
    const hasDocumentXml = Boolean(zip.file("word/document.xml"));
    if (!hasDocumentXml) {
        const err = new Error("Invalid .docx structure (missing word/document.xml)");
        err.code = 400;
        throw err;
    }

    // Si trae macros -> rechazar
    const hasMacro = Boolean(zip.file("word/vbaProject.bin"));
    if (hasMacro) {
        const err = new Error("Macro content detected; rejected");
        err.code = 400;
        throw err;
    }

    return true;
}

module.exports = { validateDocxOrThrow };
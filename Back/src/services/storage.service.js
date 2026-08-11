const fs = require("fs/promises");
const path = require("path");
const jwt = require("jsonwebtoken");
const { bucket } = require("../config/firebase");
const { FIREBASE_STORAGE_BUCKET, PUBLIC_API_URL, JWT_SECRET } = require("../config/env");

const LOCAL_STORAGE_ROOT = path.join(process.cwd(), ".local-storage");

function isLocalStorageMode() {
    return !FIREBASE_STORAGE_BUCKET || String(FIREBASE_STORAGE_BUCKET).trim() === "";
}

function assertSafeStoragePath(storagePath) {
    const normalized = path.posix.normalize(String(storagePath || "").replace(/\\/g, "/"));
    if (!normalized || normalized.startsWith("../") || normalized === ".." || path.isAbsolute(normalized)) {
        const err = new Error("Invalid storage path");
        err.code = 400;
        throw err;
    }
    return normalized;
}

function localPathFor(storagePath) {
    const safePath = assertSafeStoragePath(storagePath);
    return path.join(LOCAL_STORAGE_ROOT, ...safePath.split("/"));
}

function localUrlFor(storagePath, minutes) {
    const safePath = assertSafeStoragePath(storagePath);
    const encodedPath = safePath.split("/").map(encodeURIComponent).join("/");
    const token = jwt.sign(
        { purpose: "storage-read", storage_path: safePath },
        JWT_SECRET,
        { expiresIn: Math.max(1, Number(minutes || 10)) * 60 }
    );
    return `${PUBLIC_API_URL.replace(/\/$/, "")}/storage/${encodedPath}?token=${encodeURIComponent(token)}`;
}

async function uploadBuffer({ storagePath, buffer, contentType }) {
    if (isLocalStorageMode()) {
        const target = localPathFor(storagePath);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, buffer);
        console.log("[storage:local]", {
            storagePath,
            contentType: contentType || "application/octet-stream",
        });
        return { storage_path: assertSafeStoragePath(storagePath), local: true };
    }

    const b = bucket();
    const file = b.file(storagePath);

    await file.save(buffer, {
        metadata: {
            contentType: contentType || "application/octet-stream",
        },
        resumable: false,
    });

    return { storage_path: storagePath };
}

async function uploadDocxBuffer({ storagePath, buffer, contentType }) {
    return uploadBuffer({
        storagePath,
        buffer,
        contentType: contentType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
}

async function readBuffer(storagePath) {
    if (isLocalStorageMode()) {
        return fs.readFile(localPathFor(storagePath));
    }

    const b = bucket();
    const file = b.file(storagePath);
    const [buffer] = await file.download();
    return buffer;
}

async function getDataUrl(storagePath, contentType = "application/octet-stream") {
    const buffer = await readBuffer(storagePath);
    return `data:${contentType};base64,${buffer.toString("base64")}`;
}

// opcional: si algún día quieres descargar/preview
async function getSignedReadUrl(storagePath, minutes = 10) {
    if (isLocalStorageMode()) {
        await fs.access(localPathFor(storagePath));
        return localUrlFor(storagePath, minutes);
    }

    const b = bucket();
    const file = b.file(storagePath);

    const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + minutes * 60 * 1000,
    });

    return url;
}

module.exports = {
    uploadBuffer,
    uploadDocxBuffer,
    readBuffer,
    getDataUrl,
    getSignedReadUrl,
    isLocalStorageMode,
    LOCAL_STORAGE_ROOT,
    assertSafeStoragePath,
};

const crypto = require("crypto");
const { db } = require("../config/firebase");

function nowIso() {
    return new Date().toISOString();
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}

function tokenHash(rawToken) {
    return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}

function col() {
    return db().collection("signature_tokens");
}

async function createForAssignment({ assignment_id, client_id, created_by, expiresMinutes = 10 }) {
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const now = new Date();
    const doc = {
        token_hash: tokenHash(rawToken),
        assignment_id,
        client_id,
        created_by: created_by || client_id,
        purpose: "MOBILE_SIGNATURE",
        used: false,
        created_at: now.toISOString(),
        expires_at: addMinutes(now, expiresMinutes).toISOString(),
    };

    const ref = await col().add(doc);
    return {
        id: ref.id,
        rawToken,
        expires_at: doc.expires_at,
        expires_minutes: expiresMinutes,
    };
}

async function getValidByRawToken(rawToken) {
    const hash = tokenHash(rawToken);
    const snap = await col().where("token_hash", "==", hash).limit(1).get();
    if (snap.empty) return null;

    const docRef = snap.docs[0].ref;
    const data = snap.docs[0].data();
    if (data.used) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;

    return { id: snap.docs[0].id, docRef, data };
}

async function markUsed(docRef) {
    await docRef.update({
        used: true,
        used_at: nowIso(),
    });
}

module.exports = {
    createForAssignment,
    getValidByRawToken,
    markUsed,
};

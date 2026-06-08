const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { db } = require("../config/firebase");
const { TOKEN_PEPPER, PASSWORD_TOKEN_EXPIRES_MIN } = require("../config/env");

const COLLECTION = "password_tokens";

const col = () => db().collection(COLLECTION);

function generateRawToken() {
    // token URL-safe
    return crypto.randomBytes(32).toString("base64url");
}

function hashToken(rawToken) {
    return crypto.createHash("sha256").update(rawToken + TOKEN_PEPPER).digest("hex");
}

function minutesFromNow(min) {
    return new Date(Date.now() + min * 60 * 1000).toISOString();
}

async function expireOpenTokensForUser(userId) {
    const snap = await col().where("user_id", "==", userId).where("status", "==", "OPEN").get();
    if (snap.empty) return;

    const batch = db().batch();
    snap.docs.forEach((d) => {
        batch.update(d.ref, { status: "EXPIRED", updated_at: new Date().toISOString() });
    });
    await batch.commit();
}

async function createForUser(userId) {
    await expireOpenTokensForUser(userId);

    const rawToken = generateRawToken();
    const token_hash = hashToken(rawToken);
    const now = new Date().toISOString();
    const expires_at = minutesFromNow(PASSWORD_TOKEN_EXPIRES_MIN);

    const id = uuidv4();
    await col().doc(id).set({
        id,
        user_id: userId,
        token_hash,
        status: "OPEN",
        expires_at,
        used_at: null,
        created_at: now,
        updated_at: now,
    });

    return { rawToken, expires_at, id };
}

async function getValidByRawToken(rawToken) {
    const token_hash = hashToken(rawToken);
    const snap = await col().where("token_hash", "==", token_hash).where("status", "==", "OPEN").limit(1).get();
    if (snap.empty) return null;

    const doc = snap.docs[0];
    const data = doc.data();

    // Check expiry
    const expiresAtMs = new Date(data.expires_at).getTime();
    if (Number.isNaN(expiresAtMs) || Date.now() > expiresAtMs) {
        await doc.ref.update({ status: "EXPIRED", updated_at: new Date().toISOString() });
        return null;
    }

    return { docRef: doc.ref, data: { id: doc.id, ...data } };
}

async function markUsed(docRef) {
    const now = new Date().toISOString();
    await docRef.update({ status: "USED", used_at: now, updated_at: now });
}

module.exports = {
    createForUser,
    getValidByRawToken,
    markUsed,
};

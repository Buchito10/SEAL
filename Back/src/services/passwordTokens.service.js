const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { db } = require("../config/firebase");
const { TOKEN_PEPPER, PASSWORD_TOKEN_EXPIRES_MIN } = require("../config/env");

const COLLECTION = "password_tokens";
const PURPOSES = Object.freeze({
    ACCOUNT_ACTIVATION: "ACCOUNT_ACTIVATION",
    PASSWORD_RESET: "PASSWORD_RESET",
});

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

function assertPurpose(purpose) {
    if (!Object.values(PURPOSES).includes(purpose)) {
        throw new Error("Invalid password token purpose");
    }
}

async function expireOpenTokensForUser(userId, purpose) {
    assertPurpose(purpose);
    const snap = await col()
        .where("user_id", "==", userId)
        .where("status", "==", "OPEN")
        .get();
    if (snap.empty) return;

    const matchingDocs = snap.docs.filter((d) => d.data().purpose === purpose);
    if (matchingDocs.length === 0) return;

    const batch = db().batch();
    matchingDocs.forEach((d) => {
        batch.update(d.ref, { status: "EXPIRED", updated_at: new Date().toISOString() });
    });
    await batch.commit();
}

async function expireAllOpenTokensForUser(userId) {
    const snap = await col().where("user_id", "==", userId).where("status", "==", "OPEN").get();
    if (snap.empty) return;

    const batch = db().batch();
    snap.docs.forEach((doc) => {
        batch.update(doc.ref, { status: "EXPIRED", updated_at: new Date().toISOString() });
    });
    await batch.commit();
}

async function deleteAllForUser(userId) {
    let deleted = 0;

    while (true) {
        const snap = await col().where("user_id", "==", userId).limit(400).get();
        if (snap.empty) return deleted;

        const batch = db().batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        deleted += snap.size;
    }
}

async function createForUser(userId, purpose, issuedByUserId = null) {
    assertPurpose(purpose);
    await expireOpenTokensForUser(userId, purpose);

    const rawToken = generateRawToken();
    const token_hash = hashToken(rawToken);
    const now = new Date().toISOString();
    const expires_at = minutesFromNow(PASSWORD_TOKEN_EXPIRES_MIN);

    const id = uuidv4();
    await col().doc(id).set({
        id,
        user_id: userId,
        purpose,
        issued_by_user_id: issuedByUserId,
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

    // Los tokens anteriores a la separación activación/recuperación se invalidan.
    if (!Object.values(PURPOSES).includes(data.purpose)) {
        await doc.ref.update({ status: "EXPIRED", updated_at: new Date().toISOString() });
        return null;
    }

    // Check expiry
    const expiresAtMs = new Date(data.expires_at).getTime();
    if (Number.isNaN(expiresAtMs) || Date.now() > expiresAtMs) {
        await doc.ref.update({ status: "EXPIRED", updated_at: new Date().toISOString() });
        return null;
    }

    return { docRef: doc.ref, data: { id: doc.id, ...data } };
}

/**
 * Consume el token y actualiza al usuario en una sola transaccion.
 *
 * La consulta inicial solo localiza el documento por su hash. Dentro de la
 * transaccion se vuelven a comprobar estado, vigencia, proposito y usuario;
 * si dos solicitudes intentan confirmar el mismo token, Firestore reintenta
 * una de ellas y esta ya encontrara el token como USED.
 */
async function consumeWithUserUpdate(rawToken, { userId, purpose, userUpdates }) {
    assertPurpose(purpose);

    const token_hash = hashToken(rawToken);
    const snap = await col().where("token_hash", "==", token_hash).limit(1).get();
    if (snap.empty) return false;

    const tokenRef = snap.docs[0].ref;
    const userRef = db().collection("users").doc(userId);

    return db().runTransaction(async (transaction) => {
        const tokenDoc = await transaction.get(tokenRef);
        const userDoc = await transaction.get(userRef);
        if (!tokenDoc.exists || !userDoc.exists) return false;

        const token = tokenDoc.data();
        const user = userDoc.data();
        const expiresAtMs = new Date(token.expires_at).getTime();
        const tokenIsUsable =
            token.status === "OPEN" &&
            token.user_id === userId &&
            token.purpose === purpose &&
            !Number.isNaN(expiresAtMs) &&
            Date.now() <= expiresAtMs;
        if (!tokenIsUsable) return false;

        const purposeIsAllowed = purpose === PURPOSES.ACCOUNT_ACTIVATION
            ? user.status === "PENDING_ACTIVATION" && user.must_change_password === true
            : user.status === "ACTIVE";
        if (!purposeIsAllowed) return false;

        const now = new Date().toISOString();
        transaction.update(userRef, { ...userUpdates, updated_at: now });
        transaction.update(tokenRef, { status: "USED", used_at: now, updated_at: now });
        return true;
    });
}

module.exports = {
    PURPOSES,
    createForUser,
    expireOpenTokensForUser,
    expireAllOpenTokensForUser,
    deleteAllForUser,
    getValidByRawToken,
    consumeWithUserUpdate,
};

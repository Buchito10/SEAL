const { db } = require("../config/firebase");

function nowIso() {
    return new Date().toISOString();
}

function cryptoRandomId() {
    const crypto = require("crypto");
    if (crypto.randomUUID) return crypto.randomUUID();
    return crypto.randomBytes(16).toString("hex");
}

function isLockValid(lock) {
    if (!lock || !lock.expires_at) return false;
    return new Date(lock.expires_at).getTime() > Date.now();
}

/**
 * Crea un contrato BASE (v1) en la colección "contracts".
 * - base_template_html vive en este doc (contrato base).
 * - versions posteriores viven en "contracts_version".
 *
 * initial_commit_message es opcional (por defecto el texto original).
 */
async function createContract({
    created_by,
    created_by_name,
    title,
    area,
    position,
    base_template_html,
    initial_commit_message, // <-- NUEVO (opcional)
}) {
    const firestore = db();
    const id = cryptoRandomId();

    const commitMessage = initial_commit_message || "Subida inicial de contrato (base v1)";

    const doc = {
        id,
        status: "ACTIVE",

        // última versión (1 = base)
        current_version: 1,

        title,
        area,
        position,

        // inicial "por definir"
        duration: "por definir",
        legal_representative_name: "por definir",
        start_date: "por definir",
        end_date: "por definir",
        salary: "por definir",
        work_schedule: "por definir",

        // ===== BASE v1 (vive aquí) =====
        base_template_html: base_template_html || "",
        base_placeholders_used: [],
        base_commits: [
            {
                id: cryptoRandomId(),
                at: nowIso(),
                by: created_by,
                by_name: created_by_name,
                message: commitMessage,
            },
        ],
        base_last_commit_at: nowIso(),
        base_last_commit_by_name: created_by_name,
        base_last_commit_message: commitMessage,

        edit_lock: null,

        created_by,
        created_by_name,
        created_at: nowIso(),
        updated_at: nowIso(),
    };

    await firestore.collection("contracts").doc(id).set(doc);
    return doc;
}

async function listContracts() {
    const firestore = db();
    const snap = await firestore.collection("contracts").orderBy("created_at", "desc").get();
    return snap.docs.map((d) => d.data());
}

async function getContractById(contractId) {
    const firestore = db();
    const ref = firestore.collection("contracts").doc(contractId);
    const doc = await ref.get();
    if (!doc.exists) return null;
    return doc.data();
}

async function updateContract(contractId, updates) {
    const firestore = db();
    const ref = firestore.collection("contracts").doc(contractId);
    await ref.update({ ...updates, updated_at: nowIso() });
    const doc = await ref.get();
    return doc.data();
}

// ===== Lock helpers =====
async function acquireLock({ contractId, userId, userName, ttlMin }) {
    const firestore = db();
    const ref = firestore.collection("contracts").doc(contractId);

    const result = await firestore.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (!doc.exists) {
            const err = new Error("Contract not found");
            err.code = 404;
            throw err;
        }

        const data = doc.data();
        const lock = data.edit_lock;

        if (lock && isLockValid(lock) && lock.locked_by !== userId) {
            const err = new Error("Contract is locked");
            err.code = 409;
            err.details = { locked_by_name: lock.locked_by_name, expires_at: lock.expires_at };
            throw err;
        }

        const now = Date.now();
        const newLock = {
            locked_by: userId,
            locked_by_name: userName,
            locked_at: new Date(now).toISOString(),
            expires_at: new Date(now + ttlMin * 60 * 1000).toISOString(),
        };

        tx.update(ref, { edit_lock: newLock, updated_at: nowIso() });
        return newLock;
    });

    return result;
}

async function refreshLock({ contractId, userId, ttlMin }) {
    const firestore = db();
    const ref = firestore.collection("contracts").doc(contractId);

    const result = await firestore.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (!doc.exists) {
            const err = new Error("Contract not found");
            err.code = 404;
            throw err;
        }
        const data = doc.data();
        const lock = data.edit_lock;

        if (!lock || !isLockValid(lock)) {
            const err = new Error("No active lock");
            err.code = 409;
            throw err;
        }
        if (lock.locked_by !== userId) {
            const err = new Error("Lock owned by another user");
            err.code = 409;
            throw err;
        }

        const now = Date.now();
        const newLock = { ...lock, expires_at: new Date(now + ttlMin * 60 * 1000).toISOString() };

        tx.update(ref, { edit_lock: newLock, updated_at: nowIso() });
        return newLock;
    });

    return result;
}

async function releaseLock({ contractId, userId }) {
    const firestore = db();
    const ref = firestore.collection("contracts").doc(contractId);

    await firestore.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (!doc.exists) {
            const err = new Error("Contract not found");
            err.code = 404;
            throw err;
        }
        const data = doc.data();
        const lock = data.edit_lock;

        if (!lock) return;
        if (lock.locked_by !== userId && isLockValid(lock)) {
            const err = new Error("Lock owned by another user");
            err.code = 409;
            throw err;
        }

        tx.update(ref, { edit_lock: null, updated_at: nowIso() });
    });

    return true;
}

async function assertWritableByLock({ contractId, userId }) {
    const c = await getContractById(contractId);
    if (!c) {
        const err = new Error("Contract not found");
        err.code = 404;
        throw err;
    }

    const lock = c.edit_lock;
    if (!lock || !isLockValid(lock) || lock.locked_by !== userId) {
        const err = new Error("Contract is locked or lock missing");
        err.code = 423;
        err.details =
            lock && isLockValid(lock)
                ? { locked_by_name: lock.locked_by_name, expires_at: lock.expires_at }
                : {};
        throw err;
    }
    return true;
}

module.exports = {
    createContract,
    listContracts,
    getContractById,
    updateContract,

    acquireLock,
    refreshLock,
    releaseLock,
    assertWritableByLock,
};
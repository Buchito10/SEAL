const { db } = require("../config/firebase");

function nowIso() {
    return new Date().toISOString();
}

function randomId() {
    const crypto = require("crypto");
    return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

function versionsCol() {
    // OJO: nombre EXACTO como pediste
    return db().collection("contracts_version");
}

async function getVersionDoc(contractId, versionNumber) {
    const snap = await versionsCol()
        .where("contract_id", "==", contractId)
        .where("version", "==", versionNumber)
        .limit(1)
        .get();

    if (snap.empty) return null;
    return { id: snap.docs[0].id, data: snap.docs[0].data(), ref: snap.docs[0].ref };
}

async function listVersionsByContractId(contractId) {
    // Nota: evitamos orderBy para no requerir índice compuesto en Firestore.
    const snap = await versionsCol().where("contract_id", "==", contractId).get();
    const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    rows.sort((a, b) => Number(a.data.version || 0) - Number(b.data.version || 0));
    return rows;
}

async function createVersion({
    contract_id,
    version,
    template_html,
    created_by,
    created_by_name,
    commit_message,
    note,
    placeholders_used,
}) {
    const ref = versionsCol().doc();

    const commit = {
        id: randomId(),
        at: nowIso(),
        by: created_by,
        by_name: created_by_name,
        message: commit_message,
    };

    const doc = {
        id: ref.id,
        contract_id,
        version,

        template_html,
        placeholders_used: placeholders_used || [],

        commits: [commit],
        last_commit_at: commit.at,
        last_commit_by_name: commit.by_name,
        last_commit_message: commit.message,

        note: note || null,

        created_by,
        created_by_name,
        created_at: nowIso(),
        updated_at: nowIso(),
    };

    await ref.set(doc);
    return { id: ref.id, data: doc };
}

async function updateLatestVersionTemplate({
    contract_id,
    version,
    template_html,
    editor_by,
    editor_by_name,
    commit_message,
    placeholders_used,
}) {
    const v = await getVersionDoc(contract_id, version);
    if (!v) {
        const err = new Error("Version not found");
        err.code = 404;
        throw err;
    }

    const commit = {
        id: randomId(),
        at: nowIso(),
        by: editor_by,
        by_name: editor_by_name,
        message: commit_message,
    };

    const updates = {
        template_html,
        placeholders_used: placeholders_used || [],

        commits: [...(v.data.commits || []), commit],
        last_commit_at: commit.at,
        last_commit_by_name: commit.by_name,
        last_commit_message: commit.message,

        updated_at: nowIso(),
    };

    await v.ref.update(updates);
    const after = await v.ref.get();
    return after.data();
}

module.exports = {
    getVersionDoc,
    listVersionsByContractId,
    createVersion,
    updateLatestVersionTemplate,
};
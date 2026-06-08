const { db } = require("../config/firebase");

function nowIso() {
    return new Date().toISOString();
}

function addDaysIso(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

function draftsCol(contractId) {
    return db().collection("contracts").doc(contractId).collection("drafts");
}

async function createDraft({ contractId, based_on_version, template_html, created_by, created_by_name }) {
    const ref = draftsCol(contractId).doc();

    const doc = {
        based_on_version,
        template_html,
        expires_at: addDaysIso(15),

        created_by,
        created_by_name,
        created_at: nowIso(),
        updated_at: nowIso(),
    };

    await ref.set(doc);
    return { id: ref.id, data: doc };
}

async function getDraft(contractId, draftId) {
    const ref = draftsCol(contractId).doc(draftId);
    const doc = await ref.get();
    if (!doc.exists) return null;
    return { id: doc.id, data: doc.data(), ref };
}

async function deleteDraft(contractId, draftId) {
    await draftsCol(contractId).doc(draftId).delete();
    return true;
}

async function cleanupExpiredDrafts() {
    // collectionGroup para todas las subcolecciones "drafts"
    const firestore = db();
    const now = new Date().toISOString();

    let scanned = 0;
    let cleaned = 0;

    // Firestore limita batches; recorremos por lotes
    while (true) {
        const snap = await firestore
            .collectionGroup("drafts")
            .where("expires_at", "<=", now)
            .limit(200)
            .get();

        if (snap.empty) break;

        scanned += snap.size;

        const batch = firestore.batch();
        for (const doc of snap.docs) {
            batch.delete(doc.ref);
            cleaned += 1;
        }
        await batch.commit();
    }

    return { scanned, cleaned };
}

module.exports = {
    createDraft,
    getDraft,
    deleteDraft,
    cleanupExpiredDrafts,
};
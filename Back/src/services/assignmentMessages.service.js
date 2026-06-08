const { db } = require("../config/firebase");

function nowIso() {
    return new Date().toISOString();
}

function randomId() {
    const crypto = require("crypto");
    return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

function messagesCol(assignmentId) {
    return db().collection("assignments").doc(assignmentId).collection("messages");
}

async function listMessages({ assignment_id, limit = 100 }) {
    const snap = await messagesCol(assignment_id).orderBy("created_at", "asc").limit(limit).get();
    return snap.docs.map((d) => d.data());
}

async function createMessage({ assignment_id, sender_id, sender_role, sender_name, text }) {
    const ref = messagesCol(assignment_id).doc();
    const doc = {
        id: ref.id,
        assignment_id,
        sender_id,
        sender_role,
        sender_name: sender_name || null,
        text: String(text || "").trim(),
        created_at: nowIso(),
    };
    await ref.set(doc);
    return doc;
}

module.exports = { listMessages, createMessage };

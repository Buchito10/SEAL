const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

const col = () => db().collection("users");

async function getByEmail(email) {
    const snap = await col().where("email", "==", email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

async function getById(id) {
    const doc = await col().doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

async function list() {
    const snap = await col().orderBy("created_at", "desc").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function create(userData) {
    // id UUID en el modelo (puedes usar docId = uuid)
    const id = uuidv4();
    const now = new Date().toISOString();

    await col().doc(id).set({
        ...userData,
        id,
        created_at: now,
        updated_at: now,
    });

    return getById(id);
}

async function patch(id, updates) {
    const now = new Date().toISOString();
    await col().doc(id).update({ ...updates, updated_at: now });
    return getById(id);
}

module.exports = { getByEmail, getById, list, create, patch };

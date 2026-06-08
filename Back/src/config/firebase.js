const admin = require("firebase-admin");
const path = require("path");
const { FIREBASE_SERVICE_ACCOUNT, FIREBASE_STORAGE_BUCKET } = require("./env");

let initialized = false;

function initFirebase() {
    if (initialized) return;

    const absPath = path.isAbsolute(FIREBASE_SERVICE_ACCOUNT)
        ? FIREBASE_SERVICE_ACCOUNT
        : path.join(process.cwd(), FIREBASE_SERVICE_ACCOUNT);

    // eslint-disable-next-line import/no-dynamic-require
    const serviceAccount = require(absPath);

    const opts = {
        credential: admin.credential.cert(serviceAccount),
    };

    if (FIREBASE_STORAGE_BUCKET && String(FIREBASE_STORAGE_BUCKET).trim() !== "") {
        opts.storageBucket = FIREBASE_STORAGE_BUCKET;
    }

    admin.initializeApp(opts);
    initialized = true;
}

function db() {
    if (!initialized) initFirebase();
    return admin.firestore();
}

function bucket() {
    if (!initialized) initFirebase();
    return admin.storage().bucket();
}

module.exports = { initFirebase, db, bucket };
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const path = require("path");
const { FIREBASE_SERVICE_ACCOUNT, FIREBASE_STORAGE_BUCKET } = require("./env");

let initialized = false;
let firebaseApp = null;

function initFirebase() {
    if (initialized && firebaseApp) return firebaseApp;

    const absPath = path.isAbsolute(FIREBASE_SERVICE_ACCOUNT)
        ? FIREBASE_SERVICE_ACCOUNT
        : path.join(process.cwd(), FIREBASE_SERVICE_ACCOUNT);

    // eslint-disable-next-line import/no-dynamic-require
    const serviceAccount = require(absPath);

    const opts = {
        credential: cert(serviceAccount),
    };

    if (FIREBASE_STORAGE_BUCKET && String(FIREBASE_STORAGE_BUCKET).trim() !== "") {
        opts.storageBucket = FIREBASE_STORAGE_BUCKET;
    }

    firebaseApp = getApps()[0] || initializeApp(opts);
    initialized = true;
    return firebaseApp;
}

function db() {
    return getFirestore(initFirebase());
}

function bucket() {
    return getStorage(initFirebase()).bucket();
}
module.exports = { initFirebase, db, bucket };

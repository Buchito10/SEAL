const { db } = require("../config/firebase");
const storageService = require("./storage.service");
const { sha256Hex } = require("../utils/html");

function nowIso() {
    return new Date().toISOString();
}

function randomId() {
    const crypto = require("crypto");
    return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

function col() {
    return db().collection("assignments");
}

function assertCanViewAssignment({ assignment, userId, role }) {
    if (!assignment) {
        const err = new Error("Not found");
        err.code = 404;
        throw err;
    }
    if (role === "ADMIN") return;
    if (assignment.client_id !== userId) {
        const err = new Error("Forbidden");
        err.code = 403;
        throw err;
    }
}

async function signAssignment({
    assignment_id,
    client_id,
    client_name,
    signature_png_base64, // raw base64 or data URL
    signature_bbox, // {x,y,width,height,page?} - opcional, se guarda para auditar
    ip,
    user_agent,
}) {
    const ref = col().doc(assignment_id);

    const normalized = String(signature_png_base64 || "").trim();
    if (!normalized) {
        const err = new Error("Signature is required");
        err.code = 400;
        throw err;
    }

    const base64 = normalized.startsWith("data:")
        ? normalized.split(",")[1] || ""
        : normalized;

    let buf;
    try {
        buf = Buffer.from(base64, "base64");
    } catch {
        const err = new Error("Invalid signature encoding");
        err.code = 400;
        throw err;
    }

    // mínimo sanity check para PNG
    if (buf.length < 8 || buf.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
        const err = new Error("Signature must be a PNG image");
        err.code = 400;
        throw err;
    }

    const sigHash = sha256Hex(buf);

    await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            const err = new Error("Not found");
            err.code = 404;
            throw err;
        }
        const a = snap.data();

        if (a.client_id !== client_id) {
            const err = new Error("Forbidden");
            err.code = 403;
            throw err;
        }

        if (a.chat_status === "CLOSED") {
            const err = new Error("Chat is closed");
            err.code = 409;
            throw err;
        }

        if (a.status === "APPROVED") {
            const err = new Error("Already approved");
            err.code = 409;
            throw err;
        }
        if (a.status === "REJECTED") {
            const err = new Error("Assignment was rejected");
            err.code = 409;
            throw err;
        }

        if (a.status !== "ASSIGNED" && a.status !== "VIEWED") {
            const err = new Error("Invalid state to sign");
            err.code = 409;
            throw err;
        }

        // Guardamos el archivo FUERA de la transacción (Firestore no permite IO externo dentro)
        // En vez de subir aquí, hacemos un "pre-write" con un path determinístico y subimos después,
        // pero la transacción debe ser atómica en estado. Estrategia:
        // 1) validamos estado en transacción y marcamos "SIGNED_PENDING_UPLOAD"
        // 2) subimos a storage
        // 3) transacción final cambia a SIGNED con refs
        //
        // Para mantener cambios mínimos y consistentes, aquí haremos:
        // - Guardar metadata de firma y un flag "signature_pending_upload"
        // - El controlador hará upload antes de llamar a esta función. (Se implementa en controller)
        //
        // Si llegamos aquí, solo validación. El update real lo hará signAssignmentFinalize.
        return;
    });

    // no hacemos nada más aquí
    return { signature_hash: sigHash, signature_buffer: buf };
}

async function finalizeSignAssignment({
    assignment_id,
    client_id,
    client_name,
    signature_storage_path,
    signature_hash,
    signature_bbox,
    ip,
    user_agent,
}) {
    const ref = col().doc(assignment_id);
    await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            const err = new Error("Not found");
            err.code = 404;
            throw err;
        }
        const a = snap.data();

        if (a.client_id !== client_id) {
            const err = new Error("Forbidden");
            err.code = 403;
            throw err;
        }

        if (a.status !== "ASSIGNED" && a.status !== "VIEWED") {
            const err = new Error("Invalid state to sign");
            err.code = 409;
            throw err;
        }

        const ev = {
            id: randomId(),
            type: "SIGNED",
            at: nowIso(),
            by: client_id,
            by_name: client_name || null,
            meta: { signature_hash },
        };

        tx.update(ref, {
            status: "SIGNED",
            signature: {
                storage_path: signature_storage_path,
                hash: signature_hash,
                bbox: signature_bbox || null,
            },
            signed_at: nowIso(),
            signed_ip: ip || null,
            signed_user_agent: user_agent || null,
            events: [...(a.events || []), ev],
            updated_at: nowIso(),
        });
    });

    return (await ref.get()).data();
}

async function approveAssignment({
    assignment_id,
    admin_id,
    admin_name,
    pdf_storage_path,
    pdf_hash,
    pdf_renderer_version,
    ip,
    user_agent,
}) {
    const ref = col().doc(assignment_id);

    await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            const err = new Error("Not found");
            err.code = 404;
            throw err;
        }
        const a = snap.data();

        if (a.status !== "SIGNED") {
            const err = new Error("Assignment must be SIGNED before approval");
            err.code = 409;
            throw err;
        }

        if (a.approval?.status === "APPROVED") {
            const err = new Error("Already approved");
            err.code = 409;
            throw err;
        }

        const ev = {
            id: randomId(),
            type: "APPROVED",
            at: nowIso(),
            by: admin_id,
            by_name: admin_name || null,
            meta: { pdf_hash },
        };

        tx.update(ref, {
            status: "APPROVED",
            approval: {
                status: "APPROVED",
                at: nowIso(),
                by: admin_id,
                by_name: admin_name || null,
                ip: ip || null,
                user_agent: user_agent || null,
                pdf: {
                    storage_path: pdf_storage_path,
                    hash: pdf_hash,
                    renderer_version: pdf_renderer_version || null,
                },
            },
            events: [...(a.events || []), ev],
            updated_at: nowIso(),
        });
    });

    return (await ref.get()).data();
}

async function replaceApprovedPdf({
    assignment_id,
    pdf_storage_path,
    pdf_hash,
    pdf_renderer_version,
}) {
    const ref = col().doc(assignment_id);

    await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            const err = new Error("Not found");
            err.code = 404;
            throw err;
        }
        const a = snap.data();

        if (a.status !== "APPROVED" || a.approval?.status !== "APPROVED") {
            const err = new Error("Assignment must be APPROVED before replacing PDF");
            err.code = 409;
            throw err;
        }

        tx.update(ref, {
            "approval.pdf": {
                storage_path: pdf_storage_path,
                hash: pdf_hash,
                renderer_version: pdf_renderer_version || null,
            },
            updated_at: nowIso(),
        });
    });

    return (await ref.get()).data();
}

async function rejectAssignment({ assignment_id, admin_id, admin_name, reason }) {
    const ref = col().doc(assignment_id);

    await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            const err = new Error("Not found");
            err.code = 404;
            throw err;
        }
        const a = snap.data();

        if (a.status !== "SIGNED") {
            const err = new Error("Assignment must be SIGNED before rejection");
            err.code = 409;
            throw err;
        }

        const ev = {
            id: randomId(),
            type: "REJECTED",
            at: nowIso(),
            by: admin_id,
            by_name: admin_name || null,
            meta: { reason: reason || null },
        };

        tx.update(ref, {
            status: "REJECTED",
            approval: {
                status: "REJECTED",
                at: nowIso(),
                by: admin_id,
                by_name: admin_name || null,
                reason: reason || null,
            },
            events: [...(a.events || []), ev],
            updated_at: nowIso(),
        });
    });

    return (await ref.get()).data();
}

async function getPdfDownloadUrl({ assignment_id, requester_id, requester_role, minutes = 10 }) {
    const a = await col().doc(assignment_id).get();
    if (!a.exists) {
        const err = new Error("Not found");
        err.code = 404;
        throw err;
    }
    const assignment = a.data();
    assertCanViewAssignment({ assignment, userId: requester_id, role: requester_role });

    if (assignment.status !== "APPROVED" || !assignment.approval?.pdf?.storage_path) {
        const err = new Error("PDF not available");
        err.code = 409;
        throw err;
    }

    const url = await storageService.getSignedReadUrl(assignment.approval.pdf.storage_path, minutes);
    return { url, expires_minutes: minutes };
}

module.exports = {
    signAssignment,
    finalizeSignAssignment,
    approveAssignment,
    replaceApprovedPdf,
    rejectAssignment,
    getPdfDownloadUrl,
    assertCanViewAssignment,
};

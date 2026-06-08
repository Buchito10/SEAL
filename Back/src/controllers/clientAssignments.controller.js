const { ok, fail } = require("../utils/response");
const assignmentsService = require("../services/assignments.service");
const assignmentMessagesService = require("../services/assignmentMessages.service");
const workflowService = require("../services/assignmentWorkflow.service");
const storageService = require("../services/storage.service");
const pdfService = require("../services/pdf.service");
const signatureTokensService = require("../services/signatureTokens.service");
const contractAssistantService = require("../services/contractAssistant.service");
const { SignSchema, SendMessageSchema, AiAskSchema } = require("../validators/assignments.schemas");
const { FRONT_SIGN_URL } = require("../config/env");

function getReqMeta(req) {
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    const user_agent = req.headers["user-agent"] || null;
    return { ip, user_agent };
}

async function generateFinalPdfForAssignment(assignment) {
    const signatureDataUrl = assignment.signature?.storage_path
        ? await storageService.getDataUrl(assignment.signature.storage_path, "image/png")
        : null;

    const signedHtml = pdfService.buildSignedHtml({
        baseHtml: assignment.resolved_html_snapshot || "",
        signatureUrl: signatureDataUrl,
        assignment,
    });

    const { buffer, hash } = await pdfService.htmlToPdfBuffer({ html: signedHtml });

    const storagePath = `pdf/assignments/${assignment.id}/final.pdf`;
    await storageService.uploadBuffer({
        storagePath,
        buffer,
        contentType: "application/pdf",
    });

    return { storagePath, hash };
}

async function list(req, res) {
    try {
        const { status, limit } = req.query;
        const rows = await assignmentsService.listAssignmentsForClient({
            client_id: req.user.userId,
            status: status || null,
            limit: limit ? Number(limit) : 50,
        });
        return ok(res, rows);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function getById(req, res) {
    try {
        const a = await assignmentsService.getAssignmentById(req.params.id);
        workflowService.assertCanViewAssignment({
            assignment: a,
            userId: req.user.userId,
            role: "CLIENT",
        });
        return ok(res, a);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function markViewed(req, res) {
    try {
        const updated = await assignmentsService.markViewed({
            assignment_id: req.params.id,
            viewer_id: req.user.userId,
            viewer_name: req.user.name || null,
        });
        return ok(res, updated);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function listMessages(req, res) {
    try {
        const a = await assignmentsService.getAssignmentById(req.params.id);
        workflowService.assertCanViewAssignment({
            assignment: a,
            userId: req.user.userId,
            role: "CLIENT",
        });

        const rows = await assignmentMessagesService.listMessages({ assignment_id: req.params.id });
        return ok(res, rows);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function sendMessage(req, res) {
    const parsed = SendMessageSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    try {
        const a = await assignmentsService.getAssignmentById(req.params.id);
        workflowService.assertCanViewAssignment({
            assignment: a,
            userId: req.user.userId,
            role: "CLIENT",
        });

        if (a.chat_status === "CLOSED") return fail(res, "Chat is closed", 409);

        const msg = await assignmentMessagesService.createMessage({
            assignment_id: req.params.id,
            sender_id: req.user.userId,
            sender_role: "CLIENT",
            sender_name: req.user.name || null,
            text: parsed.data.text,
        });

        return ok(res, msg, 201);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function askAi(req, res) {
    const parsed = AiAskSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    try {
        const a = await assignmentsService.getAssignmentById(req.params.id);
        workflowService.assertCanViewAssignment({
            assignment: a,
            userId: req.user.userId,
            role: "CLIENT",
        });

        const data = await contractAssistantService.askAboutAssignment({
            assignment: a,
            question: parsed.data.question,
            role: "CLIENT",
        });
        return ok(res, data);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function sign(req, res) {
    const parsed = SignSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const { ip, user_agent } = getReqMeta(req);

    try {
        // 1) validar estado y obtener buffer/hash
        const { signature_hash, signature_buffer } = await workflowService.signAssignment({
            assignment_id: req.params.id,
            client_id: req.user.userId,
            client_name: req.user.name || null,
            signature_png_base64: parsed.data.signature_png_base64,
            signature_bbox: parsed.data.signature_bbox || null,
            ip,
            user_agent,
        });

        // 2) subir firma a Storage
        const storagePath = `signatures/assignments/${req.params.id}/${req.user.userId}/${Date.now()}.png`;
        await storageService.uploadBuffer({
            storagePath,
            buffer: signature_buffer,
            contentType: "image/png",
        });

        // 3) finalizar firma (transacción)
        const updated = await workflowService.finalizeSignAssignment({
            assignment_id: req.params.id,
            client_id: req.user.userId,
            client_name: req.user.name || null,
            signature_storage_path: storagePath,
            signature_hash,
            signature_bbox: parsed.data.signature_bbox || null,
            ip,
            user_agent,
        });

        return ok(res, updated);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function createSignatureToken(req, res) {
    try {
        const a = await assignmentsService.getAssignmentById(req.params.id);
        workflowService.assertCanViewAssignment({
            assignment: a,
            userId: req.user.userId,
            role: "CLIENT",
        });

        if (a.chat_status === "CLOSED") return fail(res, "Chat is closed", 409);
        if (a.status !== "ASSIGNED" && a.status !== "VIEWED") {
            return fail(res, "Invalid state to sign", 409);
        }

        const token = await signatureTokensService.createForAssignment({
            assignment_id: req.params.id,
            client_id: req.user.userId,
            created_by: req.user.userId,
            expiresMinutes: 10,
        });

        const link = `${FRONT_SIGN_URL}?token=${encodeURIComponent(token.rawToken)}`;
        return ok(res, {
            link,
            token: token.rawToken,
            expires_at: token.expires_at,
            expires_minutes: token.expires_minutes,
        }, 201);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function getPdf(req, res) {
    try {
        let assignment = await assignmentsService.getAssignmentById(req.params.id);
        workflowService.assertCanViewAssignment({
            assignment,
            userId: req.user.userId,
            role: "CLIENT",
        });

        if (
            assignment.status === "APPROVED" &&
            assignment.approval?.pdf?.storage_path &&
            assignment.approval?.pdf?.renderer_version !== pdfService.PDF_RENDERER_VERSION
        ) {
            const { storagePath, hash } = await generateFinalPdfForAssignment(assignment);
            assignment = await workflowService.replaceApprovedPdf({
                assignment_id: assignment.id,
                pdf_storage_path: storagePath,
                pdf_hash: hash,
                pdf_renderer_version: pdfService.PDF_RENDERER_VERSION,
            });
        }

        const data = await workflowService.getPdfDownloadUrl({
            assignment_id: req.params.id,
            requester_id: req.user.userId,
            requester_role: "CLIENT",
            minutes: 10,
        });
        return ok(res, data);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function getSignature(req, res) {
    try {
        const a = await assignmentsService.getAssignmentById(req.params.id);
        workflowService.assertCanViewAssignment({
            assignment: a,
            userId: req.user.userId,
            role: "CLIENT",
        });

        if (!a.signature?.storage_path) {
            return fail(res, "Signature not available", 409);
        }

        const url = await storageService.getDataUrl(a.signature.storage_path, "image/png");

        return ok(res, {
            url,
            expires_minutes: null,
        });
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

module.exports = {
    list,
    getById,
    markViewed,
    listMessages,
    sendMessage,
    askAi,
    sign,
    createSignatureToken,
    getPdf,
    getSignature,
};

const { ok, fail } = require("../utils/response");
const assignmentsService = require("../services/assignments.service");
const assignmentMessagesService = require("../services/assignmentMessages.service");
const workflowService = require("../services/assignmentWorkflow.service");
const pdfService = require("../services/pdf.service");
const storageService = require("../services/storage.service");
const usersService = require("../services/users.service");
const emailService = require("../services/email.service");
const contractAssistantService = require("../services/contractAssistant.service");
const {
    PrecheckSchema,
    CreateAssignmentSchema,
    SendMessageSchema,
    AiAskSchema,
    SetChatStatusSchema,
    RejectSchema,
} = require("../validators/assignments.schemas");

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

async function precheck(req, res) {
    const parsed = PrecheckSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    try {
        const data = await assignmentsService.precheckAssignment(parsed.data);
        return ok(res, data);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function requestProfileUpdate(req, res) {
    const parsed = PrecheckSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    try {
        const data = await assignmentsService.precheckAssignment(parsed.data);
        if ((data.missing_employee_placeholders || []).length === 0) {
            return ok(res, { message: "No missing employee placeholders" });
        }

        const user = await usersService.getById(parsed.data.client_id);
        if (!user) return fail(res, "Client not found", 404);

        await emailService.sendProfileUpdateRequestEmail({
            to: user.email,
            name: user.name || "",
        });

        return ok(res, {
            message: "Profile update requested",
            missing_employee_placeholders: data.missing_employee_placeholders,
        });
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function create(req, res) {
    const parsed = CreateAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const userId = req.user.userId;
    const userName = req.user.name || req.user.userName || "ADMIN";

    try {
        const assignment = await assignmentsService.createAssignment({
            created_by: userId,
            created_by_name: userName,
            client_id: parsed.data.client_id,
            contract_id: parsed.data.contract_id,
            contract_version: parsed.data.contract_version,
            initial_message: parsed.data.initial_message || "Te comparto el contrato para que lo revises y lo firmes.",
            company_values: parsed.data.company_values || {},
        });

        // Notificación por correo al cliente (informativa)
        if (assignment.client_email) {
            await emailService.sendAssignmentNotificationEmail({
                to: assignment.client_email,
                name: assignment.client_name || "",
            });
        }

        return ok(res, assignment, 201);
    } catch (e) {
        // Caso especial: perfil incompleto -> no se crea asignación
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function list(req, res) {
    try {
        const { status, chat_status, limit } = req.query;
        const rows = await assignmentsService.listAssignmentsForAdmin({
            status: status || null,
            chat_status: chat_status || null,
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
        if (!a) return fail(res, "Not found", 404);
        return ok(res, a);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function listMessages(req, res) {
    try {
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
        if (!a) return fail(res, "Not found", 404);
        if (a.chat_status === "CLOSED") return fail(res, "Chat is closed", 409);

        const msg = await assignmentMessagesService.createMessage({
            assignment_id: req.params.id,
            sender_id: req.user.userId,
            sender_role: "ADMIN",
            sender_name: req.user.name || req.user.userName || "ADMIN",
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
        if (!a) return fail(res, "Not found", 404);

        const data = await contractAssistantService.askAboutAssignment({
            assignment: a,
            question: parsed.data.question,
            role: "ADMIN",
        });
        return ok(res, data);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function setChatStatus(req, res) {
    const parsed = SetChatStatusSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    try {
        const updated = await assignmentsService.setChatStatus({
            assignment_id: req.params.id,
            status: parsed.data.status,
            by_id: req.user.userId,
            by_name: req.user.name || req.user.userName || "ADMIN",
        });
        return ok(res, updated);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function approve(req, res) {
    try {
        const assignment = await assignmentsService.getAssignmentById(req.params.id);
        if (!assignment) return fail(res, "Not found", 404);
        if (assignment.status !== "SIGNED") return fail(res, "Assignment must be SIGNED before approval", 409);

        const { storagePath, hash } = await generateFinalPdfForAssignment(assignment);

        const { ip, user_agent } = getReqMeta(req);

        const updated = await workflowService.approveAssignment({
            assignment_id: assignment.id,
            admin_id: req.user.userId,
            admin_name: req.user.name || req.user.userName || "ADMIN",
            pdf_storage_path: storagePath,
            pdf_hash: hash,
            pdf_renderer_version: pdfService.PDF_RENDERER_VERSION,
            ip,
            user_agent,
        });

        // notificar al cliente
        if (updated.client_email) {
            await emailService.sendApprovedNotificationEmail({
                to: updated.client_email,
                name: updated.client_name || "",
            });
        }

        return ok(res, updated);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function reject(req, res) {
    const parsed = RejectSchema.safeParse(req.body || {});
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    try {
        const updated = await workflowService.rejectAssignment({
            assignment_id: req.params.id,
            admin_id: req.user.userId,
            admin_name: req.user.name || req.user.userName || "ADMIN",
            reason: parsed.data.reason || null,
        });
        return ok(res, updated);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function getPdf(req, res) {
    try {
        let assignment = await assignmentsService.getAssignmentById(req.params.id);
        if (!assignment) return fail(res, "Not found", 404);

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
            requester_role: "ADMIN",
            minutes: 10,
        });
        return ok(res, data);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

module.exports = {
    precheck,
    requestProfileUpdate,
    create,
    list,
    getById,
    listMessages,
    sendMessage,
    askAi,
    setChatStatus,
    approve,
    reject,
    getPdf,
};

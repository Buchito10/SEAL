const { z } = require("zod");
const { ok, fail } = require("../utils/response");
const assignmentsService = require("../services/assignments.service");
const workflowService = require("../services/assignmentWorkflow.service");
const storageService = require("../services/storage.service");
const signatureTokensService = require("../services/signatureTokens.service");
const { SignSchema } = require("../validators/assignments.schemas");

const TokenSchema = z.object({
    token: z.string().min(20),
});

const MobileSignSchema = SignSchema.extend({
    token: z.string().min(20),
});

function getReqMeta(req) {
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    const user_agent = req.headers["user-agent"] || null;
    return { ip, user_agent };
}

async function loadTokenAssignment(rawToken) {
    const tokenDoc = await signatureTokensService.getValidByRawToken(rawToken);
    if (!tokenDoc) {
        const err = new Error("Token invalid or expired");
        err.code = 400;
        throw err;
    }

    const assignment = await assignmentsService.getAssignmentById(tokenDoc.data.assignment_id);
    if (!assignment) {
        const err = new Error("Assignment not found");
        err.code = 404;
        throw err;
    }

    if (assignment.client_id !== tokenDoc.data.client_id) {
        const err = new Error("Token does not match assignment");
        err.code = 403;
        throw err;
    }

    return { tokenDoc, assignment };
}

async function verify(req, res) {
    const parsed = TokenSchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid token", 400, parsed.error.flatten());

    try {
        const { tokenDoc, assignment } = await loadTokenAssignment(parsed.data.token);
        return ok(res, {
            assignment_id: assignment.id,
            contract_title: assignment.contract_title || "Contrato",
            client_name: assignment.client_name || null,
            status: assignment.status,
            chat_status: assignment.chat_status,
            expires_at: tokenDoc.data.expires_at,
        });
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function sign(req, res) {
    const parsed = MobileSignSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const { ip, user_agent } = getReqMeta(req);

    try {
        const { tokenDoc, assignment } = await loadTokenAssignment(parsed.data.token);

        const { signature_hash, signature_buffer } = await workflowService.signAssignment({
            assignment_id: assignment.id,
            client_id: tokenDoc.data.client_id,
            client_name: assignment.client_name || null,
            signature_png_base64: parsed.data.signature_png_base64,
            signature_bbox: parsed.data.signature_bbox || null,
            ip,
            user_agent,
        });

        const storagePath = `signatures/assignments/${assignment.id}/${tokenDoc.data.client_id}/${Date.now()}.png`;
        await storageService.uploadBuffer({
            storagePath,
            buffer: signature_buffer,
            contentType: "image/png",
        });

        const updated = await workflowService.finalizeSignAssignment({
            assignment_id: assignment.id,
            client_id: tokenDoc.data.client_id,
            client_name: assignment.client_name || null,
            signature_storage_path: storagePath,
            signature_hash,
            signature_bbox: parsed.data.signature_bbox || null,
            ip,
            user_agent,
        });

        await signatureTokensService.markUsed(tokenDoc.docRef);
        return ok(res, updated);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

module.exports = {
    verify,
    sign,
};

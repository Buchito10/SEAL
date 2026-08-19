const { ok, fail } = require("../utils/response");

const {
    createChatSchema,
    sendMessageSchema,
    humanEditSchema,
    publishToContractSchema,
} = require("../validators/aiChats.schemas");

const aiChatsService = require("../services/aiChats.service");

async function createChat(req, res) {
    try {
        const parsed = createChatSchema.parse(req.body || {});
        const doc = await aiChatsService.createChat({
            created_by: req.user.userId,
            created_by_name: req.user.name || "ADMIN",
            ...parsed,
        });
        return ok(res, doc, 201);
    } catch (e) {
        if (e?.name === "ZodError") return fail(res, "Invalid body", 400, e.issues);
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function listChats(req, res) {
    try {
        const docs = await aiChatsService.listChats({ created_by: req.user.userId });
        return ok(res, docs);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function getChat(req, res) {
    try {
        const chat = await aiChatsService.getChat(req.params.id);
        if (chat.created_by !== req.user.userId) return fail(res, "Forbidden", 403);
        return ok(res, chat);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function deleteChat(req, res) {
    try {
        await aiChatsService.softDeleteChat(req.params.id, req.user.userId);
        return ok(res, { deleted: true });
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function listMessages(req, res) {
    try {
        const msgs = await aiChatsService.listMessages(req.params.id, req.user.userId);
        return ok(res, msgs);
    } catch (e) {
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function sendMessage(req, res) {
    try {
        const parsed = sendMessageSchema.parse(req.body || {});
        const out = await aiChatsService.addMessageAndGenerate({
            chatId: req.params.id,
            userId: req.user.userId,
            userName: req.user.name || "ADMIN",

            // Este sí se guarda como mensaje del usuario.
            text: parsed.text,

            // Esta plantilla solamente sirve como contexto.
            baseTemplateHtml:
                parsed.base_template_html || null,
        });
        return ok(res, out, 201);
    } catch (e) {
        if (e?.name === "ZodError") return fail(res, "Invalid body", 400, e.issues);
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function humanEditTemplate(req, res) {
    try {
        const parsed = humanEditSchema.parse(req.body || {});
        await aiChatsService.setHumanEditedTemplate({
            chatId: req.params.id,
            userId: req.user.userId,
            userName: req.user.name || "ADMIN",
            ...parsed,
        });
        return ok(res, { saved: true });
    } catch (e) {
        if (e?.name === "ZodError") return fail(res, "Invalid body", 400, e.issues);
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

async function publishToContract(req, res) {
    try {
        const parsed = publishToContractSchema.parse(req.body || {});
        const contract = await aiChatsService.publishToContracts({
            chatId: req.params.id,
            userId: req.user.userId,
            userName: req.user.name || "ADMIN",
            ...parsed,
        });
        return ok(res, contract, 201);
    } catch (e) {
        if (e?.name === "ZodError") return fail(res, "Invalid body", 400, e.issues);
        return fail(res, e.message || "Error", e.code || 500, e.details);
    }
}

module.exports = {
    createChat,
    listChats,
    getChat,
    deleteChat,
    listMessages,
    sendMessage,
    humanEditTemplate,
    publishToContract,
};
const { db } = require("../config/firebase");
const { hashHtmlNormalized } = require("../utils/hashHtml");
const { validatePlaceholdersOrThrow } = require("../utils/placeholders");

const {
    OPENROUTER_MODEL,
} = require("../config/env");

const {
    generateContractTemplate,
    DISCLAIMER,
} = require("./openrouter.service");

const contractsService = require("./contracts.service");


function nowIso() {
    return new Date().toISOString();
}


function cryptoRandomId() {
    const crypto = require("crypto");

    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return crypto.randomBytes(16).toString("hex");
}


function chatsCol(firestore) {
    return firestore.collection("ai_contract_chats");
}


function messagesCol(firestore, chatId) {
    return chatsCol(firestore)
        .doc(chatId)
        .collection("messages");
}


/**
 * Crea un nuevo chat de generación de plantillas con IA.
 */
async function createChat({
    created_by,
    created_by_name,
    title_hint,
    area,
    position,
    jurisdiction,
    language,
}) {
    const firestore = db();
    const id = cryptoRandomId();

    const doc = {
        id,

        status: "ACTIVE",

        created_by,
        created_by_name,

        created_at: nowIso(),
        updated_at: nowIso(),

        title_hint: title_hint || null,
        area: area || null,
        position: position || null,

        jurisdiction: jurisdiction || "MX",
        language: language || "es-MX",

        // Modelo configurado inicialmente.
        // Si OpenRouter utiliza otro modelo internamente,
        // este valor se actualizará después de generar.
        model: OPENROUTER_MODEL,

        ai_last_template_html: null,
        ai_last_template_hash: null,
        ai_last_generated_at: null,

        human_edit: {
            edited: false,
            edited_at: null,
            edited_by: null,
            edited_by_name: null,
            edit_note: null,
            edited_template_html: null,
            edited_template_hash: null,
        },

        disclaimer_text: DISCLAIMER,
    };

    await chatsCol(firestore)
        .doc(id)
        .set(doc);

    return doc;
}


/**
 * Lista los chats activos creados por un usuario.
 */
async function listChats({ created_by }) {
    const firestore = db();

    const snap = await chatsCol(firestore)
        .where("status", "==", "ACTIVE")
        .where("created_by", "==", created_by)
        .orderBy("updated_at", "desc")
        .limit(50)
        .get();

    return snap.docs.map((d) => d.data());
}


/**
 * Obtiene un chat por ID.
 */
async function getChat(chatId) {
    const firestore = db();

    const ref = chatsCol(firestore).doc(chatId);
    const doc = await ref.get();

    if (!doc.exists) {
        const err = new Error("Chat not found");
        err.code = 404;
        throw err;
    }

    return doc.data();
}


/**
 * Elimina lógicamente un chat.
 */
async function softDeleteChat(chatId, userId) {
    const firestore = db();

    const ref = chatsCol(firestore).doc(chatId);
    const doc = await ref.get();

    if (!doc.exists) {
        const err = new Error("Chat not found");
        err.code = 404;
        throw err;
    }

    const data = doc.data();

    if (data.created_by !== userId) {
        const err = new Error("Forbidden");
        err.code = 403;
        throw err;
    }

    await ref.update({
        status: "DELETED",
        updated_at: nowIso(),
    });

    return true;
}


/**
 * Obtiene los mensajes recientes del chat en un formato
 * independiente del proveedor de IA.
 */
async function getRecentHistory(
    firestore,
    chatId,
    limit = 12
) {
    const snap = await messagesCol(firestore, chatId)
        .orderBy("created_at", "desc")
        .limit(limit)
        .get();

    const arr = snap.docs
        .map((d) => d.data())
        .reverse();

    // Formato neutral:
    // [{ role: "user" | "assistant", text: "..." }]
    return arr
        .filter(
            (m) =>
                m.role === "user" ||
                m.role === "assistant"
        )
        .map((m) => ({
            role: m.role,
            text: m.text,
        }));
}


/**
 * Guarda el mensaje del usuario y solicita una nueva respuesta
 * al servicio de IA configurado (OpenRouter).
 */
async function addMessageAndGenerate({
    chatId,
    userId,
    userName,
    text,
    baseTemplateHtml = null,
}) {
    const firestore = db();

    const chatRef = chatsCol(firestore)
        .doc(chatId);

    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
        const err = new Error("Chat not found");
        err.code = 404;
        throw err;
    }

    const chat = chatSnap.data();

    if (chat.status !== "ACTIVE") {
        const err = new Error("Chat is not active");
        err.code = 400;
        throw err;
    }

    if (chat.created_by !== userId) {
        const err = new Error("Forbidden");
        err.code = 403;
        throw err;
    }


    // ===============================
    // 1. Guarda mensaje del usuario
    // ===============================

    const userMsg = {
        id: cryptoRandomId(),

        role: "user",

        text,

        created_at: nowIso(),

        by: userId,
        by_name: userName,
    };

    await messagesCol(firestore, chatId)
        .doc(userMsg.id)
        .set(userMsg);


    // ===============================
    // 2. Recupera historial reciente
    // ===============================

    const history = await getRecentHistory(
        firestore,
        chatId,
        14
    );


    // ===============================
    // 3. Solicita respuesta a OpenRouter
    // ===============================

    const ai = await generateContractTemplate({
        history,

        userText: text,

        /*
         * Prioridad:
         *
         * 1. Si la IA ya generó una plantilla en este chat,
         *    trabajamos sobre esa.
         *
         * 2. Si todavía no existe una propuesta, usamos
         *    la plantilla base seleccionada por el usuario.
         */
        currentTemplateHtml:
            chat.ai_last_template_html ||
            baseTemplateHtml ||
            null,

        chatContext: {
            title_hint:
                chat.title_hint || null,

            area:
                chat.area || null,

            position:
                chat.position || null,

            jurisdiction:
                chat.jurisdiction || "MX",

            language:
                chat.language || "es-MX",
        },
    });


    // ===============================
    // 4. Valida plantilla generada
    // ===============================

    const template_html =
        ai.template_html || null;

    if (template_html) {
        validatePlaceholdersOrThrow(
            template_html
        );
    }


    // ===============================
    // 5. Determina modelo utilizado
    // ===============================

    /*
     * openrouter/free puede seleccionar internamente
     * un modelo gratuito concreto.
     *
     * openrouter.service.js devuelve ai.model cuando
     * OpenRouter informa qué modelo respondió.
     */
    const modelUsed =
        ai.model ||
        chat.model ||
        OPENROUTER_MODEL;


    // ===============================
    // 6. Guarda mensaje del asistente
    // ===============================

    const assistantMsg = {
        id: cryptoRandomId(),

        role: "assistant",

        text: ai.assistant_message,

        created_at: nowIso(),

        model: modelUsed,
    };

    await messagesCol(firestore, chatId)
        .doc(assistantMsg.id)
        .set(assistantMsg);


    // ===============================
    // 7. Actualiza información del chat
    // ===============================

    const update = {
        updated_at: nowIso(),

        // Guarda el modelo que realmente respondió
        // cuando OpenRouter lo proporciona.
        model: modelUsed,
    };


    if (template_html) {
        update.ai_last_template_html =
            template_html;

        update.ai_last_template_hash =
            hashHtmlNormalized(template_html);

        update.ai_last_generated_at =
            nowIso();


        /*
         * Si la IA crea una plantilla nueva,
         * cualquier edición humana anterior deja
         * de corresponder a esta nueva versión.
         */
        update["human_edit.edited"] =
            false;

        update["human_edit.edited_at"] =
            null;

        update["human_edit.edited_by"] =
            null;

        update["human_edit.edited_by_name"] =
            null;

        update["human_edit.edit_note"] =
            null;

        update[
            "human_edit.edited_template_html"
        ] = null;

        update[
            "human_edit.edited_template_hash"
        ] = null;
    }


    await chatRef.update(update);


    // ===============================
    // 8. Respuesta al controlador
    // ===============================

    return {
        assistant_message:
            assistantMsg,

        template_html:
            template_html || null,

        disclaimer:
            ai.disclaimer,
    };
}


/**
 * Guarda la versión de la plantilla revisada/modificada
 * manualmente por el administrador.
 */
async function setHumanEditedTemplate({
    chatId,
    userId,
    userName,
    template_html,
    edit_note,
}) {
    const firestore = db();

    const chatRef =
        chatsCol(firestore).doc(chatId);

    const snap =
        await chatRef.get();

    if (!snap.exists) {
        const err =
            new Error("Chat not found");

        err.code = 404;

        throw err;
    }


    const chat =
        snap.data();


    if (chat.status !== "ACTIVE") {
        const err =
            new Error(
                "Chat is not active"
            );

        err.code = 400;

        throw err;
    }


    if (chat.created_by !== userId) {
        const err =
            new Error("Forbidden");

        err.code = 403;

        throw err;
    }


    if (!chat.ai_last_template_html) {
        const err =
            new Error(
                "No AI template to edit yet"
            );

        err.code = 400;

        throw err;
    }


    // La edición humana también debe respetar
    // el catálogo de placeholders permitido.
    validatePlaceholdersOrThrow(
        template_html
    );


    const editedHash =
        hashHtmlNormalized(
            template_html
        );


    await chatRef.update({
        updated_at: nowIso(),

        human_edit: {
            edited: true,

            edited_at: nowIso(),

            edited_by:
                userId,

            edited_by_name:
                userName,

            edit_note,

            edited_template_html:
                template_html,

            edited_template_hash:
                editedHash,
        },
    });


    return true;
}


/**
 * Publica como contrato la versión que fue revisada
 * manualmente por el administrador.
 */
async function publishToContracts({
    chatId,
    userId,
    userName,
    title,
    area,
    position,
}) {
    const firestore = db();

    const chat =
        await getChat(chatId);


    if (chat.status !== "ACTIVE") {
        const err =
            new Error(
                "Chat is not active"
            );

        err.code = 400;

        throw err;
    }


    if (chat.created_by !== userId) {
        const err =
            new Error("Forbidden");

        err.code = 403;

        throw err;
    }


    /*
     * SEAL requiere que una plantilla generada
     * por IA sea revisada/editada por una persona
     * antes de convertirse en contrato.
     */
    if (
        !chat.human_edit?.edited ||
        !chat.human_edit
            ?.edited_template_html
    ) {
        const err =
            new Error(
                "Human edit is required before publishing"
            );

        err.code = 400;

        err.details = {
            reason:
                "HUMAN_EDIT_REQUIRED",
        };

        throw err;
    }


    // Vuelve a validar placeholders
    // antes de crear el contrato.
    const {
        used_placeholders,
    } =
        validatePlaceholdersOrThrow(
            chat.human_edit
                .edited_template_html
        );


    // ===============================
    // Crea contrato
    // ===============================

    const contract =
        await contractsService
            .createContract({
                created_by:
                    userId,

                created_by_name:
                    userName,

                title,

                area,

                position,

                base_template_html:
                    chat.human_edit
                        .edited_template_html,

                initial_commit_message:
                    "Creado desde plantilla IA con revisión humana (base v1)",
            });


    // ===============================
    // Guarda metadatos de origen IA
    // ===============================

    await firestore
        .collection("contracts")
        .doc(contract.id)
        .update({
            base_placeholders_used:
                used_placeholders,

            updated_at:
                nowIso(),

            ai_origin: {
                provider:
                    "openrouter",

                model:
                    chat.model ||
                    OPENROUTER_MODEL,

                chat_id:
                    chatId,

                generated_at:
                    chat.ai_last_generated_at ||
                    null,

                disclaimer:
                    chat.disclaimer_text ||
                    DISCLAIMER,

                human_review_required:
                    true,

                human_edit_note:
                    chat.human_edit
                        .edit_note ||
                    null,
            },
        });


    // ===============================
    // Marca chat como publicado
    // ===============================

    await firestore
        .collection(
            "ai_contract_chats"
        )
        .doc(chatId)
        .update({
            updated_at:
                nowIso(),

            published_contract_id:
                contract.id,
        });


    return contract;
}


/**
 * Lista todos los mensajes visibles del chat.
 */
async function listMessages(
    chatId,
    userId
) {
    const firestore = db();

    const chat =
        await getChat(chatId);


    if (
        chat.created_by !==
        userId
    ) {
        const err =
            new Error("Forbidden");

        err.code = 403;

        throw err;
    }


    const snap =
        await messagesCol(
            firestore,
            chatId
        )
            .orderBy(
                "created_at",
                "asc"
            )
            .limit(200)
            .get();


    return snap.docs.map(
        (d) => d.data()
    );
}


module.exports = {
    createChat,

    listChats,

    getChat,

    softDeleteChat,

    addMessageAndGenerate,

    setHumanEditedTemplate,

    publishToContracts,

    listMessages,
};
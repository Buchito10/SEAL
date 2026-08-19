const { z } = require("zod");

const createChatSchema = z.object({
    title_hint: z.string().trim().min(3).max(120).optional(),
    area: z.string().trim().min(2).max(80).optional(),
    position: z.string().trim().min(2).max(80).optional(),
    jurisdiction: z.string().trim().min(2).max(40).default("MX").optional(),
    language: z.string().trim().min(2).max(10).default("es-MX").optional(),
});

const sendMessageSchema = z.object({
    // Mensaje escrito realmente por el usuario.
    text: z.string().trim().min(1).max(4000),

    // Plantilla utilizada únicamente como contexto para la IA.
    // No se guardará como mensaje del usuario.
    base_template_html: z
        .string()
        .max(50000)
        .optional()
        .nullable(),
});

const humanEditSchema = z.object({
    template_html: z.string().min(50),
    edit_note: z.string().trim().min(20).max(2000),
});

const publishToContractSchema = z.object({
    title: z.string().trim().min(3).max(140),
    area: z.string().trim().min(2).max(80),
    position: z.string().trim().min(2).max(80),
});

module.exports = {
    createChatSchema,
    sendMessageSchema,
    humanEditSchema,
    publishToContractSchema,
};
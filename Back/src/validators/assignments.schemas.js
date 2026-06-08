const { z } = require("zod");

const Id = z.string().min(1);

const PrecheckSchema = z.object({
    client_id: Id,
    contract_id: Id,
    contract_version: z.number().int().min(1),
});

const CreateAssignmentSchema = z.object({
    client_id: Id,
    contract_id: Id,
    contract_version: z.number().int().min(1),
    initial_message: z.string().max(2000).optional(),
    // company values se mandan como { "company.title": "...", ... }
    company_values: z.record(z.string(), z.any()).default({}),
});

const SendMessageSchema = z.object({
    text: z.string().min(1).max(5000),
});

const AiAskSchema = z.object({
    question: z.string().min(1).max(2000),
});

const SetChatStatusSchema = z.object({
    status: z.enum(["OPEN", "CLOSED"]),
});

const SignSchema = z.object({
    signature_png_base64: z.string().min(20), // base64 o data URL
    signature_bbox: z
        .object({
            x: z.number().optional(),
            y: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            page: z.number().optional(),
        })
        .optional(),
});

const ApproveSchema = z.object({
    // Por ahora sin campos adicionales.
});

const RejectSchema = z.object({
    reason: z.string().min(1).max(1000).optional(),
});

module.exports = {
    PrecheckSchema,
    CreateAssignmentSchema,
    SendMessageSchema,
    AiAskSchema,
    SetChatStatusSchema,
    SignSchema,
    ApproveSchema,
    RejectSchema,
};

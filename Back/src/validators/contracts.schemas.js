const { z } = require("zod");

const createContractSchema = z.object({
    title: z.string().trim().min(3).max(200),
    area: z.string().trim().min(2).max(120),
    position: z.string().trim().min(2).max(120),
});

const saveTemplateSameVersionSchema = z.object({
    template_html: z.string().min(1),
    commit: z.string().trim().min(5).max(200),
});

const createNewVersionSchema = z.object({
    from_version: z.number().int().min(1),
    template_html: z.string().min(1),
    commit: z.string().trim().min(5).max(200),
    note: z.string().trim().max(200).optional(),
});

const saveDraftSchema = z.object({
    based_on_version: z.number().int().min(1),
    template_html: z.string().min(1),
});

const publishDraftSchema = z.object({
    mode: z.enum(["same_version", "new_version"]),
    commit: z.string().trim().min(5).max(200).optional(), // requerido solo si new_version o same_version (lo validamos en controller)
});

const cloneContractSchema = z.object({
    title: z.string().trim().min(3).max(200).optional(),
    area: z.string().trim().min(2).max(120).optional(),
    position: z.string().trim().min(2).max(120).optional(),
    include_versions: z.boolean().optional().default(false),
});

// compare multiple versions (frontend will do the diff)
const compareVersionsSchema = z.object({
    versions: z.array(z.number().int().min(1)).min(2).max(10),
});

module.exports = {
    createContractSchema,
    saveTemplateSameVersionSchema,
    createNewVersionSchema,
    saveDraftSchema,
    publishDraftSchema,
    cloneContractSchema,
    compareVersionsSchema,
};
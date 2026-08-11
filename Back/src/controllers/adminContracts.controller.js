const multer = require("multer");

const { ok, fail } = require("../utils/response");
const usersService = require("../services/users.service");

const { MAX_DOCX_MB, EDIT_LOCK_TTL_MIN } = require("../config/env");

const contractsService = require("../services/contracts.service");
const contractVersionsService = require("../services/contractVersions.service");
const contractDraftsService = require("../services/contractDrafts.service");
const storageService = require("../services/storage.service");
const { docxBufferToHtml } = require("../services/docx.service");
const { validateDocxOrThrow } = require("../services/docxValidation.service");

const {
    createContractSchema,
    saveTemplateSameVersionSchema,
    createNewVersionSchema,
    saveDraftSchema,
    publishDraftSchema,
    cloneContractSchema,
    compareVersionsSchema,
} = require("../validators/contracts.schemas");

const { getPlaceholderCatalog, validatePlaceholdersOrThrow } = require("../utils/placeholders");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DOCX_MB * 1024 * 1024 },
}).single("file");

function asyncUpload(req, res) {
    return new Promise((resolve, reject) => {
        upload(req, res, (err) => {
            if (err) return reject(err);
            return resolve();
        });
    });
}

async function getAdminName(userId) {
    const u = await usersService.getById(userId);
    return u ? u.name : "ADMIN";
}

function contractStoragePath(contractId, versionNumber) {
    return `contracts/${contractId}/versions/${versionNumber}/source.docx`;
}

// ===== Placeholders catálogo =====
async function getPlaceholders(req, res) {
    return ok(res, getPlaceholderCatalog());
}

// ===== List / Get =====
async function listContracts(req, res) {
    const list = await contractsService.listContracts();
    return ok(res, list);
}

async function getContract(req, res) {
    const c = await contractsService.getContractById(req.params.id);
    if (!c) return fail(res, "Not found", 404);
    return ok(res, c);
}

// ===== Template =====
async function getVersionTemplate(req, res) {
    const contractId = req.params.id;
    const version = Number(req.params.version);
    if (!Number.isFinite(version) || version < 1) return fail(res, "Invalid version", 400);

    const contract = await contractsService.getContractById(contractId);
    if (!contract) return fail(res, "Not found", 404);

    if (version === 1) {
        return ok(res, {
            contract_id: contractId,
            version: 1,
            template_html: contract.base_template_html || "",
            placeholders_used: contract.base_placeholders_used || [],
            commits: contract.base_commits || [],
            is_base: true,
        });
    }

    const v = await contractVersionsService.getVersionDoc(contractId, version);
    if (!v) return fail(res, "Version not found", 404);

    return ok(res, {
        contract_id: contractId,
        version: v.data.version,
        template_html: v.data.template_html,
        placeholders_used: v.data.placeholders_used || [],
        commits: v.data.commits || [],
        is_base: false,
    });
}

// ===== Versions: list =====
// Regla visual: el contrato base (contracts) siempre se muestra como versión 1
async function listContractVersions(req, res) {
    const contractId = req.params.id;

    const contract = await contractsService.getContractById(contractId);
    if (!contract) return fail(res, "Not found", 404);

    const versionDocs = await contractVersionsService.listVersionsByContractId(contractId);

    const baseRow = {
        version: 1,
        display_version: 1,
        is_base: true,
        last_commit_at: contract.base_last_commit_at || null,
        last_commit_by_name: contract.base_last_commit_by_name || null,
        last_commit_message: contract.base_last_commit_message || null,
        note: null,
    };

    const otherRows = versionDocs.map((v) => ({
        version: Number(v.data.version),
        display_version: Number(v.data.version),
        is_base: false,
        last_commit_at: v.data.last_commit_at || null,
        last_commit_by_name: v.data.last_commit_by_name || null,
        last_commit_message: v.data.last_commit_message || null,
        note: v.data.note || null,
    }));

    return ok(res, {
        contract_id: contractId,
        current_version: Number(contract.current_version || 1),
        versions: [baseRow, ...otherRows],
    });
}

// ===== Versions: compare (frontend hace el diff) =====
async function compareContractVersions(req, res) {
    const contractId = req.params.id;

    const parsed = compareVersionsSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const contract = await contractsService.getContractById(contractId);
    if (!contract) return fail(res, "Not found", 404);

    // mantener orden, sin duplicados
    const requested = parsed.data.versions;
    const versions = Array.from(new Set(requested.map((n) => Number(n))));

    for (const v of versions) {
        if (!Number.isFinite(v) || v < 1) return fail(res, "Invalid version", 400, { version: v });
    }

    const payload = [];

    for (const version of versions) {
        if (version === 1) {
            payload.push({
                contract_id: contractId,
                version: 1,
                display_version: 1,
                template_html: contract.base_template_html || "",
                placeholders_used: contract.base_placeholders_used || [],
                commits: contract.base_commits || [],
                is_base: true,
            });
            continue;
        }

        const vdoc = await contractVersionsService.getVersionDoc(contractId, version);
        if (!vdoc) return fail(res, "Version not found", 404, { version });

        payload.push({
            contract_id: contractId,
            version: Number(vdoc.data.version),
            display_version: Number(vdoc.data.version),
            template_html: vdoc.data.template_html,
            placeholders_used: vdoc.data.placeholders_used || [],
            commits: vdoc.data.commits || [],
            is_base: false,
            note: vdoc.data.note || null,
        });
    }

    return ok(res, {
        contract_id: contractId,
        versions: payload,
    });
}

// ===== Upload contrato =====
async function uploadContract(req, res) {
    try {
        await asyncUpload(req, res);
    } catch (err) {
        if (err && err.code === "LIMIT_FILE_SIZE") {
            return fail(res, `File too large. Max ${MAX_DOCX_MB}MB`, 413);
        }
        return fail(res, "Upload error", 400, { error: String(err.message || err) });
    }

    const parsed = createContractSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const file = req.file;
    if (!file) return fail(res, "File required (field: file)", 400);

    try {
        await validateDocxOrThrow({
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
        });
    } catch (e) {
        return fail(res, e.message || "Invalid docx", e.code || 400, e.details);
    }

    const adminId = req.user.userId;
    const adminName = await getAdminName(adminId);

    const { title, area, position } = parsed.data;

    // docx -> html
    const { html } = await docxBufferToHtml(file.buffer);

    // validar placeholders (debe estar limpio al inicio, pero por seguridad)
    let used_placeholders = [];
    try {
        const { used_placeholders: used } = validatePlaceholdersOrThrow(html);
        used_placeholders = used;
    } catch (e) {
        return fail(res, e.message, e.code || 400, e.details);
    }

    // crear contrato con base_template_html (v1 base en contracts)
    const contract = await contractsService.createContract({
        created_by: adminId,
        created_by_name: adminName,
        title,
        area,
        position,
        base_template_html: html,
    });

    // guardar placeholders base en el contrato
    await contractsService.updateContract(contract.id, {
        base_placeholders_used: used_placeholders,
    });

    // subir docx de base v1 a storage
    const storagePath = contractStoragePath(contract.id, 1);
    await storageService.uploadDocxBuffer({
        storagePath,
        buffer: file.buffer,
        contentType: file.mimetype,
    });

    return ok(res, { contract }, 201);
}

// ===== Locks =====
async function acquireLock(req, res) {
    const contractId = req.params.id;
    const adminId = req.user.userId;
    const adminName = await getAdminName(adminId);

    try {
        const lock = await contractsService.acquireLock({
            contractId,
            userId: adminId,
            userName: adminName,
            ttlMin: EDIT_LOCK_TTL_MIN,
        });
        return ok(res, { lock });
    } catch (e) {
        return fail(res, e.message, e.code || 400, e.details);
    }
}

async function refreshLock(req, res) {
    const contractId = req.params.id;
    const adminId = req.user.userId;

    try {
        const lock = await contractsService.refreshLock({
            contractId,
            userId: adminId,
            ttlMin: EDIT_LOCK_TTL_MIN,
        });
        return ok(res, { lock });
    } catch (e) {
        return fail(res, e.message, e.code || 400, e.details);
    }
}

async function releaseLock(req, res) {
    const contractId = req.params.id;
    const adminId = req.user.userId;

    try {
        await contractsService.releaseLock({ contractId, userId: adminId });
        return ok(res, { released: true });
    } catch (e) {
        return fail(res, e.message, e.code || 400, e.details);
    }
}

// ===== Save template: misma versión (requiere lock + commit) =====
// Regla: solo se puede guardar "misma versión" si es la ÚLTIMA y NO es base (v1)
async function saveTemplateSameVersion(req, res) {
    const contractId = req.params.id;
    const version = Number(req.params.version);
    if (!Number.isFinite(version) || version < 1) return fail(res, "Invalid version", 400);

    const parsed = saveTemplateSameVersionSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const adminId = req.user.userId;
    const adminName = await getAdminName(adminId);

    try {
        await contractsService.assertWritableByLock({ contractId, userId: adminId });

        const contract = await contractsService.getContractById(contractId);
        if (!contract) return fail(res, "Not found", 404);

        const current = Number(contract.current_version || 1);

        // No se puede editar base v1 con "save same version"
        if (current === 1 || version === 1) {
            return fail(res, "Base version (v1) cannot be overwritten; create a new version instead", 409, {
                current_version: current,
                attempted_version: version,
            });
        }

        // Solo última
        if (version !== current) {
            return fail(res, "Only current version can be edited", 409, {
                current_version: current,
                attempted_version: version,
            });
        }

        const { used_placeholders } = validatePlaceholdersOrThrow(parsed.data.template_html);

        const updated = await contractVersionsService.updateLatestVersionTemplate({
            contract_id: contractId,
            version,
            template_html: parsed.data.template_html,
            editor_by: adminId,
            editor_by_name: adminName,
            commit_message: parsed.data.commit,
            placeholders_used: used_placeholders,
        });

        return ok(res, { version: updated });
    } catch (e) {
        return fail(res, e.message, e.code || 400, e.details);
    }
}

// ===== Nueva versión (requiere lock + commit) =====
// Regla: solo desde current_version
async function createNewVersion(req, res) {
    const contractId = req.params.id;
    const parsed = createNewVersionSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const adminId = req.user.userId;
    const adminName = await getAdminName(adminId);

    try {
        await contractsService.assertWritableByLock({ contractId, userId: adminId });

        const contract = await contractsService.getContractById(contractId);
        if (!contract) return fail(res, "Not found", 404);

        const current = Number(contract.current_version || 1);

        if (Number(parsed.data.from_version) !== current) {
            return fail(res, "from_version must be current_version", 409, {
                current_version: current,
                from_version: parsed.data.from_version,
            });
        }

        const nextVersion = current + 1;

        const { used_placeholders } = validatePlaceholdersOrThrow(parsed.data.template_html);

        const created = await contractVersionsService.createVersion({
            contract_id: contractId,
            version: nextVersion,
            template_html: parsed.data.template_html,
            created_by: adminId,
            created_by_name: adminName,
            commit_message: parsed.data.commit,
            note: parsed.data.note || null,
            placeholders_used: used_placeholders,
        });

        await contractsService.updateContract(contractId, { current_version: nextVersion });

        return ok(res, { version: created.data, current_version: nextVersion }, 201);
    } catch (e) {
        return fail(res, e.message, e.code || 400, e.details);
    }
}

// ===== Drafts (NO commit, NO lock enforcement para guardar) =====
async function saveDraft(req, res) {
    const contractId = req.params.id;
    const parsed = saveDraftSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const adminId = req.user.userId;
    const adminName = await getAdminName(adminId);

    try {
        validatePlaceholdersOrThrow(parsed.data.template_html);
    } catch (e) {
        return fail(res, e.message, e.code || 400, e.details);
    }

    const draft = await contractDraftsService.createDraft({
        contractId,
        based_on_version: parsed.data.based_on_version,
        template_html: parsed.data.template_html,
        created_by: adminId,
        created_by_name: adminName,
    });

    return ok(res, { draft_id: draft.id, draft: draft.data }, 201);
}

async function getDraft(req, res) {
    const contractId = req.params.id;
    const draftId = req.params.draftId;

    const d = await contractDraftsService.getDraft(contractId, draftId);
    if (!d) return fail(res, "Draft not found", 404);
    if (d.data.created_by !== req.user.userId) return fail(res, "Forbidden", 403);

    return ok(res, { draft_id: d.id, draft: d.data });
}

async function listDrafts(req, res) {
    const drafts = await contractDraftsService.listDrafts(req.params.id, req.user.userId);
    return ok(res, drafts);
}

async function publishDraft(req, res) {
    const contractId = req.params.id;
    const draftId = req.params.draftId;

    const parsed = publishDraftSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const adminId = req.user.userId;
    const adminName = await getAdminName(adminId);

    const d = await contractDraftsService.getDraft(contractId, draftId);
    if (!d) return fail(res, "Draft not found", 404);
    if (d.data.created_by !== adminId) return fail(res, "Forbidden", 403);

    const commit = String(parsed.data.commit || "").trim();
    if (commit.length < 5) return fail(res, "Commit required to publish draft", 400);

    try {
        validatePlaceholdersOrThrow(d.data.template_html);
    } catch (e) {
        return fail(res, e.message, e.code || 400, e.details);
    }

    try {
        await contractsService.assertWritableByLock({ contractId, userId: adminId });

        const contract = await contractsService.getContractById(contractId);
        if (!contract) return fail(res, "Not found", 404);

        const current = Number(contract.current_version || 1);
        const base = Number(d.data.based_on_version || 1);

        if (base !== current) {
            return fail(res, "Draft based_on_version must match current_version to publish", 409, {
                current_version: current,
                draft_based_on_version: base,
            });
        }

        if (parsed.data.mode === "same_version") {
            // si current es 1, no se puede sobreescribir base
            if (current === 1) {
                return fail(res, "Base version (v1) cannot be overwritten; publish as new_version instead", 409, {
                    current_version: current,
                });
            }

            const updated = await contractVersionsService.updateLatestVersionTemplate({
                contract_id: contractId,
                version: current,
                template_html: d.data.template_html,
                editor_by: adminId,
                editor_by_name: adminName,
                commit_message: commit,
                placeholders_used: [],
            });

            await contractDraftsService.deleteDraft(contractId, draftId);
            return ok(res, { published: true, mode: "same_version", version: updated });
        }

        // new_version
        const nextVersion = current + 1;
        const { used_placeholders } = validatePlaceholdersOrThrow(d.data.template_html);

        const created = await contractVersionsService.createVersion({
            contract_id: contractId,
            version: nextVersion,
            template_html: d.data.template_html,
            created_by: adminId,
            created_by_name: adminName,
            commit_message: commit,
            note: "Publicado desde borrador",
            placeholders_used: used_placeholders,
        });

        await contractsService.updateContract(contractId, { current_version: nextVersion });
        await contractDraftsService.deleteDraft(contractId, draftId);

        return ok(res, { published: true, mode: "new_version", version: created.data, current_version: nextVersion }, 201);
    } catch (e) {
        return fail(res, e.message, e.code || 400, e.details);
    }
}

// ===== Clone (nuevo contrato) =====
// Regla: clonar la ÚLTIMA versión como base v1 del nuevo contrato.
async function cloneContract(req, res) {
    const contractId = req.params.id;

    const parsed = cloneContractSchema.safeParse(req.body || {});
    if (!parsed.success) return fail(res, "Invalid body", 400, parsed.error.flatten());

    const adminId = req.user.userId;
    const adminName = await getAdminName(adminId);

    const source = await contractsService.getContractById(contractId);
    if (!source) return fail(res, "Not found", 404);

    const currentVersion = Number(source.current_version || 1);

    let html = "";
    let used_placeholders = [];

    if (currentVersion === 1) {
        html = source.base_template_html || "";
        const validated = validatePlaceholdersOrThrow(html);
        used_placeholders = validated.used_placeholders || [];
    } else {
        const v = await contractVersionsService.getVersionDoc(contractId, currentVersion);
        if (!v) return fail(res, "Source version not found", 404);
        html = v.data.template_html || "";
        used_placeholders = (v.data.placeholders_used || []);
        // extra seguridad
        validatePlaceholdersOrThrow(html);
    }

    const title = parsed.data.title || source.title;
    const area = parsed.data.area || source.area;
    const position = parsed.data.position || source.position;

    // Crear contrato nuevo con base_template_html = última versión del source
    const newContract = await contractsService.createContract({
        created_by: adminId,
        created_by_name: adminName,
        title,
        area,
        position,
        base_template_html: html,
    });

    await contractsService.updateContract(newContract.id, {
        base_placeholders_used: used_placeholders,
    });

    return ok(res, { contract: newContract }, 201);
}

module.exports = {
    getPlaceholders,

    listContracts,
    getContract,
    getVersionTemplate,
    listContractVersions,
    compareContractVersions,

    uploadContract,

    acquireLock,
    refreshLock,
    releaseLock,

    saveTemplateSameVersion,
    createNewVersion,

    saveDraft,
    listDrafts,
    getDraft,
    publishDraft,

    cloneContract,
};

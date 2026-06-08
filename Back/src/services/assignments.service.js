const { db } = require("../config/firebase");
const contractsService = require("./contracts.service");
const contractVersionsService = require("./contractVersions.service");
const usersService = require("./users.service");
const { renderTemplateHtml } = require("../utils/placeholderRender");
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

async function getTemplateByContractVersion(contractId, version) {
    const contract = await contractsService.getContractById(contractId);
    if (!contract) {
        const err = new Error("Contract not found");
        err.code = 404;
        throw err;
    }

    if (version === 1) {
        return {
            contract,
            version: 1,
            template_html: contract.base_template_html || "",
            placeholders_used: contract.base_placeholders_used || [],
            is_base: true,
        };
    }

    const v = await contractVersionsService.getVersionDoc(contractId, version);
    if (!v) {
        const err = new Error("Version not found");
        err.code = 404;
        throw err;
    }

    return {
        contract,
        version: v.data.version,
        template_html: v.data.template_html || "",
        placeholders_used: v.data.placeholders_used || [],
        is_base: false,
    };
}

/**
 * Mapea placeholder keys employee.* a campos de users.
 * Si algún placeholder no tiene mapeo, se considera faltante.
 */
function employeePlaceholderToUserField(key) {
    const map = {
        "employee.name": "name",
        "employee.email": "email",
        "employee.rfc": "rfc",
        "employee.curp": "curp",
        "employee.phone": "phone",

        "employee.address_line1": "address_line1",
        "employee.address_line2": "address_line2",
        "employee.address_city": "address_city",
        "employee.address_state": "address_state",
        "employee.address_zip": "address_zip",
        "employee.address_country": "address_country",
    };

    return map[key] || null;
}

function buildValuesMap({ companyValues, employeeUser }) {
    const values = {};

    // company.*
    if (companyValues && typeof companyValues === "object") {
        for (const [k, v] of Object.entries(companyValues)) values[k] = v;
    }

    // employee.*
    if (employeeUser && typeof employeeUser === "object") {
        const employeeKeys = Object.keys(employeeUserFieldCatalog());
        for (const key of employeeKeys) {
            const field = employeePlaceholderToUserField(key);
            if (!field) continue;
            values[key] = employeeUser[field];
        }
    }

    return values;
}

function employeeUserFieldCatalog() {
    return {
        "employee.name": true,
        "employee.email": true,
        "employee.rfc": true,
        "employee.curp": true,
        "employee.phone": true,

        "employee.address_line1": true,
        "employee.address_line2": true,
        "employee.address_city": true,
        "employee.address_state": true,
        "employee.address_zip": true,
        "employee.address_country": true,
    };
}

function isEmployeePlaceholder(key) {
    return String(key || "").startsWith("employee.");
}

function isCompanyPlaceholder(key) {
    return String(key || "").startsWith("company.");
}

function computeMissingEmployeeFields({ requiredPlaceholders, user }) {
    const missing = [];
    for (const key of requiredPlaceholders) {
        if (!isEmployeePlaceholder(key)) continue;
        const field = employeePlaceholderToUserField(key);
        if (!field) {
            missing.push(key);
            continue;
        }
        const v = user ? user[field] : null;
        if (v === undefined || v === null || String(v).trim() === "") missing.push(key);
    }
    return missing;
}

function computeMissingCompanyFields({ requiredPlaceholders, companyValues }) {
    const missing = [];
    for (const key of requiredPlaceholders) {
        if (!isCompanyPlaceholder(key)) continue;
        const v = companyValues ? companyValues[key] : null;
        if (v === undefined || v === null || String(v).trim() === "") missing.push(key);
    }
    return missing;
}

async function precheckAssignment(input) {
    // Acepta snake_case (lo que manda el controller) y camelCase (por compatibilidad)
    const clientId = input?.client_id ?? input?.clientId;
    const contractId = input?.contract_id ?? input?.contractId;
    const version = input?.contract_version ?? input?.version;

    if (!clientId || !contractId || !version) {
        const err = new Error("Missing required fields");
        err.code = 400;
        err.details = {
            required: ["client_id", "contract_id", "contract_version"],
            received: input,
        };
        throw err;
    }

    const user = await usersService.getById(clientId);
    if (!user) {
        const err = new Error("Client not found");
        err.code = 404;
        throw err;
    }
    if (String(user.role || "").toUpperCase() !== "CLIENT") {
        const err = new Error("Target user is not a CLIENT");
        err.code = 400;
        throw err;
    }

    const tpl = await getTemplateByContractVersion(contractId, Number(version));
    const required = tpl.placeholders_used || [];

    const missing_employee = computeMissingEmployeeFields({ requiredPlaceholders: required, user });
    const required_company = required.filter(isCompanyPlaceholder);
    const required_employee = required.filter(isEmployeePlaceholder);

    return {
        contract_id: contractId,
        version: tpl.version,
        required_placeholders: required,
        required_employee_placeholders: required_employee,
        required_company_placeholders: required_company,
        missing_employee_placeholders: missing_employee,
    };
}

async function createAssignment({
    created_by,
    created_by_name,
    client_id,
    contract_id,
    contract_version,
    initial_message,
    company_values,
}) {
    const user = await usersService.getById(client_id);
    if (!user) {
        const err = new Error("Client not found");
        err.code = 404;
        throw err;
    }
    if (String(user.role || "").toUpperCase() !== "CLIENT") {
        const err = new Error("Target user is not a CLIENT");
        err.code = 400;
        throw err;
    }

    const tpl = await getTemplateByContractVersion(contract_id, contract_version);
    const required = tpl.placeholders_used || [];

    // Regla: NO se crea asignación si faltan datos employee requeridos.
    const missingEmployee = computeMissingEmployeeFields({ requiredPlaceholders: required, user });
    if (missingEmployee.length > 0) {
        const err = new Error("Client profile incomplete for this contract");
        err.code = 400;
        err.details = { missing_employee_placeholders: missingEmployee };
        throw err;
    }

    // company required placeholders también deben venir completos para evitar asignaciones inválidas.
    const missingCompany = computeMissingCompanyFields({ requiredPlaceholders: required, companyValues: company_values });
    if (missingCompany.length > 0) {
        const err = new Error("Missing required company placeholders");
        err.code = 400;
        err.details = { missing_company_placeholders: missingCompany };
        throw err;
    }

    const valuesMap = buildValuesMap({ companyValues: company_values, employeeUser: user });
    const resolvedHtml = renderTemplateHtml(tpl.template_html, valuesMap);

    const id = randomId();
    const assignment = {
        id,

        status: "ASSIGNED",
        chat_status: "OPEN",

        contract_id,
        contract_version: tpl.version,
        contract_title: tpl.contract.title || null,

        client_id,
        client_name: user.name || null,
        client_email: user.email || null,

        assigned_by: created_by,
        assigned_by_name: created_by_name,

        // snapshot
        template_html_snapshot: tpl.template_html || "",
        placeholders_required: required,
        placeholders_company_values: company_values || {},
        placeholders_employee_snapshot: {
            name: user.name || null,
            email: user.email || null,
            rfc: user.rfc || null,
            curp: user.curp || null,
            phone: user.phone || null,
            address_line1: user.address_line1 || null,
            address_line2: user.address_line2 || null,
            address_city: user.address_city || null,
            address_state: user.address_state || null,
            address_zip: user.address_zip || null,
            address_country: user.address_country || null,
        },

        resolved_html_snapshot: resolvedHtml,
        resolved_html_hash: sha256Hex(resolvedHtml),

        signature: null,
        signed_at: null,
        signed_ip: null,
        signed_user_agent: null,

        approval: null,

        events: [
            {
                id: randomId(),
                type: "ASSIGNED",
                at: nowIso(),
                by: created_by,
                by_name: created_by_name,
                meta: { contract_id, contract_version: tpl.version, client_id },
            },
        ],

        created_at: nowIso(),
        updated_at: nowIso(),
    };

    await col().doc(id).set(assignment);

    // crear primer mensaje admin (si lo mandan)
    if (initial_message && String(initial_message).trim()) {
        const messagesService = require("./assignmentMessages.service");
        await messagesService.createMessage({
            assignment_id: id,
            sender_id: created_by,
            sender_role: "ADMIN",
            sender_name: created_by_name,
            text: String(initial_message).trim(),
        });
    }

    return assignment;
}

async function listAssignmentsForAdmin({ status, chat_status, limit = 50 }) {
    const q = col();
    let query = q;
    if (status) query = query.where("status", "==", status);
    if (chat_status) query = query.where("chat_status", "==", chat_status);
    const snap = await query.orderBy("created_at", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data());
}

async function listAssignmentsForClient({ client_id, status, limit = 50 }) {
    let query = col().where("client_id", "==", client_id);
    if (status) query = query.where("status", "==", status);
    const snap = await query.orderBy("created_at", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data());
}

async function getAssignmentById(id) {
    const doc = await col().doc(id).get();
    if (!doc.exists) return null;
    return doc.data();
}

async function markViewed({ assignment_id, viewer_id, viewer_name }) {
    const ref = col().doc(assignment_id);
    await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            const err = new Error("Not found");
            err.code = 404;
            throw err;
        }
        const data = snap.data();
        if (data.client_id !== viewer_id) {
            const err = new Error("Forbidden");
            err.code = 403;
            throw err;
        }
        if (data.status !== "ASSIGNED") return; // ya estaba visto o avanzó

        const ev = {
            id: randomId(),
            type: "VIEWED",
            at: nowIso(),
            by: viewer_id,
            by_name: viewer_name || null,
        };

        tx.update(ref, {
            status: "VIEWED",
            events: [...(data.events || []), ev],
            updated_at: nowIso(),
        });
    });

    return getAssignmentById(assignment_id);
}

async function setChatStatus({ assignment_id, status, by_id, by_name }) {
    const ref = col().doc(assignment_id);
    await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            const err = new Error("Not found");
            err.code = 404;
            throw err;
        }
        const data = snap.data();

        const ev = {
            id: randomId(),
            type: status === "CLOSED" ? "CHAT_CLOSED" : "CHAT_REOPENED",
            at: nowIso(),
            by: by_id,
            by_name: by_name || null,
        };

        tx.update(ref, {
            chat_status: status,
            events: [...(data.events || []), ev],
            updated_at: nowIso(),
        });
    });

    return getAssignmentById(assignment_id);
}

module.exports = {
    precheckAssignment,
    createAssignment,
    listAssignmentsForAdmin,
    listAssignmentsForClient,
    getAssignmentById,
    markViewed,
    setChatStatus,

    // helpers exportados por si se ocupan en otros services
    getTemplateByContractVersion,
    isEmployeePlaceholder,
    isCompanyPlaceholder,
    computeMissingEmployeeFields,
    computeMissingCompanyFields,
    employeePlaceholderToUserField,
};

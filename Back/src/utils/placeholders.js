function getPlaceholderCatalog() {
    // Employee placeholders (users CLIENT)
    const employee = [
        { key: "employee.name", label: "Nombre completo" },
        { key: "employee.email", label: "Email" },
        { key: "employee.rfc", label: "RFC" },
        { key: "employee.curp", label: "CURP" },
        { key: "employee.phone", label: "Teléfono" },

        { key: "employee.address_line1", label: "Dirección línea 1" },
        { key: "employee.address_line2", label: "Dirección línea 2" },
        { key: "employee.address_city", label: "Ciudad" },
        { key: "employee.address_state", label: "Estado" },
        { key: "employee.address_zip", label: "Código Postal" },
        { key: "employee.address_country", label: "País" },
    ];

    // Company / contract placeholders
    const company = [
        { key: "company.title", label: "Título del contrato" },
        { key: "company.area", label: "Área" },
        { key: "company.position", label: "Puesto" },

        { key: "company.duration", label: "Duración" },
        { key: "company.legal_representative_name", label: "Representante legal (nombre)" },
        { key: "company.start_date", label: "Fecha de inicio" },
        { key: "company.end_date", label: "Fecha de fin" },
        { key: "company.salary", label: "Salario" },
        { key: "company.work_schedule", label: "Horario laboral" },
    ];

    return { employee, company };
}

function getAllowedPlaceholderKeys() {
    const cat = getPlaceholderCatalog();
    const keys = new Set();
    for (const item of [...cat.employee, ...cat.company]) keys.add(item.key);
    return keys;
}

function extractPlaceholders(templateHtml) {
    // tokens tipo {{ employee.rfc }} -> capturamos employee.rfc
    const re = /{{\s*([a-zA-Z0-9_.]+)\s*}}/g;
    const found = new Set();
    let m;
    while ((m = re.exec(templateHtml)) !== null) {
        found.add(m[1]);
    }
    return Array.from(found);
}

function validatePlaceholdersOrThrow(templateHtml) {

    //si no funciona se borra w
    if (/data-ph\s*=\s*["']/.test(String(templateHtml || ""))) {
        const err = new Error("No se permite usar data-ph. Usa placeholders con {{ ... }}.");
        err.code = 400;
        err.details = { reason: "DISALLOWED_DATA_PH" };
        throw err;
    }
//es hasta aqui
    const used = extractPlaceholders(templateHtml);
    const allowed = getAllowedPlaceholderKeys();

    const invalid = used.filter((k) => !allowed.has(k));
    if (invalid.length > 0) {
        const err = new Error("Invalid placeholder(s)");
        err.code = 400;
        err.details = { invalid_placeholders: invalid };
        throw err;
    }
    return { used_placeholders: used };
}

module.exports = {
    getPlaceholderCatalog,
    getAllowedPlaceholderKeys,
    extractPlaceholders,
    validatePlaceholdersOrThrow,
};
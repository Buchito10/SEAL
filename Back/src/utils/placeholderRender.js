const { escapeHtml } = require("./html");

/**
 * Reemplaza:
 *  1) Tokens: <span data-ph="employee.rfc">...</span>
 *  2) Legacy: {{ employee.rfc }}
 *
 * Nota: Escapa HTML para evitar inyección.
 */
function renderTemplateHtml(templateHtml, values) {
    let html = String(templateHtml || "");
    const map = values || {};

    // 1) Tokens: reemplaza el span completo por el valor
    // Acepta cualquier etiqueta que tenga data-ph="key" (span normalmente).
    html = html.replace(
        /<([a-zA-Z0-9]+)([^>]*?)data-ph\s*=\s*["']([a-zA-Z0-9_.]+)["']([^>]*)>([\s\S]*?)<\/\1>/g,
        (full, tag, pre, key) => {
            const v = map[key];
            if (v === undefined || v === null) return "";
            return escapeHtml(v);
        }
    );

    // 2) Legacy: {{ key }}
    html = html.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (full, key) => {
        const v = map[key];
        if (v === undefined || v === null) return "";
        return escapeHtml(v);
    });

    return html;
}

module.exports = { renderTemplateHtml };
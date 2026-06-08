const mammoth = require("mammoth");

async function docxBufferToHtml(buffer) {
    // Mammoth devuelve { value: "<p>...</p>", messages: [...] }
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value || "";
    return { html, messages: result.messages || [] };
}

module.exports = { docxBufferToHtml };
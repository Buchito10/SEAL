const {
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_TEMPERATURE,
    GEMINI_MAX_OUTPUT_TOKENS,
} = require("../config/env");

const { getPlaceholderCatalog } = require("../utils/placeholders");

const DISCLAIMER =
    "⚠️ Plantilla generada con IA. No sustituye revisión humana/legal. Debe ser revisada y validada antes de usarse o firmarse.";

function buildSystemInstruction() {
    const cat = getPlaceholderCatalog();
    const all = [...cat.employee, ...cat.company];

    const placeholderLines = all
        .map((p) => `- {{ ${p.key} }} (${p.label})`)
        .join("\n");

    return [
        "Eres un asistente legal/técnico que ayuda a redactar PLANTILLAS de contratos laborales.",
        "Tu usuario es un Administrador que necesita generar una plantilla reutilizable, no un contrato final con datos reales.",
        "Responde SIEMPRE como un SOLO objeto JSON válido (sin texto extra) con estas claves:",
        '- "assistant_message": string',
        '- "template_html": string o null',
        "template_html debe ser HTML (sin markdown).",
        "Solo puedes usar placeholders EXACTAMENTE de esta lista. No inventes placeholders, no cambies nombres y no uses otros formatos:",
        placeholderLines,
        "Reglas:",
        "- No uses data-ph. Solo {{ ... }}.",
        "- No uses datos personales reales ni valores ficticios específicos; usa placeholders cuando corresponda.",
        "- Usa solo los placeholders necesarios para el tipo de contrato solicitado.",
        "- Si el contrato es por tiempo indefinido, normalmente usa company.start_date y company.duration; evita company.end_date salvo que el Administrador lo pida.",
        "- Si el contrato es por tiempo determinado/temporal, usa company.start_date, company.end_date y company.duration cuando aplique.",
        "- Si el usuario pregunta qué placeholders puede usar, responde la duda en assistant_message y usa template_html:null salvo que también pida generar o modificar una plantilla.",
        "- Si falta información, crea una plantilla general y menciona qué campos deberá revisar el Administrador.",
        "- Estructura el HTML como contrato laboral legible con encabezados, cláusulas y sección de firmas.",
        "- Conserva placeholders válidos cuando ajustes una plantilla existente.",
        "- Si el usuario pide 'mejorar' o 'ajustar', modifica la última plantilla manteniendo placeholders válidos.",
        "- assistant_message debe incluir siempre un recordatorio de revisión humana/legal.",
        "- No incluyas firmas reales ni datos personales reales; usa placeholders.",
        "",
        "Formato de salida (EJEMPLO). Debes devolver SOLO esto, sin texto fuera:",
        '{"assistant_message":"...","template_html":"<html>...</html>"}',
    ].join("\n");
}

function toGeminiContents(messages) {
    // messages: [{role:"user"|"assistant", text:"..."}]
    return (messages || []).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
    }));
}

function extractJsonCandidate(data) {
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
        ? parts.map((p) => p.text || "").join("")
        : (data?.candidates?.[0]?.content?.parts?.[0]?.text || "");

    if (!text) return null;

    // 1) intenta directo
    try {
        return JSON.parse(text);
    } catch { }

    // 2) intenta extraer el primer bloque {...}
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
        const maybe = text.slice(start, end + 1);
        try {
            return JSON.parse(maybe);
        } catch { }
    }

    return null;
}

async function generateContractTemplate({ history, userText, currentTemplateHtml, chatContext }) {
    const system = buildSystemInstruction();

    const context = chatContext || {};
    const metadataMsg = [
        "Contexto operativo del chat:",
        `- Título sugerido: ${context.title_hint || "No definido"}`,
        `- Área: ${context.area || "No definida"}`,
        `- Puesto: ${context.position || "No definido"}`,
        `- Jurisdicción: ${context.jurisdiction || "MX"}`,
        `- Idioma: ${context.language || "es-MX"}`,
    ].join("\n");

    const contextMsg = currentTemplateHtml
        ? `Plantilla actual (HTML) a modificar:\n${currentTemplateHtml}`
        : "Aún no hay plantilla. Si el usuario solicita una plantilla, crea una desde cero.";

    const contents = [
        // Nota: aquí usamos el “primer mensaje” como instrucción fuerte (sin systemInstruction formal)
        { role: "user", parts: [{ text: system }] },
        ...toGeminiContents(history),
        {
            role: "user",
            parts: [
                { text: metadataMsg },
                { text: contextMsg },
                { text: `Solicitud del usuario:\n${userText}` },
            ],
        },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const body = {
        contents,
        generationConfig: {
            temperature: GEMINI_TEMPERATURE,
            maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
            responseMimeType: "application/json",
        },
    };

    const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!r.ok) {
        const t = await r.text();
        console.error("[GEMINI] HTTP", r.status, t);
        const err = new Error(`Gemini API error (${r.status})`);
        err.code = 502;
        err.details = { status: r.status, body: t };
        throw err;
    }

    const data = await r.json();
    const parsed = extractJsonCandidate(data);

    if (!parsed || typeof parsed.assistant_message !== "string") {
        const err = new Error("Invalid response from Gemini");
        err.code = 502;
        err.details = { raw: data };
        throw err;
    }

    // fuerza disclaimer aunque el modelo “olvide”
    const msg = parsed.assistant_message || "";
    const hasIA = msg.toLowerCase().includes("ia") || msg.toLowerCase().includes("inteligencia");
    const hasReview = msg.toLowerCase().includes("revisión") || msg.toLowerCase().includes("revision");

    if (!hasIA || !hasReview) {
        parsed.assistant_message = `${msg}\n\n${DISCLAIMER}`.trim();
    }

    return {
        assistant_message: parsed.assistant_message,
        template_html: parsed.template_html ?? null,
        disclaimer: DISCLAIMER,
    };
}

module.exports = {
    generateContractTemplate,
    DISCLAIMER,
};

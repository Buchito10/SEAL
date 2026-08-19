const {
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    OPENROUTER_TEMPERATURE,
    OPENROUTER_MAX_OUTPUT_TOKENS,
} = require("../config/env");

const { getPlaceholderCatalog } = require("../utils/placeholders");

const DISCLAIMER =
    "⚠️ Plantilla generada con IA. No sustituye revisión humana/legal. Debe ser revisada y validada antes de usarse o firmarse.";

function fallbackResponse(userText) {
    const asksForTemplate =
        /plantilla|contrato|genera|redacta|crear/i.test(
            String(userText || "")
        );

    return {
        assistant_message: [
            "La IA no está configurada en este entorno. Preparé una base local para que puedas continuar y revisarla manualmente.",
            DISCLAIMER,
        ].join("\n\n"),

        template_html: asksForTemplate
            ? [
                "<h1>Contrato laboral</h1>",
                "<p>Entre la empresa y <strong>{{ employee.name }}</strong>, con correo {{ employee.email }}, se celebra el presente contrato.</p>",
                "<h2>Puesto y condiciones</h2>",
                "<p>Puesto: {{ company.position }}. Área: {{ company.area }}.</p>",
                "<p>Fecha de inicio: {{ company.start_date }}. Duración: {{ company.duration }}.</p>",
                "<p>Salario: {{ company.salary }}. Horario: {{ company.work_schedule }}.</p>",
                "<h2>Firmas</h2>",
                "<p>Representante legal: {{ company.legal_representative_name }}</p>",
                "<p>Persona contratada: {{ employee.name }}</p>",
            ].join("")
            : null,

        disclaimer: DISCLAIMER,
        mode: "fallback",
        provider: "fallback",
        model: null,
    };
}

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

        "Formato de salida. Debes devolver SOLO esto, sin texto fuera:",

        '{"assistant_message":"...","template_html":"<h1>...</h1>"}',
    ].join("\n");
}

function toOpenRouterMessages(messages) {
    return (messages || []).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text,
    }));
}

function extractJsonCandidate(data) {
    const content = data?.choices?.[0]?.message?.content;

    let text = "";

    if (typeof content === "string") {
        text = content;
    } else if (Array.isArray(content)) {
        text = content
            .map((part) => part?.text || "")
            .join("");
    }

    if (!text) return null;

    // Intenta parsear la respuesta directamente.
    try {
        return JSON.parse(text);
    } catch { }

    // Respaldo por si el modelo agrega texto alrededor del JSON.
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

async function generateContractTemplate({
    history,
    userText,
    currentTemplateHtml,
    chatContext,
}) {
    if (!String(OPENROUTER_API_KEY || "").trim()) {
        return fallbackResponse(userText);
    }

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

    const messages = [
        {
            role: "system",
            content: system,
        },

        ...toOpenRouterMessages(history),

        {
            role: "user",
            content: [
                metadataMsg,
                contextMsg,
                `Solicitud del usuario:\n${userText}`,
            ].join("\n\n"),
        },
    ];

    const body = {
        model: OPENROUTER_MODEL,

        messages,

        temperature: OPENROUTER_TEMPERATURE,

        max_tokens: OPENROUTER_MAX_OUTPUT_TOKENS,

        // Para gpt-oss no necesitamos que gaste demasiados
        // tokens razonando internamente para esta tarea.
        reasoning: {
            effort: "low",
            exclude: true,
        },

        // Fuerza exactamente la estructura que SEAL necesita.
        response_format: {
            type: "json_schema",

            json_schema: {
                name: "seal_contract_template",

                strict: true,

                schema: {
                    type: "object",

                    properties: {
                        assistant_message: {
                            type: "string",
                        },

                        template_html: {
                            anyOf: [
                                {
                                    type: "string",
                                },
                                {
                                    type: "null",
                                },
                            ],
                        },
                    },

                    required: [
                        "assistant_message",
                        "template_html",
                    ],

                    additionalProperties: false,
                },
            },
        },

        // Obliga a utilizar un proveedor que soporte
        // los parámetros solicitados.
        provider: {
            require_parameters: true,
        },

        // Intenta reparar JSON imperfecto antes
        // de devolvérselo a SEAL.
        plugins: [
            {
                id: "response-healing",
            },
        ],

        stream: false,
    };

    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",

            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "X-Title": "SEAL",
            },

            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        const text = await response.text();

        console.error(
            "[OPENROUTER] HTTP",
            response.status,
            text
        );

        const err = new Error(
            `OpenRouter API error (${response.status})`
        );

        err.code = 502;

        err.details = {
            status: response.status,
            body: text,
        };

        throw err;
    }

    const data = await response.json();

    const parsed = extractJsonCandidate(data);

    if (
        !parsed ||
        typeof parsed.assistant_message !== "string"
    ) {
        const finishReason =
            data?.choices?.[0]?.finish_reason || null;

        const rawContent =
            data?.choices?.[0]?.message?.content || null;

        console.error(
            "[OPENROUTER] Invalid structured response",
            {
                model: data?.model || OPENROUTER_MODEL,
                finishReason,
                contentPreview:
                    typeof rawContent === "string"
                        ? rawContent.slice(0, 2000)
                        : rawContent,
            }
        );

        const err = new Error(
            finishReason === "length"
                ? "La respuesta de IA fue demasiado larga y quedó incompleta"
                : "Invalid response from OpenRouter"
        );

        err.code = 502;

        err.details = {
            model: data?.model || OPENROUTER_MODEL,
            finish_reason: finishReason,
        };

        throw err;
    }

    // Fuerza el aviso aunque el modelo lo olvide.
    const msg = parsed.assistant_message || "";

    const hasIA =
        msg.toLowerCase().includes("ia") ||
        msg.toLowerCase().includes("inteligencia");

    const hasReview =
        msg.toLowerCase().includes("revisión") ||
        msg.toLowerCase().includes("revision");

    if (!hasIA || !hasReview) {
        parsed.assistant_message =
            `${msg}\n\n${DISCLAIMER}`.trim();
    }

    return {
        assistant_message: parsed.assistant_message,
        template_html: parsed.template_html ?? null,
        disclaimer: DISCLAIMER,
        mode: "openrouter",
        provider: "openrouter",

        // OpenRouter devuelve el modelo real utilizado.
        model: data?.model || OPENROUTER_MODEL,
    };
}

module.exports = {
    generateContractTemplate,
    DISCLAIMER,
};
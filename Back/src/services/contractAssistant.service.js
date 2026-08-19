const {
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    OPENROUTER_TEMPERATURE,
} = require("../config/env");


/**
 * Convierte el HTML del contrato a texto simple.
 */
function stripHtml(html) {
    return String(html || "")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<\/h[1-6]>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n+/g, "\n")
        .trim();
}


/**
 * Divide el texto para el fallback local.
 */
function splitSentences(text) {
    return String(text || "")
        .split(/(?<=[.!?])\s+|\n+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 20);
}


/**
 * Obtiene palabras importantes de la pregunta.
 */
function keywordsFrom(question) {
    const stop = new Set([
        "que",
        "qué",
        "para",
        "por",
        "con",
        "del",
        "los",
        "las",
        "una",
        "uno",
        "como",
        "cómo",
        "este",
        "esta",
        "esto",
        "contrato",
        "clausula",
        "cláusula",
        "significa",
        "quiere",
        "decir",
        "dime",
        "puedes",
        "podrias",
        "podrías",
    ]);

    return String(question || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(
            (word) =>
                word.length >= 4 &&
                !stop.has(word)
        );
}


/**
 * Busca algunas partes relacionadas.
 *
 * Se mantiene porque sirve para:
 * - mostrar snippets
 * - fallback si OpenRouter falla
 */
function findRelevantSnippets({
    text,
    question,
}) {
    const sentences =
        splitSentences(text);

    const words =
        keywordsFrom(question);

    /*
     * Para preguntas generales como
     * "resume el contrato", el algoritmo
     * por palabras clave no es muy útil.
     *
     * En esos casos devolvemos algunos
     * fragmentos iniciales únicamente como
     * referencia.
     */
    if (
        words.length === 0 ||
        /resum|puntos importantes|explica.*contrato|de que trata|de qué trata/i.test(
            String(question || "")
        )
    ) {
        return sentences.slice(0, 3);
    }

    return sentences
        .map((sentence) => {
            const normalized =
                sentence
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        ""
                    );

            const score =
                words.reduce(
                    (total, word) =>
                        total +
                        (normalized.includes(
                            word
                        )
                            ? 1
                            : 0),
                    0
                );

            return {
                sentence,
                score,
            };
        })
        .filter(
            (item) =>
                item.score > 0
        )
        .sort(
            (a, b) =>
                b.score - a.score
        )
        .slice(0, 3)
        .map(
            (item) =>
                item.sentence
        );
}


/**
 * Respuesta local de respaldo.
 *
 * Se utiliza si:
 * - no existe API key
 * - OpenRouter falla
 * - se acaba temporalmente la cuota
 */
function buildLocalFallback({
    question,
    assignment,
    role,
    text,
}) {
    const snippets =
        findRelevantSnippets({
            text,
            question,
        });

    const q =
        String(
            question || ""
        ).toLowerCase();

    const title =
        assignment.contract_title ||
        "este contrato";

    let guidance = "";

    if (
        q.includes("firm")
    ) {
        guidance =
            role === "CLIENT"
                ? "Si ya revisaste el documento y estás de acuerdo, puedes firmarlo desde la sección correspondiente. Si algo no te queda claro, pregunta a administración antes de confirmar."
                : "Antes de aprobar el expediente conviene confirmar que el cliente haya revisado y firmado el documento.";
    } else if (
        q.includes("salario") ||
        q.includes("sueldo") ||
        q.includes("pago")
    ) {
        guidance =
            "Revisa las cláusulas relacionadas con salario, forma de pago y prestaciones para confirmar que coincidan con lo acordado.";
    } else if (
        q.includes("jornada") ||
        q.includes("horario")
    ) {
        guidance =
            "Revisa la jornada, horario, modalidad y descansos establecidos en el contrato.";
    } else if (
        q.includes("fecha") ||
        q.includes("duracion") ||
        q.includes("duración")
    ) {
        guidance =
            "Revisa las fechas de inicio, vigencia, duración y las condiciones relacionadas con la terminación.";
    } else {
        guidance =
            `Puedo ayudarte a ubicar información de ${title}. La respuesta local es orientativa y no sustituye revisión humana o legal.`;
    }

    const context =
        snippets.length
            ? [
                  "Encontré estas partes relacionadas:",
                  ...snippets.map(
                      (item) =>
                          `- ${item}`
                  ),
              ].join("\n")
            : "No encontré una cláusula exacta relacionada con esos términos.";

    return {
        mode: "local-contract-assistant",

        answer: [
            guidance,
            "",
            context,
            "",
            "OpenRouter no estuvo disponible para esta respuesta, por lo que SEAL utilizó su análisis local de respaldo.",
        ].join("\n"),

        snippets,
    };
}


/**
 * Prompt diferente dependiendo de quién
 * esté consultando el expediente.
 */
function buildSystemInstruction(role) {
    const common = [
        "Eres SEAL IA, un asistente especializado en explicar contratos laborales.",
        "Tu tarea es responder preguntas exclusivamente utilizando la información contenida en el contrato proporcionado.",
        "No debes inventar cláusulas, montos, fechas, obligaciones ni información que no aparezca en el documento.",
        "Si el contrato no contiene suficiente información para responder, dilo claramente.",
        "No afirmes que tu respuesta constituye asesoría legal.",
        "Responde en español de México.",
        "Utiliza lenguaje claro, directo y profesional.",
        "Puedes resumir, explicar, comparar secciones y señalar información importante del documento.",
        "Cuando la pregunta pida un resumen, analiza el contrato completo y destaca los puntos realmente importantes.",
        "Cuando la pregunta sea específica, céntrate únicamente en las cláusulas relacionadas.",
        "Si encuentras contradicciones o información poco clara, puedes señalarlo indicando que requiere revisión humana.",
        "No inventes números de artículos legales o disposiciones que no aparezcan en el contrato.",
        "No necesitas repetir todo el contrato.",
    ];

    if (role === "ADMIN") {
        return [
            ...common,

            "",
            "El usuario es un ADMINISTRADOR.",

            "Puedes ayudarle especialmente a:",
            "- resumir el expediente;",
            "- identificar obligaciones de las partes;",
            "- localizar salario, jornada, fechas y prestaciones;",
            "- explicar cláusulas;",
            "- identificar puntos que convendría revisar antes de aprobar;",
            "- detectar posibles inconsistencias dentro del propio documento;",
            "- localizar condiciones de confidencialidad o terminación.",

            "Puedes ser relativamente detallado cuando sea útil.",
        ].join("\n");
    }

    return [
        ...common,

        "",
        "El usuario es la PERSONA CLIENTE/TRABAJADORA relacionada con este contrato.",

        "Explícale el contenido con lenguaje sencillo.",
        "Prioriza información directamente relevante para esa persona.",
        "No le indiques que firme si tiene dudas importantes.",
        "Si la pregunta implica una decisión legal, recomienda confirmar con administración o con una persona profesional competente.",
    ].join("\n");
}


/**
 * Obtiene el contenido textual de la respuesta
 * independientemente de cómo OpenRouter lo entregue.
 */
function extractOpenRouterText(data) {
    const content =
        data?.choices?.[0]
            ?.message?.content;

    if (
        typeof content ===
        "string"
    ) {
        return content.trim();
    }

    if (
        Array.isArray(content)
    ) {
        return content
            .map((part) => {
                if (
                    typeof part ===
                    "string"
                ) {
                    return part;
                }

                return (
                    part?.text ||
                    ""
                );
            })
            .join("")
            .trim();
    }

    return "";
}


/**
 * Hace la consulta real a OpenRouter.
 */
async function askOpenRouter({
    assignment,
    question,
    role,
    contractText,
}) {
    /*
     * Evitamos mandar contratos absurdamente grandes.
     *
     * Para SEAL normalmente será más que suficiente.
     */
    const MAX_CONTRACT_CHARS =
        30000;

    const safeContractText =
        String(
            contractText || ""
        ).slice(
            0,
            MAX_CONTRACT_CHARS
        );

    const systemInstruction =
        buildSystemInstruction(
            role
        );

    const assignmentContext = [
        `Título: ${
            assignment.contract_title ||
            "No especificado"
        }`,

        `Estado del expediente: ${
            assignment.status ||
            "No especificado"
        }`,

        `Rol de quien pregunta: ${
            role
        }`,
    ].join("\n");

    const userContent = [
        "DATOS DEL EXPEDIENTE:",
        assignmentContext,

        "",
        "CONTRATO:",
        safeContractText,

        "",
        "PREGUNTA:",
        question,

        "",
        "Responde utilizando únicamente el contrato anterior.",
    ].join("\n");

    const response =
        await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    Authorization:
                        `Bearer ${OPENROUTER_API_KEY}`,

                    "Content-Type":
                        "application/json",

                    "X-Title":
                        "SEAL Contract Assistant",
                },

                body: JSON.stringify({
                    model:
                        OPENROUTER_MODEL,

                    messages: [
                        {
                            role: "system",
                            content:
                                systemInstruction,
                        },

                        {
                            role: "user",
                            content:
                                userContent,
                        },
                    ],

                    temperature:
                        Math.min(
                            Number(
                                OPENROUTER_TEMPERATURE ||
                                0.3
                            ),
                            0.3
                        ),

                    /*
                     * Este asistente no necesita
                     * respuestas tan largas como
                     * la generación de contratos.
                     */
                    max_tokens:
                        1200,

                    stream:
                        false,
                }),
            }
        );

    if (!response.ok) {
        const body =
            await response.text();

        const err =
            new Error(
                `OpenRouter contract assistant error (${response.status})`
            );

        err.status =
            response.status;

        err.body =
            body;

        throw err;
    }

    const data =
        await response.json();

    const answer =
        extractOpenRouterText(
            data
        );

    if (!answer) {
        throw new Error(
            "OpenRouter returned an empty contract assistant response"
        );
    }

    return {
        answer,

        model:
            data?.model ||
            OPENROUTER_MODEL,
    };
}


/**
 * Punto de entrada utilizado tanto por
 * ADMIN como por CLIENT.
 */
async function askAboutAssignment({
    assignment,
    question,
    role,
}) {
    /*
     * resolved_html_snapshot contiene el contrato
     * ya renderizado con los datos del expediente.
     */
    const html =
        assignment.resolved_html_snapshot ||
        assignment.template_html_snapshot ||
        "";

    const text =
        stripHtml(html);

    if (!text) {
        return {
            mode: "local-contract-assistant",

            answer:
                "No hay contenido de contrato disponible para analizar en este expediente.",

            snippets: [],
        };
    }

    const snippets =
        findRelevantSnippets({
            text,
            question,
        });

    /*
     * Si OpenRouter no está configurado,
     * utilizamos el asistente local anterior.
     */
    if (
        !String(
            OPENROUTER_API_KEY ||
            ""
        ).trim()
    ) {
        return buildLocalFallback({
            question,
            assignment,
            role,
            text,
        });
    }

    try {
        const result =
            await askOpenRouter({
                assignment,
                question,
                role,
                contractText:
                    text,
            });

        return {
            mode:
                "openrouter-contract-assistant",

            answer:
                result.answer,

            snippets,

            model:
                result.model,
        };
    } catch (error) {
        /*
         * Para una demo es mejor conservar
         * funcionalidad aunque OpenRouter falle.
         */
        console.error(
            "[CONTRACT_ASSISTANT] OpenRouter failed:",
            error?.message ||
            error
        );

        return buildLocalFallback({
            question,
            assignment,
            role,
            text,
        });
    }
}


module.exports = {
    askAboutAssignment,
};
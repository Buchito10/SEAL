function stripHtml(html) {
    return String(html || "")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function splitSentences(text) {
    return String(text || "")
        .split(/(?<=[.!?])\s+|\n+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 20);
}

function keywordsFrom(question) {
    const stop = new Set([
        "que", "qué", "para", "por", "con", "del", "los", "las", "una", "uno", "como", "cómo",
        "este", "esta", "esto", "contrato", "clausula", "cláusula", "significa", "quiere", "decir",
    ]);

    return String(question || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 4 && !stop.has(word));
}

function findRelevantSnippets({ text, question }) {
    const sentences = splitSentences(text);
    const words = keywordsFrom(question);
    if (words.length === 0) return sentences.slice(0, 2);

    return sentences
        .map((sentence) => {
            const normalized = sentence.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const score = words.reduce((total, word) => total + (normalized.includes(word) ? 1 : 0), 0);
            return { sentence, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((item) => item.sentence);
}

function buildGuidance({ question, assignment, role }) {
    const q = String(question || "").toLowerCase();
    const title = assignment.contract_title || "este contrato";

    if (q.includes("firm")) {
        return role === "CLIENT"
            ? "Si ya revisaste el documento y estás de acuerdo, puedes firmar desde la pestaña Firmar. Si algo no te queda claro, pregunta a administración antes de confirmar."
            : "El contrato solo puede aprobarse cuando el cliente ya lo haya firmado. Después de aprobarlo, se genera el PDF final para descarga.";
    }

    if (q.includes("salario") || q.includes("sueldo") || q.includes("pago")) {
        return "Revisa que el monto, periodicidad y cualquier prestación coincidan con lo acordado antes de continuar.";
    }

    if (q.includes("jornada") || q.includes("horario")) {
        return "Confirma que la jornada, horario, modalidad y descansos estén claros y coincidan con el puesto.";
    }

    if (q.includes("fecha") || q.includes("duracion") || q.includes("duración")) {
        return "Verifica fechas de inicio, vigencia, duración y cualquier condición de terminación o renovación.";
    }

    return `Puedo ayudarte a ubicar y explicar partes de ${title}. La respuesta es orientativa y no sustituye revisión legal.`;
}

async function askAboutAssignment({ assignment, question, role }) {
    const text = stripHtml(assignment.resolved_html_snapshot || assignment.template_html_snapshot || "");
    const snippets = findRelevantSnippets({ text, question });
    const guidance = buildGuidance({ question, assignment, role });

    const context = snippets.length
        ? `Encontré estas partes relacionadas:\n${snippets.map((item) => `- ${item}`).join("\n")}`
        : "No encontré una cláusula exacta con esos términos en el contrato renderizado.";

    return {
        mode: "local-contract-assistant",
        answer: [
            guidance,
            "",
            context,
            "",
            "Sugerencia: si la duda afecta obligaciones, pagos, vigencia, confidencialidad o terminación, pide confirmación a administración antes de firmar.",
        ].join("\n"),
        snippets,
    };
}

module.exports = {
    askAboutAssignment,
};

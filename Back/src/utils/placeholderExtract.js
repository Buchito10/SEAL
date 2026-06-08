function extractPlaceholdersFromHtml(html) {
    const out = new Set();
    const s = String(html || "");

    // {{ employee.rfc }}
    const reBraces = /{{\s*([a-zA-Z0-9_.]+)\s*}}/g;
    let m;
    while ((m = reBraces.exec(s))) out.add(m[1]);

    return Array.from(out);
}

module.exports = { extractPlaceholdersFromHtml };
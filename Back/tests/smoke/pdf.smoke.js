// Real Chromium smoke test. Set PUPPETEER_EXECUTABLE_PATH when using a system browser.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { htmlToPdfBuffer, buildSignedHtml } = require("../../src/services/pdf.service");

(async () => {
  const html = buildSignedHtml({
    baseHtml: "<h1>SEAL · Prueba de exportación</h1><p>Documento ficticio para verificar el motor PDF.</p><p>Jornada: lunes a viernes.</p><script>document.body.replaceChildren()</script>",
    assignment: {},
  });
  const { buffer, hash } = await htmlToPdfBuffer({ html });
  const bytes = Buffer.from(buffer);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.ok(bytes.length > 5000, "The document should contain text, not a blank page produced by injected JavaScript");
  assert.equal(hash, crypto.createHash("sha256").update(bytes).digest("hex"));
  console.log(`PDF smoke passed: ${bytes.length} bytes, document scripts disabled, SHA-256 verified.`);
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

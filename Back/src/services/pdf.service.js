const { sha256Hex } = require("../utils/html");

const PDF_RENDERER_VERSION = "seal-pdf-v2";

/**
 * Genera un PDF desde HTML usando Puppeteer.
 * Requiere instalar dependencia: puppeteer
 */
async function htmlToPdfBuffer({ html, format = "A4" }) {
    let puppeteer;
    try {
        puppeteer = require("puppeteer");
    } catch (e) {
        const err = new Error("PDF engine not installed (missing puppeteer)");
        err.code = 500;
        err.details = { hint: "Install puppeteer dependency" };
        throw err;
    }

    const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        await page.emulateMediaType("print");
        const buf = await page.pdf({
            format,
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
        });
        return { buffer: buf, hash: sha256Hex(buf) };
    } finally {
        await browser.close();
    }
}

function buildSignedHtml({ baseHtml, signatureUrl, assignment }) {
    const signatureBlock = signatureUrl
        ? `
      <section class="seal-signature-section">
        <div class="seal-signature-heading">Firma digital del empleado</div>
        <div class="seal-signature-line"></div>
        <div class="seal-signature-box">
          <img src="${signatureUrl}" alt="Firma digital plasmada en el contrato"/>
          <div class="seal-signature-meta">
            <strong>Firmado digitalmente</strong>
            <span>${assignment?.signed_at || ""}</span>
          </div>
        </div>
        <div class="seal-signature-hash">Hash: ${assignment?.signature?.hash || "registrado"}</div>
      </section>
`
        : "";

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>
      @page {
        size: A4;
        margin: 22mm 20mm 24mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #111827;
        background: #fff;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 11.5pt;
        line-height: 1.45;
      }

      .seal-doc {
        width: 100%;
      }

      .seal-contract-content {
        overflow-wrap: anywhere;
      }

      .seal-contract-content h1,
      .seal-contract-content h2,
      .seal-contract-content h3,
      .seal-contract-content h4 {
        margin: 0 0 12pt;
        color: #111827;
        font-weight: 700;
        line-height: 1.2;
        page-break-after: avoid;
      }

      .seal-contract-content h1 {
        font-size: 18pt;
      }

      .seal-contract-content h2 {
        margin-top: 18pt;
        font-size: 14pt;
        letter-spacing: .02em;
      }

      .seal-contract-content h3,
      .seal-contract-content h4 {
        margin-top: 14pt;
        font-size: 12pt;
      }

      .seal-contract-content p {
        margin: 0 0 11pt;
      }

      .seal-contract-content ul,
      .seal-contract-content ol {
        margin: 0 0 11pt 18pt;
        padding: 0;
      }

      .seal-contract-content li {
        margin: 0 0 5pt;
      }

      .seal-contract-content table {
        width: 100%;
        margin: 12pt 0;
        border-collapse: collapse;
        page-break-inside: avoid;
      }

      .seal-contract-content th,
      .seal-contract-content td {
        padding: 7pt 8pt;
        border: 1px solid #d1d5db;
        vertical-align: top;
      }

      .seal-contract-content th {
        background: #f3f4f6;
        font-weight: 700;
      }

      .seal-signature-section {
        width: 74mm;
        margin: 28mm 0 0 auto;
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
        text-align: center;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .seal-signature-heading {
        margin-bottom: 6pt;
        color: #374151;
        font-size: 9pt;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .seal-signature-line {
        height: 1px;
        margin-bottom: 7pt;
        background: #111827;
      }

      .seal-signature-box {
        padding: 6pt 8pt 5pt;
        border: 1px solid #d1d5db;
        border-radius: 4pt;
        background: #f9fafb;
      }

      .seal-signature-box img {
        display: block;
        width: 100%;
        height: 22mm;
        object-fit: contain;
      }

      .seal-signature-meta {
        display: flex;
        justify-content: space-between;
        gap: 8pt;
        margin-top: 4pt;
        padding-top: 4pt;
        border-top: 1px solid #d1d5db;
        font-size: 7.5pt;
      }

      .seal-signature-meta span {
        color: #4b5563;
        white-space: nowrap;
      }

      .seal-signature-hash {
        margin-top: 5pt;
        overflow: hidden;
        color: #6b7280;
        font-size: 7pt;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    </style>
  </head>
  <body>
    <div class="seal-doc">
      <div class="seal-contract-content">
        ${baseHtml || ""}
      </div>
      ${signatureBlock}
    </div>
  </body>
</html>
`;
}

module.exports = { htmlToPdfBuffer, buildSignedHtml, PDF_RENDERER_VERSION };

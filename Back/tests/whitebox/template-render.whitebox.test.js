const { escapeHtml, sha256Hex } = require("../../src/utils/html");
const { renderTemplateHtml } = require("../../src/utils/placeholderRender");
const {
  validatePlaceholdersOrThrow,
} = require("../../src/utils/placeholders");

describe("Caja blanca del renderizado de contratos", () => {
  test.each([
    [null, ""],
    [undefined, ""],
    ["<script>", "&lt;script&gt;"],
    ['A&B "Legal"', "A&amp;B &quot;Legal&quot;"],
    ["O'Connor", "O&#39;Connor"],
  ])("recorre las ramas de escapeHtml para %p", (input, expected) => {
    expect(escapeHtml(input)).toBe(expected);
  });

  test("reemplaza tokens heredados y data-ph y elimina valores ausentes", () => {
    const template = [
      '<span data-ph="employee.name">Nombre</span>',
      "{{ company.position }}",
      "{{ employee.phone }}",
    ].join(" | ");

    const result = renderTemplateHtml(template, {
      "employee.name": "Ana <Admin>",
      "company.position": "QA & Seguridad",
    });

    expect(result).toBe(
      "Ana &lt;Admin&gt; | QA &amp; Seguridad | "
    );
  });

  test("rechaza la rama data-ph antes de revisar el catálogo", () => {
    try {
      validatePlaceholdersOrThrow('<span data-ph="employee.name">x</span>');
      throw new Error("Se esperaba que la validación rechazara data-ph");
    } catch (error) {
      expect(error).toMatchObject({
        code: 400,
        details: { reason: "DISALLOWED_DATA_PH" },
      });
    }
  });

  test("genera un hash SHA-256 estable para la evidencia documental", () => {
    expect(sha256Hex("SEAL")).toBe(
      "a5fd9d6c9c5442d8749ef9df86ded9c700d3688b409d78773408e95bb1d2fad4"
    );
  });
});

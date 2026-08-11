const {
  extractPlaceholders,
  validatePlaceholdersOrThrow,
} = require("../../src/utils/placeholders");

describe("Lógica de plantillas de contratos", () => {
  test("extrae placeholders sin repetirlos", () => {
    const html = `
      <p>{{ employee.name }}</p>
      <p>{{company.salary}}</p>
      <p>{{ employee.name }}</p>
    `;

    expect(extractPlaceholders(html)).toEqual([
      "employee.name",
      "company.salary",
    ]);
  });

  test("acepta únicamente placeholders del catálogo de SEAL", () => {
    const result = validatePlaceholdersOrThrow(
      "Contrato para {{ employee.name }} con puesto {{ company.position }}"
    );

    expect(result).toEqual({
      used_placeholders: ["employee.name", "company.position"],
    });
  });

  test("rechaza placeholders desconocidos", () => {
    expect(() =>
      validatePlaceholdersOrThrow("{{ employee.password }}")
    ).toThrow("Invalid placeholder(s)");

    try {
      validatePlaceholdersOrThrow("{{ employee.password }}");
    } catch (error) {
      expect(error.code).toBe(400);
      expect(error.details.invalid_placeholders).toEqual([
        "employee.password",
      ]);
    }
  });
});

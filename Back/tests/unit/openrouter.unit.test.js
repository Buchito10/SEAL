const defaultEnv = {
  OPENROUTER_API_KEY: "",
  OPENROUTER_MODEL: "openrouter/free",
  OPENROUTER_TEMPERATURE: 0.3,
  OPENROUTER_MAX_OUTPUT_TOKENS: 2500,
};

function loadTemplateService(env = {}) {
  jest.resetModules();
  jest.doMock("../../src/config/env", () => ({ ...defaultEnv, ...env }));
  return require("../../src/services/openrouter.service");
}

function loadContractAssistant(env = {}) {
  jest.resetModules();
  jest.doMock("../../src/config/env", () => ({ ...defaultEnv, ...env }));
  return require("../../src/services/contractAssistant.service");
}

describe("Integración de OpenRouter con respaldo local", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("genera una plantilla local cuando no existe API key", async () => {
    const { generateContractTemplate } = loadTemplateService();

    const result = await generateContractTemplate({
      history: [],
      userText: "Genera una plantilla de contrato laboral",
      currentTemplateHtml: "",
      chatContext: {},
    });

    expect(result.mode).toBe("fallback");
    expect(result.provider).toBe("fallback");
    expect(result.template_html).toContain("{{ employee.name }}");
    expect(result.assistant_message).toMatch(/revisión humana\/legal/i);
  });

  test("el asistente consulta OpenRouter usando únicamente el contrato y la pregunta", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "openrouter/free",
        choices: [{ message: { content: "El salario indicado es de $32,000 MXN mensuales." } }],
      }),
    });

    const { askAboutAssignment } = loadContractAssistant({
      OPENROUTER_API_KEY: "test-key-not-real",
    });

    const result = await askAboutAssignment({
      assignment: {
        contract_title: "Contrato demo",
        status: "IN_REVIEW",
        resolved_html_snapshot: "<h1>Contrato demo</h1><p>Salario: $32,000 MXN mensuales.</p>",
      },
      question: "¿Cuál es el salario?",
      role: "CLIENT",
    });

    expect(result.mode).toBe("openrouter-contract-assistant");
    expect(result.answer).toContain("$32,000 MXN");
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const request = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(request.model).toBe("openrouter/free");
    expect(request.messages[1].content).toContain("Salario: $32,000 MXN mensuales.");
    expect(request.messages[1].content).toContain("¿Cuál es el salario?");
    expect(request.messages[1].content).toContain("utilizando únicamente el contrato anterior");
  });
});

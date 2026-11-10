const { test, expect } = require("@playwright/test");
const { mockWorkspace } = require("../fixtures/workspace");

for (const role of ["ADMIN", "CLIENT"]) {
  test(`${role} chat shows thinking, preserves the next draft and retries in place`, async ({ page }) => {
    await mockWorkspace(page, role);
    await page.setViewportSize({ width: role === "CLIENT" ? 390 : 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    let release;
    const waiting = new Promise(resolve => { release = resolve; });
    let attempts = 0;
    await page.route("**/ai/ask", async route => {
      attempts++;
      if (attempts === 1) {
        await waiting;
        return route.fulfill({ status: 503, json: { ok: false, message: "Servicio temporalmente no disponible" } });
      }
      return route.fulfill({ json: { ok: true, data: { answer: "**Respuesta recuperada.**\n\nRevisa el documento.", snippets: [] } } });
    });
    try {
      await page.goto(role === "CLIENT" ? "/cliente/dashboard" : "/contratos");
      await page.getByRole("button", { name: "IA", exact: true }).click();
      const input = page.getByRole("textbox", { name: "Mensaje a SEAL IA" });
      await input.fill("Explícame mi contrato"); await input.press("Enter");
      await expect(page.getByRole("status", { name: "Revisando el contrato…" })).toBeVisible();
      await expect(page.locator(".seal-thinking i").first()).toHaveCSS("animation-name", "seal-thinking");
      await expect(input).toBeEditable();
      await input.fill("Esta es mi siguiente pregunta");
      await input.press("Enter");
      expect(attempts).toBe(1);
      await expect(page.getByRole("button", { name: "Enviar mensaje", exact: true })).toBeDisabled();
      await page.screenshot({ path: `reports/chat-thinking-${role.toLowerCase()}.png`, fullPage: true, animations: "disabled" });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(page.locator(".seal-thinking i").first()).toHaveCSS("animation-name", "none");
      release();
      await expect(page.locator(".seal-chat-error").getByRole("alert")).toBeVisible();
      await expect(input).toHaveValue("Esta es mi siguiente pregunta");
      await page.getByRole("button", { name: "Reintentar respuesta" }).click();
      await expect(page.locator(".seal-answer")).toContainText("Respuesta recuperada.");
      await expect(page.locator(".seal-question")).toHaveCount(1);
      await expect(page.locator(".seal-thinking")).toHaveCount(0);
      await expect(input).toHaveValue("Esta es mi siguiente pregunta");
      await expect(page.locator(".seal-answer").getByRole("button", { name: "Copiar respuesta" })).toBeVisible();
      await noOverflow(page);
      await page.screenshot({ path: `reports/chat-conversation-${role.toLowerCase()}.png`, fullPage: true });
    } finally { release(); }
  });
}

test("template studio uses the same conversation and keeps a draft while generating", async ({ page }) => {
  await mockWorkspace(page);
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  await page.route("**/admin/ai-chats/*/messages", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    await waiting;
    return route.fulfill({ json: { ok: true, data: { assistant_message: { id: "reply", role: "assistant", text: "**Propuesta lista.** Revisa el contenido." } } } });
  });
  try {
    await page.goto("/plantillas/ia");
    const input = page.getByRole("textbox", { name: "Mensaje a SEAL IA" });
    await expect(input).toBeEditable();
    await input.fill("Crea una plantilla de ejemplo"); await input.press("Enter");
    await expect(page.locator(".seal-question")).toContainText("Crea una plantilla de ejemplo");
    await expect(page.getByRole("status", { name: "Preparando una respuesta…" })).toBeVisible();
    await input.fill("Después añade un campo para el puesto");
    release();
    await expect(page.locator(".seal-answer")).toContainText("Propuesta lista.");
    await expect(input).toHaveValue("Después añade un campo para el puesto");
    await expect(page.locator(".seal-thinking")).toHaveCount(0);
    await noOverflow(page);
  } finally { release(); }
});

test("a reply does not pull the reader away from earlier messages", async ({ page }) => {
  await mockWorkspace(page);
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  let attempts = 0;
  await page.route("**/ai/ask", async route => {
    if (++attempts === 2) await waiting;
    return route.fulfill({ json: { ok: true, data: { answer: Array.from({ length: 24 }, (_, i) => `Cláusula de ejemplo ${i + 1}. Consulta los detalles del contrato.`).join("\n\n") } } });
  });
  try {
    await page.goto("/contratos");
    await page.getByRole("button", { name: "IA", exact: true }).click();
    const input = page.getByRole("textbox", { name: "Mensaje a SEAL IA" });
    await input.fill("Explica las cláusulas"); await input.press("Enter");
    await expect(page.locator(".seal-answer")).toHaveCount(1);
    await input.fill("¿Qué más debo revisar?"); await input.press("Enter");
    await expect(page.locator(".seal-thinking")).toBeVisible();
    const transcript = page.getByRole("log", { name: "Consultas del contrato" });
    await transcript.evaluate(element => { element.scrollTop = 0; element.dispatchEvent(new Event("scroll")); });
    release();
    await expect(page.locator(".seal-answer")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Ir al último mensaje" })).toBeVisible();
    expect(await transcript.evaluate(element => element.scrollTop)).toBe(0);
    await page.getByRole("button", { name: "Ir al último mensaje" }).click();
    await expect.poll(() => transcript.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(2);
  } finally { release(); }
});

test("official shield loads intact across public, admin and client screens", async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/login", "/firma-movil", "/reset-password", "/activar-cuenta", "/politicas"]) {
      await page.goto(path);
      await expect(page.locator(".seal-logo:visible").first()).toBeVisible();
      for (const logo of await page.locator(".seal-logo:visible").all()) {
        await logo.scrollIntoViewIfNeeded();
        await expect(logo).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect.poll(() => logo.evaluate(img => img.complete && img.naturalWidth > 0 && img.clientWidth === img.clientHeight)).toBe(true);
      }
      await noOverflow(page);
    }
    await mockWorkspace(page);
    await page.goto("/plantillas/ia");
    await expect(page.locator(".ai-chat-welcome > .seal-logo")).toBeVisible();
    await expect.poll(() => page.locator(".seal-logo:visible").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    await noOverflow(page);
    await mockWorkspace(page, "CLIENT");
    await page.goto("/cliente/dashboard");
    await expect(page.locator(".seal-client-brand .seal-logo")).toBeVisible();
    await noOverflow(page);
    await page.unroute("**/api/**");
    await page.context().clearCookies();
  }
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/brand/seal-escudo-transparente.png");
  expect((await page.request.get("/brand/seal-escudo-transparente.png")).status()).toBe(200);
});

test("mobile signature QR is generated locally and its link can be selected on HTTP", async ({ page }) => {
  await mockWorkspace(page, "CLIENT");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true }));
  const externalQrRequests = [];
  page.on("request", request => { if (request.url().includes("qrserver.com")) externalQrRequests.push(request.url()); });
  await page.goto("/cliente/dashboard");
  const link = `${new URL(page.url()).origin}/firma-movil?token=solo-prueba-qr`;
  await page.route("**/sign-token", route => route.fulfill({ status: 201, json: { ok: true, data: { link, expires_at: "2030-01-01T12:00:00Z", expires_minutes: 10 } } }));
  await page.getByRole("button", { name: "Firmar", exact: true }).click();
  await page.getByRole("button", { name: "Firmar con celular", exact: true }).click();
  await expect(page.locator('svg[aria-label="QR para firmar desde celular"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir enlace", exact: true })).toHaveAttribute("href", link);
  await page.getByRole("button", { name: "Copiar link", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Enlace para firmar" });
  await expect(field).toHaveValue(link);
  await expect(field).toBeFocused();
  expect(await field.evaluate(input => input.selectionEnd - input.selectionStart)).toBe(link.length);
  expect(externalQrRequests).toEqual([]);
  await noOverflow(page);
});

test("mobile signing stays white in dark device mode and submits a drawn signature", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  let signature;
  await page.route("**/api/**", (route) => {
    if (route.request().method() === "POST") {
      signature = route.request().postDataJSON();
      return route.fulfill({ json: { ok: true, data: { signed: true } } });
    }
    return route.fulfill({ json: { ok: true, data: { contract_title: "Contrato de demostración", client_name: "Persona de prueba", expires_at: "2026-09-09T21:00:00Z" } } });
  });
  await page.goto("/firma-movil?token=solo-prueba");
  await expect(page.locator("canvas")).toBeVisible();
  for (const selector of [".login", ".login__card", ".signature-canvas"]) {
    await expect(page.locator(selector)).toHaveCSS("background-color", "rgb(255, 255, 255)");
  }
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.move(box.x + 25, box.y + 80); await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 140, { steps: 5 }); await page.mouse.up();
  await expect(page.getByRole("button", { name: "Confirmar firma" })).toBeEnabled();
  await page.screenshot({ path: "reports/mobile-signature-light.png", animations: "disabled" });
  await page.getByRole("button", { name: "Confirmar firma" }).click();
  await expect(page.getByText("Firma recibida", { exact: true })).toBeVisible();
  expect(signature.signature_png_base64).toMatch(/^data:image\/png;base64,/);
});

for (const route of ["/reset-password", "/activar-cuenta"]) {
  test(`${route} keeps account access and errors on a white surface`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(route);
    await expect(page.locator(".login__card")).toBeVisible();
    await expect(page.locator(".login")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator(".login__card")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await noOverflow(page);
  });
}

test("login explains an interrupted upstream connection and allows retry", async ({ page }) => {
  await mockWorkspace(page);
  let attempts = 0;
  await page.route("**/api/auth/login", (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 500, contentType: "text/plain", body: "Internal Server Error" })
      : route.fulfill({ json: { ok: true, data: { user: { id: "demo-admin", name: "Equipo SEAL", email: "admin@example.test", role: "ADMIN", status: "ACTIVE", profile_completed: true } } } });
  });
  await page.goto("/login");
  const form = page.locator(".login__card--form");
  await form.getByLabel("Correo institucional").fill("admin@example.test");
  await form.locator('input[type="password"]').fill("contraseña-de-prueba");
  await form.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("No se pudo comunicar con el servicio. Intenta de nuevo en unos segundos.")).toBeVisible();
  await expect(form.getByLabel("Correo institucional")).toHaveValue("admin@example.test");
  await form.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}

test("landing: interactive stages work with keyboard and fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("tab", { name: /Prepara/ }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Revisa/ })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Cada cláusula, más clara.");
  await noOverflow(page);
  await page.screenshot({ path: "reports/landing-mobile.png", fullPage: true });
});

for (const width of [390, 768, 1440]) {
  test(`navigation and assistant at ${width}px`, async ({ page }) => {
    await mockWorkspace(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Consultar con IA" })).toBeVisible();
    await noOverflow(page);
    if (width < 1180) {
      await page.getByRole("button", { name: "Abrir menú" }).click();
      const drawer = page.getByRole("dialog", { name: "Menú de SEAL" });
      await expect(drawer.getByRole("link", { name: "Ajustes" })).toBeVisible();
      await expect(drawer.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(drawer).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
    }
    await page.screenshot({ path: `reports/dashboard-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Consultar con IA" }).click();
    const assistant = page.getByRole("dialog", { name: "SEAL IA" });
    await assistant.getByLabel("¿Qué expediente quieres consultar?").selectOption("demo-assignment");
    await assistant.getByRole("button", { name: /Resume los puntos/ }).click();
    await assistant.getByRole("textbox", { name: "Mensaje a SEAL IA" }).press("Enter");
    await expect(assistant.getByText("Resumen del documento", { exact: true })).toBeVisible();
    await expect(assistant.getByText("Respuesta de respaldo basada en el documento.")).toBeVisible();
    await assistant.getByText("Ver 1 fragmento del contrato").click();
    await expect(assistant.locator("blockquote")).toContainText("Jornada");
    await page.screenshot({ path: `reports/assistant-${width}.png`, fullPage: true });
  });
}

test("contract assistant keeps exchanges, renders safe text and restores failed input", async ({ page }) => {
  await mockWorkspace(page);
  await page.goto("/contratos");
  await page.getByRole("button", { name: "IA", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Mensaje a SEAL IA" });
  await input.fill("Primera pregunta"); await input.press("Enter");
  await expect(page.locator(".seal-answer")).toHaveCount(1);
  await input.fill("Segunda pregunta"); await input.press("Shift+Enter");
  await expect(input).toHaveValue("Segunda pregunta\n");
  await input.press("Enter"); await expect(page.locator(".seal-answer")).toHaveCount(2);
  await page.route("**/ai/ask", (route) => route.fulfill({ status: 503, json: { ok: false, message: "Servicio temporalmente no disponible" } }));
  await input.fill("Conservar esta pregunta"); await input.press("Enter");
  await expect(page.locator(".seal-assistant").getByRole("alert")).toContainText("lista para reintentar");
  await expect(input).toHaveValue("Conservar esta pregunta");
  await expect(page.locator(".seal-answer")).toHaveCount(2);
});

test("client uses the same contract assistant", async ({ page }) => {
  await mockWorkspace(page, "CLIENT");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cliente/dashboard");
  await page.getByRole("button", { name: "IA", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Mensaje a SEAL IA" });
  await input.fill("¿Qué obligaciones tengo?"); await input.press("Enter");
  await expect(page.locator(".seal-answer")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: "reports/client-mobile.png", fullPage: true });
});

test("template editor preserves fields, saves draft and warns before discarding", async ({ page }) => {
  const requests = await mockWorkspace(page);
  await page.goto("/plantillas");
  await page.getByRole("button", { name: "Editar versión actual", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Editor visual de plantilla" });
  await expect(editor).toContainText("{{ employee.name }}");
  await editor.click(); await page.keyboard.press("ControlOrMeta+End");
  await page.getByLabel("Insertar campo del contrato").selectOption("company.salary");
  await expect(editor).toContainText("{{ company.salary }}");
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(page.getByText("Sin cambios pendientes", { exact: true })).toBeVisible();
  expect(requests.find((request) => request.path.endsWith("/drafts") && request.method === "POST").body.template_html).toContain("{{ company.salary }}");
  await editor.press("ControlOrMeta+End"); await page.keyboard.type(" Cambio pendiente.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator(".templates-editor-modal").getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(editor).toBeVisible();
  await page.screenshot({ path: "reports/template-editor.png", animations: "disabled" });
});

test("AI studio generates a proposal and allows a visual human edit before publishing", async ({ page }) => {
  const requests = await mockWorkspace(page);
  await page.goto("/plantillas/ia");
  const input = page.getByRole("textbox", { name: "Mensaje a SEAL IA" });
  await input.fill("Genera una plantilla para desarrollo"); await input.press("Enter");
  await expect(page.getByText("Propuesta lista.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver plantilla", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Editor visual de plantilla" });
  await expect(editor).toBeVisible();
  await page.getByRole("button", { name: "Código HTML", exact: true }).click();
  await page.getByLabel("HTML de la plantilla").fill('<h1>Contrato revisado</h1><p>{{ employee.name }}</p><script>window.sealInjected=true</script>');
  await page.getByRole("button", { name: "Documento", exact: true }).click();
  await expect(editor).toContainText("Contrato revisado");
  expect(await page.evaluate(() => window.sealInjected)).toBeUndefined();
  await page.getByLabel("Nota de revisión").fill("Revisé y ajusté el título y los campos de esta plantilla de demostración.");
  await page.getByRole("button", { name: "Publicar como plantilla v1" }).click();
  await expect(page.getByText(/publicada como contrato base v1/)).toBeVisible();
  const edit = requests.find((request) => request.path.endsWith("/human-edit"));
  expect(edit.body.template_html).toContain("Contrato revisado");
  expect(edit.body.template_html).not.toContain("<script>");
});

test("expired session returns to login instead of leaving a loading screen", async ({ page }) => {
  await mockWorkspace(page);
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Consultar con IA" })).toBeVisible();
  await page.route("**/api/admin/assignments", (route) => route.fulfill({ status: 401, json: { ok: false, message: "Sesión vencida" } }));
  await page.getByRole("button", { name: "Consultar con IA" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("a published template remains successful when refreshing its list fails", async ({ page }) => {
  const requests = await mockWorkspace(page);
  await page.goto("/plantillas/ia");
  const input = page.getByRole("textbox", { name: "Mensaje a SEAL IA" });
  await input.fill("Genera una plantilla de prueba"); await input.press("Enter");
  await page.getByRole("button", { name: "Ver plantilla", exact: true }).click();
  await page.getByLabel("Nota de revisión").fill("Revisé los datos y el contenido de esta plantilla de demostración.");
  await page.route("**/api/admin/contracts", (route) => route.fulfill({ status: 503, json: { ok: false, message: "Lista temporalmente no disponible" } }));
  await page.getByRole("button", { name: "Publicar como plantilla v1" }).click();
  await expect(page.getByText(/No necesitas publicar de nuevo/)).toBeVisible();
  expect(requests.filter((request) => request.path.endsWith("/publish-to-contract"))).toHaveLength(1);
});

test("template editing and AI review fit a phone", async ({ page }) => {
  await mockWorkspace(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/plantillas");
  await noOverflow(page);
  await page.getByRole("button", { name: "Editar versión actual", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Editor de plantilla", exact: true });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("button", { name: "Cerrar", exact: true })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
  await expect(page.getByRole("textbox", { name: "Editor visual de plantilla" })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: "reports/editor-mobile.png", animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Editar versión actual", exact: true })).toBeFocused();
  await page.goto("/plantillas/ia");
  const input = page.getByRole("textbox", { name: "Mensaje a SEAL IA" });
  await input.fill("Genera una plantilla de prueba"); await input.press("Enter");
  await page.getByRole("button", { name: "Ver plantilla", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Editor visual de plantilla" })).toBeVisible();
  await noOverflow(page);
  await page.getByLabel("Nota de revisión").scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Nota de revisión")).toBeVisible();
  await page.screenshot({ path: "reports/studio-mobile.png", fullPage: true });
});

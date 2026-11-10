// Deterministic UI fixtures. No Firebase, email, signatures or AI provider calls.
const user = { id: "demo-admin", name: "Equipo SEAL", email: "admin@example.test", role: "ADMIN", status: "ACTIVE", profile_completed: true };
const client = { id: "demo-client", name: "Ana Torres Demo", email: "ana@example.test", role: "CLIENT", status: "ACTIVE", profile_completed: true };
const contract = { id: "demo-template", title: "Contrato laboral de ejemplo", position: "Desarrollo", area: "Tecnología", status: "ACTIVE", current_version: 2, base_placeholders_used: ["employee.name"], created_at: "2026-09-01T12:00:00Z" };
const assignment = { id: "demo-assignment", contract_id: contract.id, contract_title: contract.title, contract_version: 2, client_id: client.id, client_name: client.name, client_email: client.email, status: "VIEWED", chat_status: "OPEN", events: [], created_at: "2026-09-05T12:00:00Z", resolved_html_snapshot: "<h1>Contrato de ejemplo</h1><p>Jornada de lunes a viernes.</p>", placeholders_company_values: {}, placeholders_employee_snapshot: {} };
const template = { contract_id: contract.id, version: 2, template_html: "<h1>Contrato laboral</h1><p>Nombre: {{ employee.name }}</p><p>Jornada de lunes a viernes.</p>", placeholders_used: ["employee.name"], commits: [], is_base: false };
const catalog = { employee: [{ key: "employee.name", label: "Nombre del cliente" }], company: [{ key: "company.salary", label: "Salario" }, { key: "company.position", label: "Puesto" }] };

async function mockWorkspace(page, role = "ADMIN") {
  const requests = [];
  let chats = [];
  let messages = [];
  await page.context().addCookies([{ name: "seal_session", value: "ui-fixture-only", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    const method = route.request().method();
    const body = route.request().postDataJSON();
    requests.push({ path, method, body });
    let data;
    if (path === "/auth/session") data = { user: role === "ADMIN" ? user : client };
    else if (path === "/auth/logout") data = { logged_out: true };
    else if (path === "/admin/users") data = [client];
    else if (path === "/client/profile") data = client;
    else if (path === "/admin/contracts") data = [contract];
    else if (path === "/admin/contracts/placeholders") data = catalog;
    else if (path === "/admin/system/status") data = { environment: "test", storage: { mode: "local", persistent: true }, ai: { configured: false, mode: "fallback" }, security: { http_only_session_cookie: true, secure_cookie: false, api_rate_limit_per_minute: 300 }, checked_at: "2026-09-06T12:00:00Z" };
    else if (/^\/(admin|client)\/assignments$/.test(path)) data = [assignment];
    else if (/\/assignments\/demo-assignment$/.test(path)) data = assignment;
    else if (/\/assignments\/demo-assignment\/messages$/.test(path)) data = [];
    else if (/\/ai\/ask$/.test(path)) data = { answer: "**Resumen del documento**\n\n- Jornada de lunes a viernes.\n- Revisa las obligaciones antes de firmar.", snippets: ["Jornada de lunes a viernes."], mode: "local-contract-assistant" };
    else if (path === `/admin/contracts/${contract.id}`) data = contract;
    else if (path.endsWith("/versions") && method === "GET") data = { contract_id: contract.id, current_version: 2, versions: [{ version: 1, display_version: 1, is_base: true }, { version: 2, display_version: 2, is_base: false }] };
    else if (path.endsWith("/template")) data = method === "GET" ? template : { version: template };
    else if (path.endsWith("/drafts")) data = method === "GET" ? [] : { draft_id: "demo-draft", draft: { ...body, updated_at: "2026-09-06T12:00:00Z", expires_at: "2026-09-08T12:00:00Z" } };
    else if (path.endsWith("/lock")) data = method === "DELETE" ? { released: true } : { lock: { locked_by: user.id, expires_at: "2030-01-01T00:00:00Z" } };
    else if (path === "/admin/ai-chats") {
      if (method === "POST") chats.unshift({ id: "demo-chat", ...body, status: "OPEN" });
      data = method === "POST" ? chats[0] : chats;
    } else if (path.endsWith("/messages") && path.startsWith("/admin/ai-chats/")) {
      if (method === "POST") {
        const message = { id: `assistant-${messages.length}`, role: "assistant", text: "**Propuesta lista.** Revisa el documento antes de publicarlo.", created_at: "2026-09-06T12:00:00Z" };
        messages.push({ id: `user-${messages.length}`, role: "user", text: body.text }, message);
        chats[0].ai_last_template_html = template.template_html;
        data = { assistant_message: message, template_html: template.template_html };
      } else data = messages;
    } else if (path.endsWith("/human-edit")) data = { saved: true };
    else if (path.endsWith("/publish-to-contract")) data = contract;
    else return route.fulfill({ status: 404, json: { ok: false, message: `Unmocked route: ${path}` } });
    return route.fulfill({ json: { ok: true, data } });
  });
  return requests;
}
module.exports = { mockWorkspace };

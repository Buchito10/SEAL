// Real integration test. Mutates ONLY the dedicated, fictitious event test account.
// Run from Back after preparing event demos and starting the event launcher.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, request, expect } = require('../../../qa/node_modules/@playwright/test');
const out = path.resolve('../.release/evento');
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'cuentas.json')));
const { origin } = JSON.parse(fs.readFileSync(path.join(out, 'conexion.json')));
const checks = [];
const contexts = [];
let browser;
async function api(ctx, method, route, data, expected = 200) {
  const res = await ctx[method](`${origin}/api${route}`, { data, timeout: 60000 });
  const body = await res.json();
  assert.equal(res.status(), expected, `${method} ${route.split('?')[0]}: ${body.message || res.status()}`);
  assert.equal(body.ok, true);
  return body.data;
}
async function login(email) {
  const ctx = await request.newContext(); contexts.push(ctx);
  const result = await api(ctx, 'post', '/auth/login', { email, password: process.env.DEMO_PASSWORD });
  const state = await ctx.storageState();
  const session = state.cookies.find(c => c.name === 'seal_session');
  assert.ok(session);
  const claims = JSON.parse(Buffer.from(session.value.split('.')[1], 'base64url'));
  assert.equal(claims.exp - claims.iat, 43200, 'Event sessions must last 12 hours');
  return { ctx, user: result.user };
}
function pass(name) { checks.push({ name, ok: true }); console.log(`OK: ${name}`); }
(async () => {
  const health = await fetch(`${origin}/api/health`); assert.equal(health.status, 200);
  const page = await fetch(`${origin}/login`); assert.equal(page.status, 200);
  assert.ok(!page.headers.get('content-security-policy')?.includes('upgrade-insecure-requests'));
  pass('Front y API accesibles por IP de red, sin redirección a HTTPS');
  for (const row of manifest.clients) {
    const { ctx } = await login(row.email);
    const list = await api(ctx, 'get', '/client/assignments');
    const items = Array.isArray(list) ? list : list.items;
    assert.ok(row.assignmentIds.every(id => items.some(a => a.id === id && a.status === 'ASSIGNED')));
    await ctx.dispose();
  }
  pass('20 clientes: inicio de sesión real, sesiones de 12 horas y 40 expedientes pendientes');
  const admin = await login(manifest.adminEmail);
  const technical = await login(manifest.technical.email);
  pass('Administrador y cuenta técnica: autenticación real');
  const id = manifest.technical.assignmentIds[0];
  assert.equal(manifest.technical.email, 'evento.prueba@seal.test');
  let assignment = await api(technical.ctx, 'get', `/client/assignments/${id}`);
  if (['ASSIGNED', 'VIEWED'].includes(assignment.status)) {
    await api(technical.ctx, 'post', `/client/assignments/${id}/view`);
    await api(technical.ctx, 'post', `/client/assignments/${id}/messages`, { text: 'Prueba técnica ficticia: revisé el documento de demostración.' }, 201);
    const messages = await api(admin.ctx, 'get', `/admin/assignments/${id}/messages`);
    assert.ok(JSON.stringify(messages).includes('Prueba técnica ficticia'));
    pass('Chat cliente → administrador con datos reales del expediente técnico');
    const token = await api(technical.ctx, 'post', `/client/assignments/${id}/sign-token`, {}, 201);
    assert.equal(new URL(token.link).origin, origin); assert.equal(token.expires_minutes, 10);
    browser = await chromium.launch();
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(token.link);
    const canvas = mobilePage.locator('canvas'); await expect(canvas).toBeVisible();
    assert.equal(await canvas.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
    // Pointer events draw only the word DEMO on the dedicated fictitious document.
    const rect = await canvas.boundingBox();
    const strokes = [ [[20,60],[20,120],[45,120],[60,105],[60,75],[45,60],[20,60]], [[100,60],[75,60],[75,120],[100,120]], [[75,90],[95,90]], [[115,120],[115,60],[135,95],[155,60],[155,120]], [[190,60],[175,75],[175,105],[190,120],[205,105],[205,75],[190,60]] ];
    for (const points of strokes) {
      await mobilePage.mouse.move(rect.x+points[0][0], rect.y+points[0][1]);
      await mobilePage.mouse.down();
      for (const [x,y] of points.slice(1)) await mobilePage.mouse.move(rect.x+x, rect.y+y, {steps:3});
      await mobilePage.mouse.up();
    }
    const signing = mobilePage.waitForResponse(r => r.url().includes('/signatures/mobile/sign') && r.request().method() === 'POST');
    await mobilePage.getByRole('button', { name: 'Confirmar firma' }).click();
    assert.equal((await signing).status(), 200);
    await expect(mobilePage.getByText('Firma enviada correctamente. Puedes cerrar esta pantalla.')).toBeVisible();
    await mobilePage.screenshot({ path:path.join(out, 'firma-movil-verificada.png'), fullPage:true });
    const reuse = await technical.ctx.get(`${origin}/api/signatures/mobile/verify`, { params:{token:token.token} });
    assert.equal(reuse.status(), 400);
    await browser.close(); browser = null;
    pass('Firma móvil a 390 px sobre fondo blanco, envío real y bloqueo del token ya usado');
    assignment = await api(technical.ctx, 'get', `/client/assignments/${id}`);
  }
  if (assignment.status === 'SIGNED') {
    await api(admin.ctx, 'post', `/admin/assignments/${id}/approve`, {});
  }
  assignment = await api(technical.ctx, 'get', `/client/assignments/${id}`);
  assert.equal(assignment.status, 'APPROVED');
  const pdf = await api(technical.ctx, 'get', `/client/assignments/${id}/pdf`);
  assert.equal(new URL(pdf.url).origin, origin);
  const downloaded = await technical.ctx.get(pdf.url);
  assert.equal(downloaded.status(), 200);
  const bytes = await downloaded.body();
  assert.equal(bytes.subarray(0,5).toString(), '%PDF-'); assert.ok(bytes.length > 5000);
  fs.writeFileSync(path.join(out, 'PRUEBA_TECNICA.pdf'), bytes);
  pass('Aprobación y PDF final real descargado por IP de red');
  const isolated = await login(manifest.clients[0].email);
  const forbidden = await isolated.ctx.get(`${origin}/api/client/assignments/${id}`);
  assert.equal(forbidden.status(), 403);
  pass('Un cliente no puede consultar el expediente de otro');
})().then(() => {
  fs.writeFileSync(path.join(out,'flujo-real.json'), JSON.stringify({ checkedAt:new Date().toISOString(), origin, checks }, null, 2));
}).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); await Promise.allSettled(contexts.map(ctx => ctx.dispose()));
});

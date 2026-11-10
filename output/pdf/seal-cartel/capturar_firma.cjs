const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { chromium } = require(path.join(root, 'qa/node_modules/@playwright/test'));

// Actual UI with explicit fixture data. Never submit a signature or contact Firebase.
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 4,
      reducedMotion: 'reduce', colorScheme: 'dark', isMobile: true, hasTouch: true,
    });
    await page.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (route.request().method() === 'GET' && pathname.endsWith('/mobile/verify')) {
        return route.fulfill({ json: { ok: true, data: {
          contract_title: 'Contrato laboral de ejemplo', client_name: 'Persona de demostración',
          expires_at: '2026-09-09T21:00:00Z',
        } } });
      }
      return route.abort();
    });
    await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:3002'}/firma-movil?token=demostracion-sin-validez`);
    const canvas = page.locator('canvas');
    await canvas.waitFor();
    const color = await page.locator('.login').evaluate(el => getComputedStyle(el).backgroundColor);
    if (color !== 'rgb(255, 255, 255)') throw new Error('La pantalla de firma debe tener fondo blanco.');
    const box = await canvas.boundingBox();
    const strokes = [
      [[0,0],[0,38],[9,38],[18,32],[21,19],[17,6],[9,0],[0,0]],
      [[30,0],[30,38],[48,38]], [[30,18],[45,18]], [[30,0],[48,0]],
      [[60,38],[60,0],[72,19],[84,0],[84,38]],
      [[106,0],[97,5],[93,18],[97,33],[106,38],[116,33],[120,19],[116,5],[106,0]],
    ];
    for (const stroke of strokes) {
      await page.mouse.move(box.x + 45 + stroke[0][0], box.y + 85 + stroke[0][1]);
      await page.mouse.down();
      for (const [x,y] of stroke.slice(1)) await page.mouse.move(box.x + 45 + x, box.y + 85 + y, { steps: 3 });
      await page.mouse.up();
    }
    await page.locator('.seal-logo').evaluateAll(async images => { await Promise.all(images.map(img => img.decode())); });
    await page.screenshot({ path: path.join(__dirname, 'assets/seal-movil-publico.png'), animations: 'disabled' });
    console.log('Captura móvil actualizada: fondo blanco, datos ficticios, ninguna firma enviada.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });

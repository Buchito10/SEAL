const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { chromium } = require(path.join(root, 'qa/node_modules/@playwright/test'));
const { mockWorkspace } = require(path.join(root, 'qa/fixtures/workspace'));

// Real application UI with isolated, fictitious contract data.
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 980 }, deviceScaleFactor: 3, reducedMotion: 'reduce',
    });
    await mockWorkspace(page);
    await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:3002'}/contratos`);
    await page.getByRole('button', { name: 'IA', exact: true }).click();
    await page.getByText('Tu contrato, más claro.', { exact: true }).waitFor();
    await page.locator('.seal-logo:visible').evaluateAll(async images => { await Promise.all(images.map(img => img.decode())); });
    await page.screenshot({ path: path.join(__dirname, 'assets/seal-escritorio.png'), animations: 'disabled' });
    console.log('Captura de escritorio actualizada con el escudo oficial y datos ficticios.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });

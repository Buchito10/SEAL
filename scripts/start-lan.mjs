import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { eventAddress } from './event-network.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const event = process.argv.includes('--event');
const address = eventAddress();
const origin = `http://${address}:3002`;
for (const [port, host] of [[3001, '127.0.0.1'], [3002, '0.0.0.0']]) {
  await new Promise((accept, reject) => {
    const socket = createServer();
    socket.once('error', () => reject(new Error(`El puerto ${port} ya está ocupado. Cierra la ventana anterior de SEAL con Ctrl+C antes de abrir otra.`)));
    socket.listen(port, host, () => socket.close(accept));
  });
}
if (event) {
  try { await access(resolve(root, 'Front/.next-event/standalone/server.js')); }
  catch { throw new Error('Falta preparar la versión del evento. Ejecuta node scripts/prepare-event.mjs desde la carpeta del proyecto.'); }
}
const children = [];
let awake;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  awake?.kill('SIGTERM');
}
function launch(args, cwd, overrides) {
  const child = spawn(process.execPath, args, { cwd: resolve(root, cwd), stdio: 'inherit', env: { ...process.env, ...overrides } });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) { console.error('Un servicio terminó. Corrige el error anterior y vuelve a abrir SEAL.'); stop(code || 1); } });
}
let browserPath = process.env.PUPPETEER_EXECUTABLE_PATH;
if (!browserPath) {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  browserPath = require('../qa/node_modules/playwright').chromium.executablePath();
  await access(browserPath);
}
launch(['src/server.js'], 'Back', {
  NODE_ENV: 'development', HOST: '127.0.0.1', PORT: '3001', AUTH_COOKIE_SECURE: 'false',
  TRUST_PROXY_HOPS: '1', ENABLE_LOCAL_DRAFT_CLEANUP: 'false', JWT_EXPIRES_IN: event ? '12h' : '1h',
  LOGIN_RATE_LIMIT_MAX: event ? '60' : '10', PUPPETEER_EXECUTABLE_PATH: browserPath,
  PUBLIC_API_URL: `${origin}/api`, FRONT_SIGN_URL: `${origin}/firma-movil`,
  FRONT_RESET_URL: `${origin}/reset-password`, FRONT_ACTIVATION_URL: `${origin}/activar-cuenta`,
  CORS_ALLOWED_ORIGINS: `${origin},http://127.0.0.1:3002,http://localhost:3002`,
});
launch(event ? ['scripts/start-standalone.mjs'] : ['node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', '--port', '3002'], 'Front', {
  NODE_ENV: event ? 'production' : 'development', SEAL_EVENT_BUILD: event ? '1' : '0',
  HOSTNAME: '0.0.0.0', PORT: '3002', NEXT_PUBLIC_API_URL: '/api', API_PROXY_TARGET: 'http://127.0.0.1:3001', SEAL_LAN_IP: address,
});
if (event && process.platform === 'darwin') {
  awake = spawn('/usr/bin/caffeinate', ['-i', '-w', String(process.pid)], { stdio: 'ignore' });
  awake.on('error', () => console.warn('No se pudo impedir el reposo automático. Mantén la laptop despierta.'));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
let lastNetworkNotice = address;
setInterval(() => {
  try {
    const next = eventAddress();
    if (next !== lastNetworkNotice) {
      console.warn(`\nLa IP cambió a ${next}. Detén SEAL con Ctrl+C y vuelve a abrir Iniciar SEAL.command; después genera enlaces de firma nuevos.\n`);
      lastNetworkNotice = next;
    }
  } catch (error) { console.warn(error.message); }
}, 15000).unref();
await mkdir(resolve(root, '.release/evento'), { recursive: true });
await writeFile(resolve(root, '.release/evento/conexion.json'), JSON.stringify({ origin, address, event, pid: process.pid, startedAt: new Date().toISOString() }, null, 2));
console.log(`\nSEAL ${event ? 'EVENTO · compilado' : 'desarrollo'}\nProyecto: ${origin}\nLogin: ${origin}/login\nIP: evento-ip.txt (AUTO detecta el Wi-Fi al iniciar).\nTeléfono y laptop en la misma red; la laptop debe permanecer abierta.\nFirebase, OpenRouter y correo requieren internet. Ctrl+C detiene ambos servicios.\n`);

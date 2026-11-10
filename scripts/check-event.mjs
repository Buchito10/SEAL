import { readFile } from 'node:fs/promises';
import { eventAddress } from './event-network.mjs';
let failures = 0;
const address = eventAddress();
const origin = `http://${address}:3002`;
console.log(`\nSEAL · comprobar conexión\nLink para laptop y teléfono: ${origin}/login\n`);
try {
  const connection = JSON.parse(await readFile(new URL('../.release/evento/conexion.json', import.meta.url), 'utf8'));
  if (connection.origin !== origin) {
    console.error('CAMBIÓ LA IP: detén SEAL con Ctrl+C y vuelve a abrir Iniciar SEAL.command. Después genera enlaces de firma nuevos.');
    failures++;
  }
} catch { console.log('Todavía no hay un arranque registrado. Abre Iniciar SEAL.command.'); }
for (const [label, route] of [['Página de acceso','/login'],['Backend a través del frontend','/api/health'],['Módulo de firma móvil','/firma-movil']]) {
  try {
    const res = await fetch(`${origin}${route}`, {signal:AbortSignal.timeout(8000)});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (route === '/api/health' && (await res.json()).ok !== true) throw new Error('Respuesta inesperada');
    console.log(`OK: ${label}`);
  } catch (error) { failures++; console.error(`FALLÓ: ${label} (${error.message})`); }
}
if (address === '127.0.0.1') console.warn('No se detectó una IPv4 de red. Solo podrás abrirlo en esta laptop hasta conectarte al Wi-Fi y reiniciar SEAL.');
console.log('\nEsta comprobación no consume IA ni envía correos. Verifica el servidor desde la laptop; falta abrir el link desde el teléfono para comprobar que la red permite comunicar ambos equipos.');
console.log('Firebase, IA y correo requieren internet. Mantén la laptop abierta y conectada al cargador.');
process.exitCode = failures ? 1 : 0;

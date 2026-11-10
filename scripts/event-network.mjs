import { networkInterfaces } from 'node:os';
import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';
export function selectNetworkAddress(available = networkInterfaces()) {
  // Campus Wi-Fi can assign public IPv4 addresses directly to laptops.
  const interfaces = Object.entries(available).sort(([a], [b]) => Number(b === 'en0') - Number(a === 'en0'));
  return interfaces.flatMap(([, entries]) => entries || []).find(entry =>
    entry.family === 'IPv4' && !entry.internal && isIP(entry.address) === 4 &&
    !/^(0\.|127\.|169\.254\.)/.test(entry.address)
  )?.address || '127.0.0.1';
}
export function eventAddress() {
  let configured = 'AUTO';
  try { configured = readFileSync(new URL('../evento-ip.txt', import.meta.url), 'utf8').trim(); } catch {}
  const manual = process.env.SEAL_LAN_IP || configured;
  if (manual && manual.toUpperCase() !== 'AUTO') {
    if (isIP(manual) !== 4) throw new Error('evento-ip.txt debe contener AUTO o una dirección IPv4, por ejemplo 192.168.1.68.');
    return manual;
  }
  return selectNetworkAddress();
}

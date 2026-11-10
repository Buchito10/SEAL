import { readFile, realpath } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const run = promisify(execFile);
const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
let connection;
try { connection = JSON.parse(await readFile(new URL('../.release/evento/conexion.json', import.meta.url), 'utf8')); }
catch { console.log('No hay un arranque registrado.'); process.exit(0); }
const pid = Number(connection.pid);
if (!Number.isInteger(pid) || pid <= 1) throw new Error('El registro de arranque no contiene un proceso válido.');
try { process.kill(pid, 0); } catch { console.log('SEAL ya está detenido.'); process.exit(0); }
const { stdout: command } = await run('/bin/ps', ['-p', String(pid), '-o', 'command=']);
let cwd;
if (process.platform === 'darwin') {
  const { stdout } = await run('/usr/sbin/lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn']);
  cwd = stdout.split('\n').find(line => line.startsWith('n'))?.slice(1);
} else {
  cwd = await realpath(`/proc/${pid}/cwd`);
}
if (!command.includes('scripts/start-lan.mjs') || !cwd || await realpath(cwd) !== root) {
  throw new Error('El proceso registrado no corresponde al lanzador de este proyecto. No se detuvo ningún proceso.');
}
process.kill(pid, 'SIGTERM');
console.log('Se solicitó detener SEAL. Espera unos segundos antes de volver a iniciarlo.');

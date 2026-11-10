import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../Front', import.meta.url));
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production', SEAL_EVENT_BUILD: '1', NEXT_PUBLIC_API_URL: '/api', API_PROXY_TARGET: 'http://127.0.0.1:3001' } });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });

import { cp, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const buildDirectory = process.env.SEAL_EVENT_BUILD === "1" ? ".next-event" : ".next";
const server = new URL(`${buildDirectory}/standalone/server.js`, root);
try {
  await access(server);
} catch {
  console.error("No hay una compilación de SEAL. Ejecuta npm run build antes de npm start.");
  process.exit(1);
}
await cp(new URL("public/", root), new URL(`${buildDirectory}/standalone/public/`, root), { recursive: true });
await cp(new URL(`${buildDirectory}/static/`, root), new URL(`${buildDirectory}/standalone/${buildDirectory}/static/`, root), { recursive: true });
process.chdir(fileURLToPath(root));
await import(server.href);

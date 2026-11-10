# SEAL · frontend

Aplicación Next.js para administrar plantillas, contratos y clientes, y consultar documentos con IA. El backend Express se encuentra en `../Back`.

## Desarrollo

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

La aplicación abre en `http://localhost:3000`. Las llamadas a `/api` se reenvían a `API_PROXY_TARGET` (por defecto `http://127.0.0.1:3001`). Inicia el backend por separado con sus variables y servicios configurados. No compartas credenciales de producción para pruebas.

Para acceder desde un teléfono en la misma red, usa la IP local del equipo que ejecuta Next. El navegador sigue usando `/api` en el mismo origen; no necesita contactar un `localhost:3001` propio del teléfono.

## Verificación

```bash
npm run lint
npx tsc --noEmit
npm run build
npm --prefix ../Back test
npm --prefix ../qa run test:ui
```

La suite de interfaz requiere el frontend en ejecución. Usa datos ficticios y respuestas simuladas para revisar navegación, consultas y edición. Si usas otro puerto, indica `BASE_URL=http://127.0.0.1:3002` antes del comando. La suite `test:e2e` existente comprueba integración con un entorno configurado y se ejecuta por separado.

El backend requiere Node.js 22.12 o superior. `npm --prefix ../Back run test:pdf` genera un documento ficticio con Chromium y comprueba el archivo y su huella SHA-256. Requiere el navegador descargado por Puppeteer o `PUPPETEER_EXECUTABLE_PATH` apuntando a Chromium/Chrome.

## Componentes compartidos

- `Sidebar`: menú de escritorio y móvil, con diálogo nativo y navegación por teclado.
- `AssistantDock` y `ContractAssistant`: consulta explícita de un expediente desde administración y el portal de cliente.
- `Chat`: entrada multilínea, presentación segura de texto, estados de espera y fragmentos del documento.
- `TemplateEditor`: edición de documentos, formato, campos y vista HTML. Usa DOMPurify en el navegador; el servidor requiere su propia validación de entradas.
- `Modal`: ventanas nativas de plantillas con foco contenido, cierre con Escape y respeto por los cambios pendientes.
- `ProductPreview`: recorrido ilustrativo de la portada, claramente identificado como datos ficticios.
- `src/app/professional.css`: estilos compartidos de esta mejora. Los estilos históricos permanecen en `globals.css` para conservar el resto de las pantallas.

## Producción

`npm run build` produce la salida `standalone` usada por el Dockerfile. `npm start` copia los recursos estáticos e inicia ese servidor; admite `PORT` y `HOSTNAME`. El despliegue existente utiliza Nginx para `/api`, HTTPS y servicios separados. Consulta `../docs/despliegue-nextjs-nginx-https.md`, `../docs/release/DIRECTIVA_LIBERACION_SEAL.md` y `../docs/SEAL_EVENTO_9_SEPTIEMBRE.md` antes de liberar una versión.

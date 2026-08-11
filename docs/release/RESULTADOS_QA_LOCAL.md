# Resultados QA locales de SEAL

**Fecha:** 7 de agosto de 2026
**Entorno:** macOS, Docker Desktop, Nginx y `https://localhost`

Estos resultados comprueban que los scripts funcionan antes de ejecutarlos contra el servidor Cloud. Las métricas definitivas de la entrega se volverán a generar utilizando el dominio público.

## Pruebas unitarias y caja blanca — Jest

- Suites aprobadas: 2 de 2.
- Pruebas aprobadas: 11 de 11.
- Líneas cubiertas en los módulos seleccionados: 100%.
- Funciones cubiertas: 100%.
- Sentencias cubiertas: 98.03%.
- Ramas cubiertas: 79.16%.

Se probaron extracción y validación de placeholders, rechazo de campos desconocidos, ramas con `data-ph`, escape de HTML, valores ausentes y generación de hashes SHA-256.

## Integración — Playwright

- Escenarios aprobados: 2 de 2.
- Flujo correcto: formulario, petición simulada a `/api/auth/login`, almacenamiento de sesión y redirección al dashboard.
- Flujo de error: respuesta 401, mensaje visible y ausencia de sesión.

## Rendimiento — k6

- Usuarios virtuales simultáneos: 50.
- Duración: 30 segundos.
- Solicitudes HTTP: 1,501.
- Iteraciones: 1,500.
- Checks aprobados: 4,501 de 4,501.
- Tasa de error HTTP: 0.00%.
- Duración promedio: 12.85 ms.
- Percentil 95: 27.66 ms.
- Umbral requerido: percentil 95 menor de 500 ms.

## Usabilidad — Lighthouse

- Performance: 74.
- Accesibilidad: 95.
- Mejores prácticas: 96.
- SEO: 100.
- First Contentful Paint: 0.9 s.
- Largest Contentful Paint: 5.5 s.

Accesibilidad y Mejores Prácticas superan el mínimo solicitado de 85. La medición local se realizó contra el servidor de desarrollo HTTP porque Chrome Headless no produjo FCP con el certificado local. La evidencia final deberá generarse contra el HTTPS público de Let's Encrypt.

## Infraestructura

- Frontend Docker: saludable, puerto interno 3000.
- Backend Docker: saludable, puerto interno 3001.
- Nginx: puertos públicos locales 80 y 443.
- HTTP responde 301 hacia HTTPS.
- `/api/health` responde `{"ok":true}`.
- La construcción limpia de ambas imágenes Docker fue aprobada.

Durante la prueba de reconstrucción se detectó que Nginx podía conservar las direcciones internas anteriores cuando Docker recreaba frontend y backend. Los scripts de release y rollback ahora reinician Nginx después de cada reconstrucción para volver a resolver los servicios y evitar respuestas 502.

## Dependencias

- Next.js se actualizó de 16.1.6 a 16.3.0 para corregir avisos de seguridad.
- Nodemailer y dependencias compatibles del backend fueron actualizadas.
- Auditoría de producción del frontend: 0 vulnerabilidades conocidas.
- Auditoría de producción del backend: 0 altas o críticas; permanecen 8 moderadas transitivas de Firebase que requieren evaluar una actualización mayor por separado.

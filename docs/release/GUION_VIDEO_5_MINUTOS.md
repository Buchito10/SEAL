# Guion de video técnico — máximo 5 minutos

## 0:00–0:35 — Presentación

“SEAL es una aplicación de contratos y firma digital. La desplegamos en una máquina virtual usando Docker, Nginx y HTTPS. El frontend está desarrollado con Next.js y el backend con Express.”

Mostrar brevemente el diagrama o `docker compose ps`.

## 0:35–1:20 — Sitio y HTTPS

Abrir la URL pública y mostrar `/login`. Abrir la información del certificado y señalar dominio, emisor y vigencia. Explicar que sólo Nginx expone 80 y 443; los puertos 3000 y 3001 son internos.

URL que debe mostrarse: `https://seal.westus2.cloudapp.azure.com`.

## 1:20–2:10 — Pruebas unitarias y caja blanca

Ejecutar:

```bash
npm --prefix Back run test:coverage
```

Explicar que se prueban placeholders de contratos, ramas de validación, escape contra HTML malicioso y hash de evidencia. Mostrar pruebas aprobadas y cobertura.

## 2:10–2:50 — Integración

Ejecutar:

```bash
BASE_URL=https://seal.westus2.cloudapp.azure.com npm --prefix qa run test:e2e
```

Explicar que Playwright llena el login, simula la respuesta del API, comprueba la redirección y valida el manejo de credenciales incorrectas.

## 2:50–3:40 — Rendimiento

Mostrar la ejecución o resumen de k6 con 50 usuarios durante 30 segundos. Señalar solicitudes totales, errores, promedio y percentil 95.

Resultado actual: 1,387 solicitudes, 0% de errores, promedio de 102.53 ms y percentil 95 de 202.96 ms.

## 3:40–4:15 — Lighthouse

Abrir el reporte HTML y mostrar los puntajes. Señalar que Accesibilidad y Mejores Prácticas deben ser iguales o superiores a 85.

Resultado actual: Performance 97, Accesibilidad 95, Mejores Prácticas 96 y SEO 100.

## 4:15–4:45 — Rollback

Mostrar sin ejecutarlo sobre la versión estable:

```bash
./deploy/cloud/rollback.sh v0.9.0-release
```

Explicar que restaura una versión anterior, reconstruye contenedores y valida `/api/health`.

## 4:45–5:00 — Cierre

“Con este proceso SEAL cuenta con despliegue reproducible, conexión HTTPS, pruebas automatizadas, control de versiones y un procedimiento de recuperación ante fallos.”

No mostrar archivos `.env`, contraseñas, tokens, cuenta Firebase ni datos personales reales durante la grabación.

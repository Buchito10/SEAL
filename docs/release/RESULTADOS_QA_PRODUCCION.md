# Resultados QA de SEAL en producción

**Fecha:** 11 de agosto de 2026
**Servidor:** Azure for Students, VM `roco-v4`, Ubuntu 22.04
**URL:** https://seal.westus2.cloudapp.azure.com

## Despliegue y seguridad

- Frontend Next.js: contenedor aislado, puerto interno 3000.
- Backend Express: contenedor aislado, puerto interno 3001.
- Nginx: único punto público, en los puertos 80 y 443.
- Certbot: certificado público de Let's Encrypt y renovación automática.
- HTTP redirige a HTTPS.
- `/login` y `/api/health` responden correctamente.
- Los puertos 3000 y 3001 no están publicados en Azure.

## Pruebas unitarias y de caja blanca con Jest

- Suites aprobadas: 4 de 4.
- Pruebas aprobadas: 17 de 17.
- Sentencias: 84.42%.
- Ramas: 72.58%.
- Funciones: 87.50%.
- Líneas: 90.74%.
- Tiempo de ejecución: 46.27 s.

Las pruebas cubren autenticación, middleware JWT, sustitución de campos en contratos, escape de contenido HTML y generación reproducible del hash de evidencia.

## Integración con Playwright

- Escenarios aprobados: 4 de 4.
- Tiempo total: 10.0 s.
- Inicio de sesión correcto con API simulada y cookie `HttpOnly`.
- Credenciales inválidas sin crear una sesión.
- Redirección obligatoria para cambiar contraseña.
- Accesibilidad del botón para recuperar contraseña.

La simulación del API permite probar la integración entre interfaz, red y navegación sin utilizar usuarios reales ni modificar datos de producción.

## Carga con k6

- Usuarios virtuales: 50 simultáneos.
- Duración: 30 segundos.
- Solicitudes HTTP: 1,387.
- Iteraciones: 1,386.
- Checks aprobados: 4,159 de 4,159 (100%).
- Errores HTTP: 0.00%.
- Duración promedio: 102.53 ms.
- Mediana: 84.32 ms.
- Percentil 90: 166.26 ms.
- Percentil 95: 202.96 ms.
- Máximo: 579.25 ms.
- Rendimiento: 43.45 solicitudes por segundo.
- Umbral `p(95) < 500 ms`: aprobado.

Durante la carga, los contenedores se mantuvieron dentro de sus límites. El frontend llegó aproximadamente a 89.88 MiB, el backend a 68.61 MiB y Nginx a 10.24 MiB.

## Lighthouse en producción

- Performance: 97.
- Accesibilidad: 95.
- Mejores prácticas: 96.
- SEO: 100.
- First Contentful Paint: 1.1 s.
- Largest Contentful Paint: 1.9 s.
- Total Blocking Time: 60 ms.
- Cumulative Layout Shift: 0.

Se superó el mínimo solicitado de 85 en Accesibilidad y Mejores Prácticas. Los reportes completos están en `qa/reports/lighthouse`.

## Convivencia con ROCO

SEAL está instalado en `/opt/seal` con un proyecto, red, carpetas y límites propios. No comparte contenedores con ROCO. Después del despliegue y de la prueba de carga se verificó que PostgreSQL y la API existente continuaban activos.

Para detener solamente la actividad:

```bash
cd /opt/seal
./deploy/vm/stop-activity.sh
```

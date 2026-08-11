# Directiva de Liberación del Proyecto SEAL

## 1. Objetivo

Esta directiva define cómo se identifica, prueba, publica y revierte una versión estable de SEAL. Ninguna versión se considera liberada únicamente porque compile en la computadora de un integrante.

## 2. Versionamiento

SEAL utiliza Versionamiento Semántico:

- **MAJOR:** cambios incompatibles o rediseños importantes.
- **MINOR:** funcionalidades nuevas compatibles.
- **PATCH:** correcciones compatibles.

Los tags de producción siguen el formato:

```text
vMAJOR.MINOR.PATCH-release
```

Ejemplo: `v1.0.0-release`.

La rama `main` contiene la versión candidata. Antes de crear un tag se exige:

1. Compilación correcta de frontend y backend.
2. Pruebas unitarias y caja blanca aprobadas.
3. Pruebas Playwright aprobadas.
4. Ausencia de secretos en Git.
5. Revisión de variables y respaldos.
6. Aprobación de al menos otro integrante del equipo.

## 3. Procedimiento de liberación

```bash
npm --prefix Back run test:coverage
BASE_URL=https://seal.westus2.cloudapp.azure.com npm --prefix qa run test:e2e
git tag -a v1.0.0-release -m "Release estable 1.0.0"
git push origin main --tags
```

En el VPS:

```bash
./deploy/cloud/deploy-release.sh v1.0.0-release
```

El despliegue sólo se acepta si `https://seal.westus2.cloudapp.azure.com/api/health` responde `{"ok":true}` y los contenedores están activos.

## 4. Rollback

El script de despliegue conserva el commit anterior en `.release/previous_commit`. Ante errores HTTP, fallo de salud, pérdida de funcionalidad o regresión crítica:

```bash
./deploy/cloud/rollback.sh
```

El responsable debe guardar los logs antes de investigar:

```bash
docker compose logs --since=30m nginx frontend backend > incidente-release.log
```

Después del rollback se verifica el sitio y se abre una incidencia con versión, hora, responsable, síntomas y causa encontrada. Una versión fallida no se vuelve a publicar con el mismo número.

## 5. Datos personales y privacidad

SEAL trata nombres, correos, datos laborales, contratos, firmas y evidencias. El tratamiento debe respetar la LFPDPPP mexicana y, cuando corresponda, los principios del GDPR:

- finalidad determinada y consentimiento informado;
- minimización de datos;
- acceso limitado por roles;
- cifrado en tránsito mediante HTTPS;
- conservación sólo por el tiempo necesario;
- mecanismo para ejercer derechos de acceso, rectificación, cancelación y oposición;
- notificación y atención de incidentes;
- no publicar datos reales en pruebas, videos o repositorios.

La interfaz incluye las rutas públicas `/politica-privacidad` y `/proteccion-datos`. Las versiones legales aceptadas quedan centralizadas en la configuración del backend. Para la demostración se usarán cuentas y contratos ficticios.

## 6. Responsables

- **Responsable de release:** ejecuta las pruebas y publica el tag.
- **Responsable de infraestructura:** revisa VM, firewall, Docker, certificado y respaldos.
- **Responsable QA:** conserva reportes de Jest, Playwright, k6 y Lighthouse.
- **Responsable de privacidad:** confirma que las evidencias no muestren credenciales ni datos personales reales.

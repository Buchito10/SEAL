# Práctica Final: Deployment y Quality Assurance de SEAL

## Resultado esperado

SEAL quedó publicado en una máquina virtual de Microsoft Azure con Docker, Nginx y un certificado público de Let's Encrypt. Sólo se expusieron los puertos 80 y 443 para SEAL. La entrega incluye pruebas unitarias, caja blanca, integración, carga, Lighthouse, política de liberación, rollback, PDF y video.

## Opción seleccionada sin comprar dominio

- **Servidor:** Microsoft Azure for Students, VM `roco-v4`.
- **Sistema:** Ubuntu 22.04 LTS.
- **Máquina:** plan estudiantil, aproximadamente 1 GB de RAM, 2 GB de swap y 62 GB de disco.
- **Nombre público gratuito:** etiqueta DNS incluida con la IP pública de Azure.
- **HTTPS:** Let's Encrypt mediante Certbot.

La IP pública utilizada fue `4.154.29.114` y se configuró la etiqueta DNS `seal`, por lo que el dominio es:

```text
seal.westus2.cloudapp.azure.com
```

## Acciones realizadas en Azure

1. Se utilizó la cuenta institucional de Azure for Students.
2. Se reutilizó la VM Ubuntu `roco-v4`, manteniendo activa la aplicación ROCO existente.
3. En el grupo de seguridad de red se agregaron reglas TCP para los puertos 80 y 443.
4. La conexión se realizó por SSH mediante una llave privada.
5. Los archivos `Back/.env` y `Back/secrets/firebase-admin.json` se copiaron de forma cifrada y no se publicaron en GitHub.
6. SEAL se instaló por separado en `/opt/seal`.

## Configuración de red en Azure

En **Virtual machines > roco-v4 > Networking > Network settings** se crearon las reglas `Allow-HTTP` para TCP 80 y `Allow-HTTPS` para TCP 443. Se conservó la regla SSH del puerto 22. Los puertos 3000 y 3001 permanecen dentro de la red de Docker y no fueron abiertos en Azure.

## Dominio gratuito

En la IP pública de Azure se configuró la etiqueta DNS `seal`. Azure combina esa etiqueta con la región de la máquina virtual y proporciona un nombre público sin comprar un dominio.

```text
IP:      4.154.29.114
Dominio: seal.westus2.cloudapp.azure.com
```

Comprobación desde la Mac:

```bash
dig +short seal.westus2.cloudapp.azure.com
```

La respuesta debe ser la misma IP pública. Este hostname permite solicitar un certificado válido mediante el desafío HTTP-01 de Let's Encrypt.

## Preparación y aislamiento del servidor

La conexión utilizada es:

```bash
ssh -i ~/.ssh/roco-v4_key.pem azureuser@4.154.29.114
```

Docker ya estaba instalado. SEAL se copió a `/opt/seal` y se construyó como un proyecto Docker independiente. Se creó una red propia, límites de CPU y memoria y 2 GB de swap para ayudar a la compilación. No se reinició la VM, PostgreSQL ni la API de ROCO.

El script instala Docker, Docker Compose, Git y UFW; habilita únicamente SSH, 80 y 443 y crea swap para ayudar a compilar Next.js.

## Variables privadas

Crear la configuración general:

```bash
cp .env.example .env
nano .env
```

Ejemplo:

```dotenv
DOMAIN=seal.westus2.cloudapp.azure.com
CERTBOT_EMAIL=correo-institucional@example.com
CERTBOT_STAGING=0
```

Crear `Back/.env` a partir de su ejemplo y reemplazar todos los valores `change-me`. Generar secretos con:

```bash
openssl rand -hex 32
```

La cuenta de Firebase debe quedar en:

```text
Back/secrets/firebase-admin.json
```

Estos archivos están excluidos por `.gitignore` y no deben subirse al repositorio público.

## Primera liberación

La versión de la actividad se inició con las imágenes previamente construidas y el archivo de límites para la VM:

```bash
cd /opt/seal
sudo docker compose --env-file .env -f compose.yaml -f deploy/vm/compose.vm.yaml up -d --no-build
```

Nginx recibe las solicitudes públicas, envía `/api` al backend y el resto al frontend. Certbot obtuvo el certificado de Let's Encrypt y quedó en ejecución para renovarlo.

Verificación:

```bash
./deploy/cloud/verify-production.sh seal.westus2.cloudapp.azure.com
```

## Ejecución del plan QA

Desde la Mac, con Docker Desktop abierto:

```bash
BASE_URL=https://seal.westus2.cloudapp.azure.com ./qa/scripts/run-cloud-qa.sh
```

Este comando ejecuta:

1. Jest: pruebas unitarias y caja blanca con cobertura.
2. Playwright: integración del formulario de login con una API simulada.
3. k6: 50 usuarios virtuales durante 30 segundos.
4. Lighthouse: performance, accesibilidad, mejores prácticas y SEO.

Los reportes se guardan en `Back/coverage` y `qa/reports`.

## Rollback

Si la verificación de una versión falla:

```bash
./deploy/cloud/rollback.sh
```

El script regresa al commit anterior registrado. También se puede indicar un tag específico:

```bash
./deploy/cloud/rollback.sh v0.9.0-release
```

Después reconstruye los contenedores y verifica nuevamente el endpoint de salud.

## Evidencias necesarias

- URL pública abriendo sin advertencias HTTPS.
- Certificado válido mostrado en el navegador.
- `docker compose ps` con frontend y backend saludables.
- Resultado de 17 pruebas Jest y reporte de cobertura.
- Cuatro pruebas Playwright aprobadas.
- Resumen k6 con 50 VUs, percentil 95 y tasa de errores.
- Lighthouse con al menos 85 en Accesibilidad y Mejores Prácticas.
- Demostración de `deploy-release.sh` y explicación de `rollback.sh`.
- Enlace al repositorio público y tag de producción.

## Apagado para evitar consumo

Después de la evaluación se puede detener únicamente SEAL:

```bash
cd /opt/seal
./deploy/vm/stop-activity.sh
```

No debe apagarse la VM porque también aloja ROCO. El script anterior sólo elimina los contenedores y la red del proyecto `seal`; no modifica `crypto_news_db`, Uvicorn, Tailscale ni los servicios systemd existentes.

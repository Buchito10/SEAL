# SEAL en la red local

Para el evento del 9 de septiembre usa **Iniciar SEAL.command** o `node scripts/start-lan.mjs --event`. Ya está compilado. Consulta **EVENTO_LEEME.md**, en la raíz, para el arranque, las cuentas y los límites comprobados.

Desde la raíz del proyecto:

```bash
node scripts/start-lan.mjs
```

El comando sin `--event` sirve para desarrollo. Detecta la IP privada (prioriza el Wi-Fi de macOS), imprime el enlace de acceso e inicia ambos servicios. Para elegir una IP, cambia `AUTO` por la IPv4 en `evento-ip.txt` y vuelve a iniciar. Detener con Ctrl+C.

- Frontend: puerto 3002, accesible desde la red local.
- Backend: puerto 3001, solo en la computadora, mediante `/api` en el frontend.
- Los enlaces de firma, recuperación, activación y descarga usan la IP detectada.
- La configuración HTTP es exclusiva de este comando de desarrollo; no modifica las credenciales ni los archivos `.env`.

Conecta el teléfono y la computadora a la misma red Wi-Fi y mantén la computadora encendida. Abre el enlace impreso. Entra con una cuenta de cliente, selecciona un contrato pendiente y abre **Firmar → Firmar con celular**. Escanea el QR con la cámara del teléfono o abre el enlace generado. Ese enlace incluye un token, vence en 10 minutos y solo permite una firma. `/firma-movil` por sí solo no selecciona un contrato.

El QR se genera dentro del navegador; no necesita un servicio externo. En HTTP, cuando el navegador no ofrece acceso al portapapeles, Copiar link selecciona el enlace visible para copiarlo manualmente.

Si cambias de Wi-Fi, reinicia el comando para detectar la nueva IP y genera otro enlace de firma. Los enlaces locales solo funcionan dentro de esa red; una red de invitados con aislamiento de dispositivos puede impedir la conexión.

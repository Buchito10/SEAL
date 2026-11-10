# SEAL · guía para el evento del 9 de septiembre de 2026

La versión del evento ya está compilada. No necesitas instalar dependencias ni modificar los archivos `.env` al llegar.

## Al llegar al evento

1. Conecta la laptop y el teléfono a la misma red Wi-Fi con internet. Completa cualquier portal de acceso de la red en ambos equipos.
2. Si SEAL sigue abierto de otra red, detén la ventana anterior con **Ctrl+C** o abre **Detener SEAL.command**. Este último también detiene el arranque que dejó abierto Codex.
3. Abre **Iniciar SEAL.command**, en esta carpeta, con doble clic. Inicia backend y frontend juntos. Si Finder no lo ejecuta, abre Terminal en esta carpeta y usa `node scripts/start-lan.mjs --event`.
4. Deja esa ventana abierta. Copia el enlace que imprime junto a **Login** y ábrelo en ambos equipos.
5. Abre **Comprobar SEAL.command**. Debe mostrar tres resultados `OK`. Después abre el mismo enlace en el teléfono: esa última comprobación confirma la comunicación real entre dispositivos.
6. Mantén la laptop **abierta, conectada al cargador y con internet**. El lanzador evita el reposo por inactividad mientras corre; cerrar la tapa puede suspenderla.

El arranque sirve el frontend compilado por el puerto 3002 y conecta al backend por `/api`. El backend usa el puerto 3001 dentro de la laptop. No necesitas ejecutar por separado `npm run dev` ni cambiar otras IP.

## Dónde cambiar la IP

**Un solo archivo: `evento-ip.txt`, en esta carpeta.** Actualmente contiene:

```text
AUTO
```

Así se detecta la IP del Wi-Fi cada vez que arrancas. Normalmente no tienes que escribir nada.

Si hay varias conexiones y detecta una equivocada, reemplaza `AUTO` por la IPv4 que aparece en **Configuración del Sistema → Wi-Fi → Detalles → TCP/IP**, sin `http://`, puerto ni comillas. Ejemplo:

```text
192.168.1.68
```

Guarda el archivo, detén SEAL con Ctrl+C y vuelve a abrir **Iniciar SEAL.command**. Todos los enlaces nuevos de firma, activación, recuperación y descarga usan esa IP. Los enlaces ya enviados conservan la anterior: genera otros o reenvía las invitaciones después de reiniciar.

En el evento, usa la dirección que imprima el lanzador; la dirección local puede cambiar entre redes. En el teléfono no uses `localhost` ni `127.0.0.1`.

## Cuentas listas

La hoja privada **`.release/evento/CUENTAS_DEMO_PRIVADO.md`** contiene correos y contraseña. Ábrela solo en la pantalla del equipo, sin proyectarla.

- Administrador existente: `admin.demo@seal.test`.
- **20 clientes nuevos, 10 puestos y 2 expedientes pendientes por cliente: 40 recorridos disponibles.**
- Puestos: Frontend, Backend, QA, Diseño, Marketing, Ventas, Recursos Humanos, Contabilidad, Soporte y Logística.
- Cada puesto tiene cuentas `.01` y `.02`; por ejemplo `evento.frontend.01@seal.test`.
- Todos los expedientes y datos nuevos son ficticios y están marcados como demostración. Las cuentas están activas y con el perfil completo.
- Se conservaron las cuentas anteriores. `evento.prueba@seal.test` y `evento.alta@seal.test` son cuentas técnicas de las pruebas; utiliza las otras 20 con el público.

Las sesiones del modo evento duran **12 horas**. Si se vencen, inicia sesión otra vez; los datos permanecen.

## Recorrido para mostrarlo

1. Abre administración en un navegador o perfil normal y una cuenta demo de cliente en una ventana privada u otro navegador. Dos pestañas del mismo perfil comparten la sesión y no sirven para mantener roles distintos.
2. En el cliente, abre uno de sus contratos y revisa la información. Consulta la IA; por ejemplo: «¿Qué puesto, pago y jornada indica este documento?».
3. Envía una pregunta en el chat con administración y contéstala desde la otra ventana.
4. Abre **Firmar → Firmar con celular**. Escanea el QR o abre el enlace generado en el teléfono.
5. Dibuja una firma de ejemplo y confirma. En administración, revisa y aprueba el expediente; descarga el PDF final.
6. Para repetir una firma, usa el segundo expediente del cliente o cambia a otra cuenta demo. Los expedientes ya firmados no se reinician automáticamente. También puedes asignar una nueva plantilla desde administración.

El **enlace de firma vence a los 10 minutos y se usa una sola vez**. Esto no apaga SEAL ni vence la cuenta. Genéralo cuando vayas a demostrar la firma; si caduca antes de usarlo, genera otro. La ruta `/firma-movil` sin token no selecciona ningún contrato. Los enlaces temporales de descarga también pueden renovarse desde el expediente.

## Crear cuentas personales durante el evento

Sí: desde **Clientes → Nuevo cliente** puedes registrar más personas con un correo distinto. No encontré un máximo de cuentas impuesto por SEAL; el uso sigue sujeto a la capacidad y cuotas de Firebase y correo.

Las cuentas personales se activan mediante el enlace recibido por correo: la persona establece su contraseña, acepta los documentos que le correspondan y completa su perfil. Después puedes asignarle un contrato. El enlace local de activación requiere acceso a la misma red y la laptop encendida.

Los correos que terminan en `.test` son ficticios y no reciben invitaciones ni notificaciones. Para una demostración sin esperar un correo, utiliza las 20 cuentas ya preparadas. La autenticación SMTP fue verificada, pero no se enviaron correos de prueba a personas: no se ha confirmado la entrega a una bandeja real.

## Internet e IA durante todo el día

El frontend y backend corren en la laptop, pero **Firebase, OpenRouter y el correo necesitan internet**. Estar en la misma red no sustituye esa conexión.

OpenRouter respondió en cinco llamadas reales: consultas de administrador y cliente desde los servicios, generación de plantilla, y consultas por los dos endpoints autenticados. Las respuestas de prueba usaron modelos gratuitos seleccionados por `openrouter/free`.

La clave está en el nivel gratuito. OpenRouter documenta **50 solicitudes al día y 20 por minuto** para el uso gratuito sin compras; todas las cuentas de SEAL comparten la misma clave. No asumas IA ilimitada para todo el evento. El número restante exacto no fue informado por la consulta de la clave. Consulta el consumo en tu cuenta. Fuente: https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know

Si OpenRouter falla, el asistente del contrato dispone de una respuesta local identificada como tal; no equivale a una respuesta del proveedor. El generador de plantillas muestra el error y permite reintentar. Hay un tiempo máximo de espera de 45 segundos por llamada. Puedes continuar la demostración con las 10 plantillas preparadas sin generar otra con IA.

## Si algo falla al llegar

| Síntoma | Qué hacer |
|---|---|
| Puerto ocupado | Cierra el arranque anterior con Ctrl+C antes de abrir otro. |
| Funciona en laptop pero no en teléfono | Verifica que uses la IP actual y el puerto 3002, ambos en la misma red. Algunas redes de invitados aíslan dispositivos: pide una red sin aislamiento o prueba un punto de acceso propio con internet. Permite conexiones de Node si macOS muestra ese aviso. |
| Cambió el Wi-Fi | Reinicia SEAL y genera nuevos enlaces. |
| No inicia sesión | Ejecuta Comprobar SEAL, verifica internet y usa la hoja de credenciales. No cambies las credenciales de Firebase ni OpenRouter para corregir la IP. |
| El QR caducó | Genera un enlace nuevo desde el expediente pendiente. |
| IA no responde o muestra límite | Espera antes de reintentar; muestra una plantilla preparada y revisa el consumo de OpenRouter. |
| Invitación no llega | Revisa el correo, spam e internet. La cuenta queda pendiente; usa Reenviar cuando la conexión funcione. Para seguir mostrando el proyecto usa una cuenta demo activa. |

## Comprobaciones hechas

- Compilación del frontend y revisión estática: correctas.
- 21 pruebas de interfaz: correctas, con respuestas controladas para errores, reintentos, chats, plantillas, QR y tamaños de pantalla.
- 21 pruebas de backend: correctas.
- Integración real: 20 inicios de sesión de clientes, administrador, perfil, chat, firma desde Chromium con tamaño móvil de 390 px y modo oscuro, bloqueo del token usado, aprobación, descarga del PDF y rechazo al intentar leer el expediente de otro cliente.
- Alta de cuenta ficticia por API, activación y actualización de perfil: correctas.
- Firebase, autenticación SMTP y cinco llamadas reales a OpenRouter: correctas.

La prueba móvil se ejecutó en un navegador con tamaño de teléfono desde la laptop, usando la IP de red. Falta comprobar el teléfono físico en la red del evento. Ninguna prueba garantiza disponibilidad futura de esa red o de los proveedores.

Evidencia local en `.release/evento/`: `preflight.json`, `flujo-real.json`, `alta-e-ia.json`, `firma-movil-verificada.png` y `PRUEBA_TECNICA.pdf`.

Si haces cambios de frontend después de hoy, detén SEAL y recompila desde esta carpeta con `node scripts/prepare-event.mjs` antes de volver a abrir el modo evento. No borres `Back/.local-storage`: contiene firmas y PDF locales.

# Documentacion de Principios de Codificacion Segura en SEAL

## 1. Introduccion

SEAL es una plataforma web para la administracion, generacion, asignacion, revision y firma digital de contratos laborales. El sistema se divide en dos aplicaciones principales:

- **Frontend**: aplicacion web desarrollada con Next.js, React y TypeScript.
- **Backend**: API REST desarrollada con Node.js y Express.

El proyecto utiliza Firebase/Firestore como base de datos, Firebase Storage o almacenamiento local para archivos, JWT para autenticacion, Zod para validacion de datos, Nodemailer para correos, Puppeteer para generacion de PDF y Gemini para asistencia en la creacion de plantillas contractuales.

El objetivo de este documento es analizar como el proyecto SEAL aplica los principios de codificacion segura, identificando cuales se cumplen, cuales se cumplen parcialmente y que mejoras se recomiendan para fortalecer la seguridad del sistema.

## 2. Alcance del sistema

SEAL contempla dos roles principales:

- **Administrador**: puede crear usuarios, administrar clientes, subir o generar plantillas de contratos, versionarlas, asignarlas a clientes, revisar mensajes, aprobar contratos firmados y descargar PDFs finales.
- **Cliente**: puede iniciar sesion, completar su perfil, revisar contratos asignados, enviar mensajes, consultar apoyo del asistente, firmar digitalmente y descargar documentos aprobados.

El flujo principal del sistema es:

1. El administrador crea o registra usuarios.
2. El administrador sube una plantilla `.docx` o genera una plantilla con IA.
3. La plantilla se transforma a HTML y se valida mediante placeholders permitidos.
4. El administrador asigna un contrato a un cliente.
5. El sistema verifica que el perfil del cliente tenga los datos requeridos.
6. El cliente revisa el contrato, puede comunicarse con administracion y puede firmar.
7. El administrador aprueba la firma.
8. El sistema genera un PDF final con firma, hash y evidencia de aprobacion.

## 3. Resumen de cumplimiento

| Principio | Estado en SEAL | Observacion general |
|---|---|---|
| Validacion de entradas | Cumple | Se usan esquemas Zod, validaciones por rol, formatos especificos y limites de archivo. |
| Codificacion de salidas | Cumple parcialmente | Se escapan placeholders al renderizar contratos, pero hay HTML editable que requiere control adicional. |
| Minimo privilegio | Cumple parcialmente | Existen roles ADMIN/CLIENT y rutas separadas, aunque podria reforzarse la granularidad. |
| Autenticacion y autorizacion solidas | Cumple | Uso de JWT, middleware de autenticacion y validacion de rol por rutas. |
| Defensa en profundidad | Cumple parcialmente | Hay varias capas: Helmet, CORS, rate limit, JWT, roles, Zod y validacion de estados. |
| Fallar de forma segura | Cumple parcialmente | Ante errores se responde con fallo y se bloquean acciones invalidas, aunque algunas operaciones podrian ser mas atomicas. |
| Seguridad por defecto | Cumple parcialmente | Hay configuracion segura en varias capas, pero los `.env.example` contienen valores placeholder que deben cambiarse. |
| Evitar seguridad por oscuridad | Cumple | La proteccion se basa en controles reales: tokens, roles, validaciones y hashes. |
| Criptografia robusta | Cumple parcialmente | Hay hashing de passwords, JWT, tokens temporales y hashes de archivos; falta documentar HTTPS y cifrado en despliegue. |
| Gestion segura de errores y registros | Cumple parcialmente | El usuario no recibe trazas internas, pero el backend registra errores completos en consola. |
| No almacenar secretos en codigo | Cumple | Los secretos se cargan desde variables de entorno y archivos externos. |

## 4. Analisis detallado por principio

## 4.1 Validacion de entradas

**Estado: Cumple**

Este principio indica que todo dato externo debe tratarse como no confiable. En SEAL se observa una aplicacion constante de validaciones antes de procesar informacion enviada por usuarios o clientes del API.

### Evidencias en el backend

El backend usa **Zod** para definir esquemas de validacion:

- `auth.schemas.js`: valida login, cambio de password y recuperacion de password.
- `users.schemas.js`: valida creacion y edicion de usuarios.
- `contracts.schemas.js`: valida creacion de contratos, versiones, commits y comparaciones.
- `assignments.schemas.js`: valida precheck, asignaciones, mensajes, firma, IA y cambios de estado.
- `aiChats.schemas.js`: valida chats con IA, mensajes, edicion humana y publicacion de plantilla.

Ejemplos de validaciones aplicadas:

- Correos deben tener formato valido.
- Passwords tienen longitud minima.
- Los roles estan restringidos a `ADMIN` o `CLIENT`.
- Los estados de chat se restringen a `OPEN` o `CLOSED`.
- Las versiones de contrato deben ser numeros enteros mayores o iguales a 1.
- Los mensajes tienen limites de longitud.
- La firma debe recibirse como imagen PNG en base64.

Tambien se validan datos del perfil del cliente:

- RFC con expresion regular.
- CURP con expresion regular.
- Telefono mexicano de 10 digitos.
- Direccion, ciudad, estado, codigo postal y pais.

En la subida de contratos se usa `multer` con limite de tamano:

- `MAX_DOCX_MB` controla el tamano maximo permitido.
- La validacion del archivo `.docx` se realiza antes de almacenarlo.

### Evaluacion

SEAL cumple bien este principio porque no procesa directamente la informacion enviada por el usuario sin antes validarla. Esta practica reduce riesgos como datos corruptos, abuso de endpoints, estados invalidos e inyecciones basicas.

### Mejora recomendada

Agregar pruebas automatizadas de validacion para los casos mas criticos:

- Login con correo invalido.
- Firma con archivo no PNG.
- Contrato con placeholders invalidos.
- Asignacion con perfil incompleto.
- Intento de cambiar estados no permitidos.

## 4.2 Codificacion de salidas

**Estado: Cumple parcialmente**

La codificacion de salidas busca transformar los datos antes de mostrarlos en un contexto especifico, por ejemplo HTML, para evitar inyecciones como XSS.

### Evidencias en SEAL

El backend cuenta con una funcion de renderizado de placeholders:

- `placeholderRender.js`

Esta funcion reemplaza placeholders como:

```txt
{{ employee.name }}
{{ employee.rfc }}
{{ company.salary }}
```

Al insertar los valores reales, el sistema aplica escape HTML mediante `escapeHtml`. Esto evita que datos del usuario, como nombre o direccion, se conviertan en codigo HTML ejecutable dentro del contrato renderizado.

Tambien existe una validacion de placeholders:

- Solo se permiten placeholders registrados en el catalogo.
- Se rechaza el uso de `data-ph`, indicando que el sistema busca estandarizar el formato seguro `{{ ... }}`.
- No se permite inventar placeholders fuera del catalogo.

### Riesgo identificado

El sistema trabaja con plantillas HTML editables por administradores y generadas por IA. Aunque los placeholders se escapan correctamente, el HTML de la plantilla puede contener contenido complejo. Si en algun punto se muestra HTML usando `dangerouslySetInnerHTML` en el frontend, seria importante sanitizarlo previamente.

En este proyecto el riesgo es menor porque el editor pertenece al administrador, pero sigue existiendo una superficie sensible: las plantillas pueden venir de documentos `.docx`, edicion manual o IA.

### Evaluacion

SEAL cumple parcialmente. La proteccion de datos insertados en placeholders esta bien planteada, pero el manejo de HTML completo deberia reforzarse con sanitizacion formal.

### Mejora recomendada

Integrar una libreria de sanitizacion HTML, por ejemplo:

- `DOMPurify` en frontend para vistas HTML.
- `sanitize-html` en backend antes de guardar o renderizar plantillas.

Tambien se recomienda definir una lista permitida de etiquetas:

- `p`, `h1`, `h2`, `h3`, `strong`, `em`, `ul`, `ol`, `li`, `table`, `tr`, `td`, `th`, `br`.

Y bloquear etiquetas peligrosas:

- `script`, `iframe`, `object`, `embed`, eventos `onclick`, `onerror`, estilos remotos peligrosos.

## 4.3 Minimo privilegio

**Estado: Cumple parcialmente**

El principio de minimo privilegio indica que cada usuario o modulo debe tener solo los permisos necesarios.

### Evidencias en SEAL

El backend separa rutas por rol:

- Rutas de administrador protegidas con `requireRole("ADMIN")`.
- Rutas de cliente protegidas con `requireRole("CLIENT")`.

Ejemplos:

- Solo `ADMIN` puede crear usuarios.
- Solo `ADMIN` puede subir contratos.
- Solo `ADMIN` puede aprobar contratos firmados.
- Solo `CLIENT` puede ver sus propias asignaciones.
- Solo `CLIENT` puede firmar contratos asignados a su cuenta.

Ademas, en el flujo de cliente se verifica que la asignacion pertenezca al usuario autenticado. Esto evita que un cliente consulte o firme contratos de otro cliente.

### Evaluacion

SEAL aplica correctamente una separacion basica por roles. Sin embargo, el rol `ADMIN` tiene muchos privilegios concentrados. Para una version mas robusta podria dividirse en permisos mas especificos.

### Mejora recomendada

Agregar roles o permisos mas granulares, por ejemplo:

- `ADMIN_SUPER`: administra usuarios y configuracion.
- `ADMIN_LEGAL`: edita plantillas y aprueba contratos.
- `ADMIN_RH`: asigna contratos y gestiona clientes.
- `CLIENT`: consulta y firma sus propios contratos.

Esto permitiria evitar que cualquier administrador tenga acceso completo a todas las funciones.

## 4.4 Autenticacion y autorizacion solidas

**Estado: Cumple**

Este principio exige comprobar la identidad del usuario y validar sus permisos antes de permitir acceso a recursos.

### Evidencias en SEAL

El backend implementa autenticacion con JWT:

- El login genera un token.
- Las rutas protegidas requieren encabezado `Authorization: Bearer <token>`.
- El middleware `authJWT` valida el token.
- El middleware `requireRole` valida el rol del usuario.

Tambien existen protecciones adicionales:

- Rate limit especifico para login.
- Usuarios con estado `DISABLED` no pueden operar.
- `must_change_password` permite forzar cambio de contrasena.
- Recuperacion de contrasena mediante token temporal.
- Firma movil mediante token temporal con expiracion.

### Evaluacion

SEAL cumple este principio porque valida identidad y rol en el backend, que es donde realmente debe aplicarse la seguridad. El frontend tambien redirige segun rol, pero esa capa es solo de experiencia de usuario; la seguridad real esta en la API.

### Mejora recomendada

Para una version productiva se recomienda:

- Usar cookies `HttpOnly`, `Secure` y `SameSite` en vez de guardar JWT en `localStorage`.
- Agregar refresh tokens con rotacion.
- Agregar expiracion corta para access tokens.
- Considerar doble factor de autenticacion para administradores.

## 4.5 Defensa en profundidad

**Estado: Cumple parcialmente**

La defensa en profundidad consiste en tener varias capas de seguridad independientes.

### Capas presentes en SEAL

SEAL ya incluye varias capas:

1. **Helmet**: agrega encabezados HTTP de seguridad.
2. **CORS**: controla el acceso entre origenes.
3. **Rate limit global**: limita abuso de peticiones.
4. **Rate limit de login**: reduce ataques de fuerza bruta.
5. **JWT**: protege rutas privadas.
6. **Roles**: separa operaciones de administrador y cliente.
7. **Validacion Zod**: valida datos de entrada.
8. **Validacion de placeholders**: evita tokens no autorizados.
9. **Hash de archivos y firmas**: permite verificar integridad.
10. **Estados de workflow**: impide acciones fuera de orden.
11. **Tokens temporales**: se usan para reset de contrasena y firma movil.

### Evaluacion

El sistema ya tiene una defensa por capas considerable para el avance actual. El punto a mejorar es que algunas configuraciones, como CORS, parecen estar abiertas por defecto y deberian restringirse en produccion.

### Mejora recomendada

Configurar CORS con origenes permitidos:

```txt
http://localhost:3000 en desarrollo
https://dominio-produccion.com en produccion
```

Tambien agregar:

- Auditoria mas detallada de acciones administrativas.
- Politicas de bloqueo por multiples intentos fallidos.
- Monitoreo de eventos sospechosos.

## 4.6 Fallar de forma segura

**Estado: Cumple parcialmente**

Fallar de forma segura significa que, si ocurre un error, el sistema no debe exponer informacion ni permitir acciones inseguras.

### Evidencias en SEAL

El backend devuelve respuestas controladas mediante utilidades como `ok` y `fail`. Cuando una validacion falla, la API responde con error y no continua el proceso.

Ejemplos:

- Si el token JWT no existe o expiro, se responde `401`.
- Si el rol no coincide, se responde `403`.
- Si un cliente intenta ver una asignacion que no es suya, se responde `403`.
- Si el contrato ya fue aprobado, no se permite firmar de nuevo.
- Si el contrato fue rechazado, se bloquea la firma.
- Si el chat esta cerrado, se bloquean mensajes y firma.
- Si faltan datos requeridos del cliente, no se crea la asignacion.

### Riesgo identificado

En el proceso de firma se valida el estado, luego el controlador sube la imagen a storage y despues finaliza la firma. Si ocurre un error intermedio, podria quedar un archivo subido sin que la asignacion cambie de estado. No necesariamente compromete seguridad, pero si puede dejar residuos o inconsistencias.

### Evaluacion

SEAL cumple parcialmente. En general bloquea acciones peligrosas y responde con errores seguros, pero algunos flujos con IO externo podrian manejar compensaciones o limpieza.

### Mejora recomendada

Agregar limpieza automatica si falla una operacion despues de subir archivos:

- Si falla `finalizeSignAssignment`, borrar la firma subida.
- Si falla la aprobacion despues de generar PDF, borrar PDF temporal.
- Registrar eventos fallidos para auditoria.

## 4.7 Seguridad por defecto

**Estado: Cumple parcialmente**

La seguridad por defecto indica que el sistema debe venir configurado con restricciones seguras desde el inicio.

### Evidencias en SEAL

Aspectos positivos:

- JWT requiere `JWT_SECRET`.
- Firebase requiere archivo de credenciales externo.
- `TOKEN_PEPPER` es obligatorio.
- `GEMINI_API_KEY` se carga desde entorno.
- `SMTP_USER` y `SMTP_PASS` no estan escritos en el codigo.
- Hay limite global de peticiones.
- Hay limite de archivo `.docx`.
- Los drafts expiran y se limpian mediante job programado.
- Los tokens de recuperacion y firma movil expiran.

### Aspectos a mejorar

El archivo `.env.example` contiene valores de ejemplo como:

```txt
JWT_SECRET=change-me
TOKEN_PEPPER=change-me
ADMIN_BOOTSTRAP_PASSWORD=change-me-strong-password
```

Esto es normal en un archivo de ejemplo, pero debe quedar documentado que esos valores no pueden usarse en produccion.

### Evaluacion

SEAL tiene buenas bases, pero para considerarse completamente seguro por defecto deberia incluir configuraciones mas restrictivas para produccion.

### Mejora recomendada

Agregar validaciones en arranque para impedir produccion con valores inseguros:

- Bloquear `JWT_SECRET=change-me`.
- Bloquear `TOKEN_PEPPER=change-me`.
- Exigir `NODE_ENV=production` con HTTPS.
- Exigir CORS restringido en produccion.

## 4.8 Evitar la seguridad por oscuridad

**Estado: Cumple**

Este principio indica que no se debe depender de ocultar el funcionamiento interno del sistema como unica medida de seguridad.

### Evidencias en SEAL

SEAL no depende de rutas secretas o nombres ocultos para proteger operaciones. En su lugar usa:

- JWT.
- Roles.
- Validacion de propiedad de asignaciones.
- Validacion de estados.
- Tokens temporales con expiracion.
- Hashes para firmas y PDFs.
- Validacion de placeholders.

Aunque un atacante conozca las rutas del API, no podria operar sin token valido y sin el rol adecuado.

### Evaluacion

SEAL cumple este principio porque la seguridad se basa en controles verificables y no en ocultar detalles internos.

## 4.9 Uso de criptografia robusta

**Estado: Cumple parcialmente**

La criptografia robusta protege datos sensibles en transito y en reposo.

### Evidencias en SEAL

SEAL utiliza varios mecanismos relacionados con criptografia:

- Passwords hasheados con `bcryptjs`.
- JWT firmados con `JWT_SECRET`.
- Tokens temporales para recuperacion de contrasena.
- Tokens temporales para firma movil.
- `TOKEN_PEPPER` para fortalecer tokens almacenados.
- Hash SHA-256 para firmas y PDFs.

Los hashes permiten comprobar integridad de:

- Imagen de firma.
- PDF final aprobado.
- Plantillas generadas o editadas.

### Limitacion

No se observa en el codigo una configuracion directa de HTTPS, aunque normalmente esto se implementa en el servidor de despliegue, proxy o hosting. Tampoco se observa cifrado adicional de campos sensibles en Firestore, como RFC, CURP o direccion.

### Evaluacion

SEAL cumple parcialmente. Usa hashing y tokens correctamente para varios flujos, pero faltaria documentar y garantizar cifrado en transito mediante HTTPS y considerar proteccion adicional para datos personales.

### Mejora recomendada

Para produccion:

- Servir frontend y backend exclusivamente por HTTPS.
- Usar cookies seguras para tokens.
- Evaluar cifrado de campos sensibles como CURP, RFC y direccion.
- Rotar secretos periodicamente.
- Usar secretos administrados por plataforma, no archivos manuales en servidores compartidos.

## 4.10 Gestion segura de errores y registros

**Estado: Cumple parcialmente**

Este principio busca evitar que el usuario final reciba informacion tecnica sensible.

### Evidencias en SEAL

El backend responde errores de forma controlada:

- `401` para token faltante o invalido.
- `403` para acceso prohibido.
- `400` para body invalido.
- `404` para recursos inexistentes.
- `409` para conflicto de estado.

El middleware global de errores responde:

```json
{
  "ok": false,
  "message": "Internal server error"
}
```

Esto evita enviar stack traces al usuario final.

### Riesgo identificado

El backend imprime errores completos en consola. Esto es util en desarrollo, pero en produccion puede exponer informacion sensible si los logs no estan protegidos.

Tambien algunos errores devuelven `details`, por ejemplo errores de validacion. Esto es util para frontend, pero debe revisarse que no se filtren datos internos.

### Evaluacion

SEAL cumple parcialmente. Los errores hacia el usuario estan controlados, pero la politica de logs deberia endurecerse para produccion.

### Mejora recomendada

Implementar niveles de log:

- Desarrollo: logs detallados.
- Produccion: logs sanitizados, sin secretos, tokens, headers completos ni datos personales.

Tambien se recomienda:

- No registrar contrasenas, tokens, firmas base64 ni credenciales.
- Agregar IDs de correlacion para rastrear errores sin exponer informacion sensible.

## 4.11 No almacenar secretos en el codigo

**Estado: Cumple**

Este principio indica que contrasenas, tokens, llaves privadas y credenciales no deben estar escritas directamente en el codigo fuente.

### Evidencias en SEAL

El backend obtiene secretos desde variables de entorno:

- `JWT_SECRET`
- `FIREBASE_SERVICE_ACCOUNT`
- `TOKEN_PEPPER`
- `SMTP_USER`
- `SMTP_PASS`
- `GEMINI_API_KEY`
- `ADMIN_BOOTSTRAP_PASSWORD`

El frontend usa:

- `NEXT_PUBLIC_API_URL`

El archivo `.env.example` solo contiene valores de referencia, no secretos reales.

### Evaluacion

SEAL cumple este principio porque centraliza configuracion sensible en variables de entorno y archivos externos.

### Mejora recomendada

Agregar al repositorio una politica clara:

- Nunca subir `.env`.
- Nunca subir archivos reales de Firebase dentro de `Back/secrets`.
- Usar `.gitignore` para secretos.
- Usar un gestor de secretos en despliegue.

## 5. Controles de seguridad especificos por modulo

## 5.1 Autenticacion

Controles implementados:

- Login con correo y password.
- Hash de password.
- JWT firmado.
- Cambio de password autenticado.
- Recuperacion de password con token temporal.
- Bloqueo de usuarios deshabilitados.

Cumplimiento relacionado:

- Autenticacion solida.
- No almacenar secretos.
- Criptografia robusta.
- Fallar de forma segura.

## 5.2 Usuarios y roles

Controles implementados:

- Roles `ADMIN` y `CLIENT`.
- Middleware `requireRole`.
- Separacion de rutas administrativas y de cliente.
- Estado de usuario `ACTIVE` o `DISABLED`.
- Perfil de cliente con RFC, CURP, telefono y direccion.

Cumplimiento relacionado:

- Minimo privilegio.
- Autorizacion solida.
- Validacion de entradas.

## 5.3 Contratos y plantillas

Controles implementados:

- Subida controlada de `.docx`.
- Tamano maximo de archivo.
- Conversion de `.docx` a HTML.
- Catalogo de placeholders permitidos.
- Validacion de placeholders.
- Versionado de contratos.
- Commits con mensaje.
- Locks de edicion para evitar conflictos.
- Drafts con expiracion.

Cumplimiento relacionado:

- Validacion de entradas.
- Defensa en profundidad.
- Fallar de forma segura.
- Seguridad por defecto.

## 5.4 Asignaciones de contratos

Controles implementados:

- Precheck antes de asignar.
- Verificacion de perfil completo.
- Validacion de placeholders de empleado y empresa.
- Snapshot del contrato asignado.
- Estados del flujo.
- Bitacora de eventos.
- Chat abierto/cerrado.

Cumplimiento relacionado:

- Validacion de entradas.
- Autorizacion.
- Fallar de forma segura.
- Defensa en profundidad.

## 5.5 Firma digital

Controles implementados:

- Firma en PNG base64.
- Validacion de cabecera PNG.
- Hash de firma.
- Almacenamiento de imagen de firma.
- Registro de IP y user agent.
- Estado `SIGNED`.
- Aprobacion posterior por administrador.
- Generacion de PDF final con hash.

Cumplimiento relacionado:

- Criptografia robusta.
- Defensa en profundidad.
- Fallar de forma segura.
- Autorizacion.

## 5.6 Firma movil

Controles implementados:

- Token temporal de firma.
- Expiracion de token.
- Verificacion de que el token corresponde a la asignacion y cliente.
- Marcado de token como usado.
- Flujo publico limitado solo al token.

Cumplimiento relacionado:

- Autenticacion temporal.
- Minimo privilegio.
- Fallar de forma segura.
- Defensa en profundidad.

## 5.7 IA para plantillas

Controles implementados:

- Gemini recibe instrucciones para usar solo placeholders permitidos.
- La respuesta se espera como JSON.
- Se valida la plantilla generada antes de guardarla.
- Se exige edicion humana antes de publicar.
- Se incluye advertencia de revision humana/legal.

Cumplimiento relacionado:

- Validacion de entradas.
- Defensa en profundidad.
- Seguridad por defecto.

Riesgo a considerar:

- La IA puede generar HTML no deseado o contenido legal incorrecto. El proyecto mitiga parte del riesgo con validacion de placeholders y revision humana, pero faltaria sanitizacion HTML y revision legal formal.

## 6. Recomendaciones generales de mejora

1. **Sanitizar HTML de plantillas**

   Implementar una libreria de sanitizacion para evitar scripts, eventos HTML peligrosos o etiquetas no permitidas.

2. **Cambiar almacenamiento de sesion**

   En lugar de guardar JWT en `localStorage`, usar cookies `HttpOnly`, `Secure` y `SameSite`.

3. **Restringir CORS en produccion**

   Permitir solo el dominio real del frontend.

4. **Agregar pruebas de seguridad**

   Probar validaciones, roles, tokens expirados, firmas invalidas y accesos cruzados entre clientes.

5. **Mejorar logs**

   Sanitizar registros en produccion y evitar datos personales, tokens o firmas base64.

6. **Agregar roles mas granulares**

   Separar permisos administrativos para reducir riesgos internos.

7. **Validar configuracion insegura en produccion**

   Impedir iniciar la aplicacion con secretos de ejemplo como `change-me`.

8. **Documentar despliegue seguro**

   Incluir HTTPS, variables de entorno, rotacion de secretos y configuracion de Firebase.

9. **Proteger datos personales**

   Evaluar cifrado adicional para RFC, CURP, telefono y direccion.

10. **Fortalecer auditoria**

    Registrar intentos fallidos, cambios de permisos, aprobaciones, rechazos, tokens usados y descargas de PDF.

## 7. Conclusion

El proyecto SEAL muestra una aplicacion importante de principios de codificacion segura. Aunque todavia no esta terminado al 100%, ya cuenta con bases solidas:

- Validacion estricta de datos mediante Zod.
- Autenticacion con JWT.
- Autorizacion por roles.
- Separacion entre administrador y cliente.
- Tokens temporales para operaciones sensibles.
- Hashing de passwords, firmas y PDFs.
- Rate limiting.
- Validacion de archivos y placeholders.
- Control de estados en el flujo de firma.
- Manejo controlado de errores.
- Uso de variables de entorno para secretos.

Los principios mejor cubiertos son:

- Validacion de entradas.
- Autenticacion y autorizacion.
- No almacenar secretos en codigo.
- Evitar seguridad por oscuridad.

Los principios que se cumplen parcialmente y requieren mayor fortalecimiento son:

- Codificacion de salidas.
- Minimo privilegio.
- Defensa en profundidad.
- Fallar de forma segura.
- Seguridad por defecto.
- Criptografia robusta.
- Gestion segura de errores y registros.

En conclusion, SEAL es un proyecto con buena arquitectura de seguridad para su etapa actual. La mayor area de mejora esta en endurecerlo para un entorno productivo: sanitizacion HTML, cookies seguras, CORS restrictivo, logs sanitizados, roles granulares, pruebas de seguridad y documentacion de despliegue seguro.

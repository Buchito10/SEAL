# Checklist de Codificacion Segura - Proyecto SEAL

**Proyecto:** SEAL - Plataforma de gestion, asignacion y firma digital de contratos laborales

**Alumnos/Equipo:** ____________________________________________

**Fecha de Evaluacion:** 01 / 07 / 2026

## Criterios de marcado

- **[x] Cumple:** el proyecto implementa el control solicitado.
- **[~] Cumple parcialmente:** el proyecto tiene una implementacion relacionada, pero requiere refuerzo.
- **[ ] No cumple:** no se encontro implementacion suficiente en el estado actual del proyecto.

---

# Bloque 1: Arquitectura de la Informacion y Gestion de Secretos

Este bloque evalua que la infraestructura de codigo base y la informacion sensible esten completamente aisladas.

## 1.1 Aislamiento de Credenciales (.env)

- [x] **Aislamiento de Credenciales (.env):** Todas las llaves API, tokens de autenticacion, contrasenas y cadenas de conexion a bases de datos estan parametrizadas en archivos de variables de entorno.

**Estado en SEAL:** Cumple.

**Evidencia encontrada:**

El backend carga configuraciones sensibles desde variables de entorno en `Back/src/config/env.js`. Entre ellas:

- `JWT_SECRET`
- `FIREBASE_SERVICE_ACCOUNT`
- `FIREBASE_STORAGE_BUCKET`
- `TOKEN_PEPPER`
- `SMTP_USER`
- `SMTP_PASS`
- `GEMINI_API_KEY`
- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`

El frontend tambien usa configuracion por entorno mediante:

- `NEXT_PUBLIC_API_URL`

Archivos relacionados:

- `Back/.env.example`
- `Front/.env.local.example`
- `Back/src/config/env.js`

**Conclusion:**

El proyecto no deja credenciales reales escritas directamente en el codigo fuente. Los secretos se configuran mediante archivos `.env` y variables de entorno.

**Recomendacion:**

Mantener los `.env` reales fuera del repositorio y usar un gestor de secretos en produccion.

---

## 1.2 Proteccion del Repositorio (.gitignore)

- [x] **Proteccion del Repositorio (.gitignore):** El archivo `.gitignore` esta correctamente configurado y se verifico que no se suban por error archivos `.env`, `node_modules`, carpetas de compilacion ni secretos.

**Estado en SEAL:** Cumple.

**Evidencia encontrada:**

Existe un archivo `.gitignore` en la raiz del proyecto. Este ignora:

- `node_modules/`
- `.next/`
- `dist/`
- `build/`
- `coverage/`
- `.env`
- `.env.*`
- `Back/secrets/`
- archivos `.pem`, `.key`, `.p12`, `.pfx`
- archivos de credenciales de Firebase
- `Back/.local-storage/`
- archivos de logs

La revision del estado de Git muestra que los siguientes elementos estan ignorados correctamente:

- `Back/.env`
- `Front/.env.local`
- `Front/.next/`
- `Back/secrets/`
- `Back/.local-storage/`

**Conclusion:**

El repositorio esta protegido contra la inclusion accidental de dependencias, secretos, credenciales, builds y archivos generados localmente.

**Recomendacion:**

Antes de entregar o subir a GitHub, ejecutar una revision final con:

```bash
git status --ignored
```

---

## 1.3 Entornos Separados

- [~] **Entornos Separados:** El codigo distingue explicitamente entre variables para desarrollo local y produccion.

**Estado en SEAL:** Cumple parcialmente.

**Evidencia encontrada:**

El backend utiliza:

- `NODE_ENV`
- `PORT`
- `FRONT_RESET_URL`
- `FRONT_SIGN_URL`
- `FIREBASE_STORAGE_BUCKET`
- `ENABLE_LOCAL_DRAFT_CLEANUP`

El frontend utiliza:

- `NEXT_PUBLIC_API_URL`

Ademas, existen archivos de ejemplo:

- `Back/.env.example`
- `Front/.env.local.example`

**Limitacion:**

No se encontraron archivos separados como:

- `.env.development`
- `.env.production`

Tampoco se observan validaciones estrictas para impedir configuraciones inseguras en produccion, por ejemplo `JWT_SECRET=change-me`.

**Conclusion:**

El proyecto soporta variables de entorno y distingue configuraciones mediante `NODE_ENV`, pero todavia no separa formalmente archivos de desarrollo y produccion.

**Recomendacion:**

Crear plantillas separadas:

- `Back/.env.development.example`
- `Back/.env.production.example`
- `Front/.env.development.example`
- `Front/.env.production.example`

Tambien se recomienda bloquear el arranque en produccion si se usan secretos de ejemplo.

---

# Bloque 2: Validacion, Saneamiento y Manejo de Entradas de Usuario

Este bloque verifica las defensas del codigo contra ataques comunes de inyeccion, como SQL Injection, XSS y Command Injection.

## 2.1 Validacion Estricta de Tipos en Backend

- [x] **Validacion Estricta de Tipos (Backend):** Todas las solicitudes de la API se validan con esquemas de tipado fuerte o librerias de validacion antes de ejecutar logica de negocio.

**Estado en SEAL:** Cumple.

**Evidencia encontrada:**

El backend utiliza `Zod` para validar datos de entrada. Existen esquemas en:

- `Back/src/validators/auth.schemas.js`
- `Back/src/validators/users.schemas.js`
- `Back/src/validators/contracts.schemas.js`
- `Back/src/validators/assignments.schemas.js`
- `Back/src/validators/aiChats.schemas.js`

Tambien hay validaciones especificas dentro de controladores, por ejemplo:

- `Back/src/controllers/clientProfile.controller.js`
- `Back/src/controllers/mobileSignature.controller.js`

Ejemplos de validacion:

- El login valida email y password.
- Los usuarios solo pueden tener rol `ADMIN` o `CLIENT`.
- Las versiones de contrato deben ser enteros positivos.
- Los mensajes tienen longitud maxima.
- Los estados de chat solo pueden ser `OPEN` o `CLOSED`.
- La firma debe llegar en base64 y corresponder a una imagen PNG.
- RFC, CURP y telefono se validan con expresiones regulares.

**Conclusion:**

El proyecto aplica validacion sistematica antes de ejecutar la logica principal del backend.

---

## 2.2 Saneamiento de Entradas

- [~] **Saneamiento de Entradas (Sanitization):** Las entradas de texto libre que se renderizan en frontend o se almacenan en base de datos se limpian para remover HTML o scripts maliciosos.

**Estado en SEAL:** Cumple parcialmente.

**Evidencia encontrada:**

El proyecto cuenta con una funcion `escapeHtml` en `Back/src/utils/html.js`. Esta funcion convierte caracteres peligrosos:

- `&`
- `<`
- `>`
- `"`
- `'`

Tambien se utiliza en `Back/src/utils/placeholderRender.js` para escapar los valores reales insertados en las plantillas de contrato.

Esto protege los datos provenientes de usuarios, por ejemplo:

- nombre del empleado
- correo
- RFC
- CURP
- telefono
- direccion
- valores de empresa insertados como placeholders

**Riesgo identificado:**

El frontend renderiza HTML de contratos mediante `dangerouslySetInnerHTML` en pantallas como:

- `Front/src/app/cliente/dashboard/page.tsx`
- `Front/src/app/(dashboard)/contratos/page.tsx`
- `Front/src/app/(dashboard)/plantillas/ia/page.tsx`

Aunque los valores de placeholders se escapan, las plantillas completas pueden venir de:

- archivos `.docx`
- edicion manual del administrador
- generacion con IA

No se encontro una sanitizacion HTML formal con una libreria como `DOMPurify` o `sanitize-html`.

**Conclusion:**

SEAL protege los valores insertados en placeholders, pero debe reforzar el saneamiento del HTML completo que se renderiza en el frontend.

**Recomendacion:**

Agregar una politica de sanitizacion HTML antes de guardar o renderizar plantillas. Por ejemplo:

- Backend: `sanitize-html`
- Frontend: `DOMPurify`

Tambien se recomienda bloquear etiquetas y atributos peligrosos como:

- `script`
- `iframe`
- `object`
- `embed`
- `onerror`
- `onclick`
- `javascript:`

---

## 2.3 Consultas Parametrizadas / ORM / ODM

- [x] **Consultas Parametrizadas (ORMs):** No existen concatenaciones directas de variables de texto dentro de consultas de bases de datos.

**Estado en SEAL:** Cumple.

**Evidencia encontrada:**

SEAL no utiliza SQL ni construye consultas mediante concatenacion de strings. El backend usa Firebase Admin SDK y Firestore mediante metodos seguros como:

- `collection()`
- `doc()`
- `where()`
- `get()`
- `set()`
- `update()`
- `runTransaction()`

Ejemplos de servicios que usan Firestore:

- `Back/src/services/users.service.js`
- `Back/src/services/contracts.service.js`
- `Back/src/services/assignments.service.js`
- `Back/src/services/contractVersions.service.js`
- `Back/src/services/aiChats.service.js`

**Conclusion:**

No se observaron consultas SQL ni concatenaciones directas que expongan a SQL Injection. El uso del SDK de Firestore reduce ese riesgo.

**Recomendacion:**

Mantener todas las operaciones de base de datos a traves del SDK o servicios internos, evitando consultas construidas manualmente.

---

## 2.4 Validacion en Carga de Archivos

- [x] **Validacion en Carga de Archivos:** El sistema valida extension, tipo MIME real o estructura del archivo y limita el tamano maximo.

**Estado en SEAL:** Cumple.

**Evidencia encontrada:**

La subida de contratos se maneja con `multer` en:

- `Back/src/controllers/adminContracts.controller.js`

Controles implementados:

- `multer.memoryStorage()`
- limite de tamano mediante `MAX_DOCX_MB`
- rechazo de archivos que superan el limite con `LIMIT_FILE_SIZE`

La validacion del archivo `.docx` se realiza en:

- `Back/src/services/docxValidation.service.js`

Controles implementados:

- Valida extension `.docx`.
- Rechaza archivos `.docm`.
- Valida MIME esperado de Word.
- Verifica encabezado ZIP `PK`.
- Verifica que exista `word/document.xml`.
- Rechaza macros si existe `word/vbaProject.bin`.

**Conclusion:**

La carga de archivos esta protegida con validaciones de tamano, extension, MIME, estructura interna y bloqueo de macros.

**Recomendacion:**

Agregar pruebas automatizadas con archivos:

- `.docx` valido
- `.docm`
- archivo renombrado a `.docx` sin estructura ZIP
- `.docx` con macros
- archivo que exceda `MAX_DOCX_MB`

---

# Bloque 3: Autenticacion, Control de Accesos y Gestion de Sesiones

Este bloque garantiza que la identidad de los usuarios este protegida y que no existan vulnerabilidades de escalacion de privilegios.

## 3.1 Cifrado de Contrasenas

- [x] **Cifrado de Contrasenas:** Las contrasenas en la base de datos se almacenan con hashing seguro. Nunca se almacenan en texto plano.

**Estado en SEAL:** Cumple.

**Evidencia encontrada:**

El backend usa `bcryptjs` en:

- `Back/src/utils/password.js`

La funcion `hashPassword` genera un salt con costo 12:

```js
const salt = await bcrypt.genSalt(12);
return bcrypt.hash(plain, salt);
```

La verificacion se realiza con:

```js
return bcrypt.compare(plain, hash);
```

Este mecanismo se usa en:

- creacion de usuarios
- bootstrap de administrador
- cambio de contrasena
- recuperacion de contrasena
- login

**Conclusion:**

Las contrasenas no se guardan en texto plano. Se almacenan como hash con bcrypt y salt.

---

## 3.2 Principio de Menor Privilegio (RBAC)

- [x] **Principio de Menor Privilegio (RBAC):** El sistema implementa control de acceso basado en roles y valida permisos en cada endpoint del backend.

**Estado en SEAL:** Cumple.

**Evidencia encontrada:**

El backend implementa:

- `Back/src/middlewares/authJWT.js`
- `Back/src/middlewares/requireRole.js`

Las rutas administrativas usan:

```js
router.use(authJWT, requireRole("ADMIN"));
```

Las rutas del cliente usan:

```js
router.use(authJWT, requireRole("CLIENT"));
```

Esto se aplica en:

- `Back/src/routes/admin.routes.js`
- `Back/src/routes/adminContracts.routes.js`
- `Back/src/routes/adminAssignments.routes.js`
- `Back/src/routes/adminAiChats.routes.js`
- `Back/src/routes/clientAssignments.routes.js`

Ademas, en los servicios y controladores se valida que un cliente solo pueda consultar o firmar sus propias asignaciones.

**Conclusion:**

El control de accesos no depende solo del frontend. La API valida autenticacion y rol en backend.

**Recomendacion:**

Para una version productiva, dividir el rol `ADMIN` en permisos mas granulares:

- administrador general
- area legal
- recursos humanos
- soporte

---

## 3.3 Seguridad de Tokens JWT

- [x] **Seguridad de Tokens (JWT):** Los JWT usan secret, expiran y no contienen informacion altamente confidencial.

**Estado en SEAL:** Cumple.

**Evidencia encontrada:**

El token se firma en:

- `Back/src/utils/token.js`

Con:

```js
jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
```

La expiracion se configura en:

- `Back/src/config/env.js`

Valor por defecto:

```txt
JWT_EXPIRES_IN=1h
```

El payload del token contiene:

- `userId`
- `role`

No contiene:

- password
- hash de password
- RFC
- CURP
- direccion
- datos bancarios
- firma digital

**Conclusion:**

El JWT contiene solo datos minimos de identidad y autorizacion, tiene expiracion y usa un secret configurado por entorno.

**Recomendacion:**

En produccion:

- Usar un `JWT_SECRET` largo y aleatorio.
- Rotar secretos periodicamente.
- Evitar valores de ejemplo como `change-me`.
- Evaluar refresh tokens con rotacion.

---

## 3.4 Atributos de Cookies Seguras

- [ ] **Atributos de Cookies Seguras:** Las cookies de sesion cuentan con `HttpOnly`, `Secure` y `SameSite`.

**Estado en SEAL:** No cumple en el estado actual.

**Evidencia encontrada:**

El frontend almacena la sesion en `localStorage`, no en cookies:

- `Front/src/lib/auth.ts`

Se usan claves:

- `seal_token`
- `seal_user`

El token se lee desde `localStorage` y se manda en el header:

```txt
Authorization: Bearer <token>
```

**Conclusion:**

No existen cookies de sesion, por lo tanto no se pueden aplicar banderas `HttpOnly`, `Secure` ni `SameSite`.

Esto no rompe el funcionamiento del sistema, pero desde seguridad web moderna es menos seguro que cookies `HttpOnly`, ya que un XSS podria leer el token desde `localStorage`.

**Recomendacion:**

Migrar el manejo de sesion a cookies seguras:

- `HttpOnly`
- `Secure`
- `SameSite=Lax` o `SameSite=Strict`
- expiracion corta
- refresh token separado

---

# Bloque 4: Encabezados de Seguridad HTTP y Configuracion de Red

Este bloque verifica que el servidor y las respuestas HTTP mitiguen vectores de ataque desde el navegador.

## 4.1 Manejo Correcto de CORS

- [~] **Manejo Correcto de CORS:** La politica CORS esta configurada explicitamente permitiendo solo el dominio del frontend en produccion.

**Estado en SEAL:** Cumple parcialmente.

**Evidencia encontrada:**

El backend activa CORS en:

- `Back/src/app.js`

Con:

```js
app.use(cors());
```

**Limitacion:**

La configuracion actual no restringe explicitamente origenes. Al usar `cors()` sin opciones, el backend queda abierto a solicitudes desde distintos origenes.

Esto puede ser aceptable en desarrollo local, pero no es recomendable para produccion.

**Conclusion:**

SEAL usa CORS, pero todavia no aplica una politica restrictiva por entorno.

**Recomendacion:**

Configurar CORS con una variable como:

```txt
FRONTEND_ORIGIN=https://seal.midominio.com
```

Y aplicar:

```js
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true
}));
```

Para desarrollo:

```txt
FRONTEND_ORIGIN=http://localhost:3000
```

---

## 4.2 Proteccion Helmet / Encabezados HTTP

- [x] **Proteccion Helmets/Encabezados:** El servidor implementa middleware de seguridad como `helmet`.

**Estado en SEAL:** Cumple.

**Evidencia encontrada:**

El backend importa y utiliza `helmet` en:

- `Back/src/app.js`

Con:

```js
const helmet = require("helmet");
app.use(helmet());
```

Helmet ayuda a configurar cabeceras de seguridad como:

- `X-Content-Type-Options`
- `X-Frame-Options`
- protecciones basicas contra clickjacking
- politicas iniciales relacionadas con seguridad del navegador

**Conclusion:**

El backend implementa una capa de proteccion de encabezados HTTP mediante `helmet`.

**Recomendacion:**

Para produccion, revisar y personalizar la politica CSP segun los recursos reales que use el frontend.

---

# Bloque 5: Manejo de Errores, Bitacoras y Logs

Este bloque previene que el sistema revele pistas que faciliten el mapeo de vulnerabilidades a atacantes externos.

## 5.1 Abstraccion de Errores en Produccion

- [x] **Abstraccion de Errores en Produccion:** Las excepciones del backend no envian stack traces ni detalles internos al cliente.

**Estado en SEAL:** Cumple.

**Evidencia encontrada:**

El backend cuenta con middleware global de errores:

- `Back/src/middlewares/errorHandler.js`

Este responde:

```json
{
  "ok": false,
  "message": "Internal server error"
}
```

Tambien se usa un patron de respuestas controladas con `ok` y `fail`, evitando enviar trazas completas al usuario final.

Ejemplos de errores controlados:

- `401`: token faltante o invalido
- `403`: acceso prohibido
- `400`: body invalido
- `404`: recurso no encontrado
- `409`: conflicto de estado

**Conclusion:**

El sistema evita exponer stack traces al cliente y responde con mensajes controlados.

**Observacion:**

Algunos errores de validacion incluyen `details`. Esto es util para formularios, pero debe revisarse en produccion para asegurar que no se filtren datos internos.

---

## 5.2 Logs de Seguridad Centralizados

- [~] **Logs de Seguridad Centralizados:** Los errores detallados se registran internamente para analisis de desarrolladores.

**Estado en SEAL:** Cumple parcialmente.

**Evidencia encontrada:**

El backend usa:

- `morgan("dev")` en `Back/src/app.js`
- `console.error` en `Back/src/middlewares/errorHandler.js`

Esto permite registrar errores y peticiones en la consola del servidor durante desarrollo.

**Limitacion:**

No se encontro un sistema formal de logs centralizados, archivos protegidos, rotacion de logs o separacion de niveles por entorno.

No se observo integracion con herramientas como:

- Winston
- Pino
- Sentry
- Cloud Logging
- Datadog

**Conclusion:**

El sistema registra informacion util para desarrollo, pero no cuenta aun con una estrategia robusta de logging para produccion.

**Recomendacion:**

Agregar logging estructurado y seguro:

- niveles `info`, `warn`, `error`
- logs sanitizados
- omitir tokens, contrasenas, firmas base64 y datos personales
- agregar IDs de correlacion
- almacenar logs en un sistema restringido

---

# Resumen General del Checklist

| Bloque | Control | Estado |
|---|---|---|
| 1 | Aislamiento de Credenciales | Cumple |
| 1 | Proteccion del Repositorio | Cumple |
| 1 | Entornos Separados | Cumple parcialmente |
| 2 | Validacion Estricta de Tipos | Cumple |
| 2 | Saneamiento de Entradas | Cumple parcialmente |
| 2 | Consultas Parametrizadas / ORM | Cumple |
| 2 | Validacion en Carga de Archivos | Cumple |
| 3 | Cifrado de Contrasenas | Cumple |
| 3 | RBAC / Menor Privilegio | Cumple |
| 3 | Seguridad de JWT | Cumple |
| 3 | Cookies Seguras | No cumple |
| 4 | CORS Restrictivo | Cumple parcialmente |
| 4 | Helmet / Encabezados | Cumple |
| 5 | Abstraccion de Errores | Cumple |
| 5 | Logs Centralizados | Cumple parcialmente |

## Resultado cuantitativo

Total de controles evaluados: **15**

- Cumple: **10**
- Cumple parcialmente: **4**
- No cumple: **1**

## Porcentaje aproximado de cumplimiento

Si se considera:

- Cumple = 1 punto
- Cumple parcialmente = 0.5 puntos
- No cumple = 0 puntos

Entonces:

```txt
Puntaje obtenido = 10 + (4 * 0.5) = 12
Puntaje maximo = 15
Cumplimiento aproximado = 80%
```

**Resultado:** SEAL cumple aproximadamente con el **80%** del checklist de codificacion segura evaluado.

---

# Conclusion Final

El proyecto SEAL presenta una base solida de codificacion segura para su etapa actual. Los controles mas fuertes se encuentran en:

- gestion de secretos mediante variables de entorno
- proteccion del repositorio con `.gitignore`
- validacion de entradas con Zod
- control de acceso por roles
- autenticacion con JWT
- hashing de contrasenas con bcrypt
- validacion de archivos `.docx`
- uso de Helmet
- manejo controlado de errores

Los principales puntos pendientes para fortalecer el proyecto son:

- separar formalmente entornos de desarrollo y produccion
- sanitizar HTML completo antes de renderizar plantillas
- migrar tokens de `localStorage` a cookies seguras
- restringir CORS por dominio
- implementar logs centralizados y sanitizados

En conclusion, SEAL cumple la mayoria de los principios evaluados por el checklist. El sistema no esta terminado al 100%, pero ya incorpora practicas importantes de seguridad desde el backend y tiene una arquitectura clara para seguir endureciendose antes de un despliegue productivo.

# Política de privacidad de Seal Contratos

**Versión:** 1.1-2026-07-10
**Última actualización:** 10 de julio de 2026
**Responsable:** Seal Contratos, proyecto académico
**Domicilio de referencia:** Ciudad de México, México
**Contacto de demostración para privacidad y derechos ARCO:** privacidad@seal.example

> Aviso académico: antes de una puesta en producción deben sustituirse el responsable, el domicilio y el correo de demostración por los datos completos y verificables de la entidad operadora.

## 1. Objeto

Esta política informa qué datos personales trata Seal Contratos, con qué finalidades, durante cuánto tiempo, con quién pueden compartirse, qué medidas de seguridad se aplican y cómo puede la persona titular ejercer sus derechos. Se elaboró con base en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) vigente, publicada el 20 de marzo de 2025 y con última reforma publicada en el DOF el 14 de noviembre de 2025.

## 2. Datos personales tratados

- Identificación y contacto: nombre, correo electrónico, teléfono, RFC, CURP y domicilio.
- Cuenta y seguridad: contraseña almacenada únicamente como hash, rol, estado de cuenta, sesiones, fechas de acceso y bitácoras de seguridad.
- Relación contractual: puesto, contratos asignados, mensajes, aprobaciones, versiones, evidencias y documentos asociados.
- Firma: trazo de firma, fecha, ubicación dentro del documento y evidencia técnica de la operación.
- Privacidad: identidad, medio de respuesta, derecho ARCO solicitado y documentación de soporte.

El administrador autorizado da de alta la cuenta con nombre, correo y puesto. La persona invitada confirma el control del correo y crea su contraseña mediante un enlace temporal. Los datos adicionales se recaban al completar el perfil o participar en un flujo contractual. Seal no solicita datos personales sensibles durante la activación. Si una función posterior llegara a requerirlos, se informará la finalidad y se solicitará el consentimiento expreso correspondiente.

## 3. Finalidades

### Finalidades necesarias

- Crear, autenticar, administrar y proteger la cuenta.
- Preparar, asignar, revisar, aprobar y firmar contratos con evidencia y trazabilidad.
- Enviar avisos operativos, enlaces temporales y notificaciones de seguridad.
- Atender soporte, solicitudes ARCO, revocaciones y limitaciones de uso.
- Prevenir fraude y accesos no autorizados; mantener bitácoras y cumplir obligaciones legales.

### Finalidad secundaria

Seal puede generar métricas técnicas disociadas para mantener y mejorar la aplicación. No se usan para publicidad ni para vender perfiles. La persona titular puede oponerse mediante el canal de privacidad.

Los datos no se usarán para una finalidad incompatible sin informar previamente y, cuando corresponda, obtener un nuevo consentimiento.

## 4. Consentimiento y evidencia

La pantalla de activación, accesible únicamente desde la invitación enviada al correo autorizado, presenta por separado esta política y el documento de protección de datos. Las casillas no están premarcadas y la cuenta permanece pendiente hasta que ambas sean aceptadas y la persona establezca su contraseña. El servidor valida nuevamente el token, las aceptaciones y las versiones, y conserva:

- Fecha y hora de aceptación.
- Versión de la política de privacidad.
- Versión del documento de protección de datos personales.
- Origen de la aceptación: activación de cuenta por invitación administrativa.

El consentimiento puede revocarse sin efectos retroactivos escribiendo a privacidad@seal.example. La revocación puede impedir el servicio cuando el tratamiento sea indispensable para una relación contractual o una obligación legal.

## 5. Derechos ARCO

La persona titular puede ejercer sus derechos de acceso, rectificación, cancelación y oposición, así como limitar el uso o divulgación de sus datos, enviando una solicitud a privacidad@seal.example. Debe indicar:

1. Nombre y medio para recibir notificaciones.
2. Documentos que acrediten identidad o representación.
3. Descripción de los datos involucrados.
4. Derecho que desea ejercer y resultado solicitado.
5. Elementos que ayuden a localizar los datos.

Seal comunicará su determinación en un máximo de veinte días hábiles desde la recepción. Si resulta procedente, la hará efectiva dentro de los quince días hábiles siguientes. Los plazos pueden ampliarse una sola vez por un periodo igual cuando las circunstancias lo justifiquen.

## 6. Transferencias y proveedores

Los datos pueden ser tratados por proveedores que actúan por cuenta de Seal, como infraestructura en la nube, almacenamiento, correo y soporte técnico. Deben sujetarse a instrucciones, confidencialidad y medidas de seguridad. Seal no vende datos personales.

Una transferencia a un tercero distinto de un encargado se sujetará a esta política y al consentimiento aplicable, salvo las excepciones legales, como un requerimiento fundado de autoridad o una transferencia necesaria para cumplir la relación jurídica con la persona titular.

## 7. Conservación y eliminación

- Cuenta y perfil: durante la relación y, después, durante el bloqueo necesario para atender responsabilidades legales o contractuales.
- Contratos, firmas y evidencias: durante la relación y los plazos legales de prescripción aplicables.
- Tokens temporales: hasta su uso o vencimiento.
- Bitácoras: durante el periodo mínimo proporcional para seguridad, auditoría y defensa de derechos.

Al concluir la finalidad y el plazo aplicable, los datos se suprimen de forma segura o se disocian para impedir la identificación. Una solicitud de cancelación puede dar lugar a un periodo de bloqueo antes de la supresión.

## 8. Seguridad

Seal adopta controles administrativos, técnicos y físicos proporcionales al riesgo: validación de entradas, hash de contraseñas con bcrypt, autenticación mediante tokens de corta duración, control de roles, limitación de solicitudes, encabezados de seguridad, bitácoras y accesos restringidos. En producción, la transmisión debe realizarse exclusivamente mediante HTTPS/TLS y el almacenamiento debe configurarse con cifrado y gestión segura de llaves.

Ninguna medida elimina totalmente el riesgo. El equipo revisará sus controles cuando cambien la tecnología, la sensibilidad de la información o las consecuencias posibles para las personas.

## 9. Vulneraciones de seguridad

Ante una posible vulneración, el equipo debe identificarla, contenerla, preservar evidencia, evaluar el alcance, corregir la causa y documentar las decisiones. Cuando afecte de forma significativa derechos patrimoniales o morales, se informará de forma inmediata a las personas afectadas para que puedan defender sus derechos. La comunicación indicará, al menos:

- Naturaleza del incidente.
- Datos posiblemente comprometidos.
- Recomendaciones para la persona titular.
- Acciones correctivas y preventivas.
- Canal de atención.

La LFPDPPP vigente exige informar de forma inmediata en este supuesto; no establece una ventana genérica de 72 horas.

## 10. Cambios a la política

Los cambios se publicarán en la ruta `/politica-privacidad`, indicando versión y fecha. Si modifican finalidades o requieren un nuevo consentimiento, la aplicación solicitará una aceptación renovada antes de continuar con el tratamiento correspondiente.

## Fuentes normativas

- Cámara de Diputados, *Ley Federal de Protección de Datos Personales en Posesión de los Particulares*, texto vigente, última reforma DOF 14-11-2025: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
- Cámara de Diputados, *Reglamento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares*: https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LFPDPPP.pdf

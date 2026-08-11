# Lineamientos de protección de datos personales de Seal

**Versión:** 1.1-2026-07-10
**Última actualización:** 10 de julio de 2026
**Alcance:** Diseño, desarrollo, operación y retiro de funcionalidades de Seal Contratos
**Responsable interno:** Equipo desarrollador de Seal

## Objetivo

Establecer controles verificables para que Seal trate datos personales de forma lícita, informada, proporcional y segura. Los lineamientos se basan en los principios de licitud, finalidad, lealtad, consentimiento, calidad, proporcionalidad, información y responsabilidad de la LFPDPPP vigente.

## 1. Consentimiento informado

- Poner el aviso de privacidad a disposición antes de recabar datos.
- Presentar casillas independientes, no premarcadas, y mantener la cuenta pendiente hasta la aceptación durante la activación.
- Conservar fecha, hora y versión de cada documento aceptado.
- Solicitar un nuevo consentimiento ante finalidades incompatibles o datos sensibles.
- Permitir la revocación sin efectos retroactivos e informar sus consecuencias.

**Aplicación actual:** el administrador crea una cuenta en estado `PENDING_ACTIVATION` y envía una invitación de un solo uso. `/activar-cuenta#token=...` enlaza los dos documentos, exige ambas casillas y el backend valida el propósito del token, activa la cuenta y guarda la evidencia en `consent_record`. El fragmento evita enviar el secreto al servidor Web o registrarlo en la URL de la API.

## 2. Finalidad y minimización

- Definir una finalidad concreta para cada dato antes de agregarlo.
- Recabar únicamente datos necesarios, adecuados y relevantes.
- Limitar el alta administrativa a nombre, correo y puesto; la persona invitada únicamente crea su contraseña durante la activación.
- Usar datos ficticios o disociados en pruebas.
- Revisar formularios, bitácoras e integraciones para retirar información innecesaria.

## 3. Seguridad de los datos

- Forzar HTTPS/TLS en producción y cifrado del almacenamiento con llaves protegidas.
- Nunca almacenar contraseñas en texto claro; usar hash robusto con sal.
- Aplicar mínimo privilegio, roles, autenticación, vencimiento de tokens y límites de solicitudes.
- Validar entradas, limitar archivos y evitar secretos o datos personales en logs.
- Mantener parches, respaldos, revisión de dependencias, bitácoras y pruebas de restauración.
- Documentar responsables de acceso y retirar permisos cuando dejen de ser necesarios.

**Aplicación actual:** bcrypt con factor de costo 12, JWT, autorización por roles, Zod, Helmet, rate limiting y secretos mediante variables de entorno. El despliegue productivo debe completar HTTPS/TLS y verificar el cifrado administrado del almacenamiento.

## 4. Derechos de las personas

- Permitir consultar y corregir el perfil dentro de la aplicación cuando sea posible.
- Recibir solicitudes ARCO y revocaciones en privacidad@seal.example.
- Verificar la identidad o representación antes de entregar o modificar datos.
- Responder en veinte días hábiles y, si procede, ejecutar dentro de los quince siguientes.
- Bloquear y posteriormente suprimir datos cancelados, salvo conservación legal vigente.

## 5. Retención y eliminación

- Asignar a cada categoría una finalidad, propietario y plazo.
- Bloquear los datos al concluir la finalidad cuando exista responsabilidad pendiente.
- Eliminar de forma segura al vencer el plazo o disociar de manera irreversible.
- Incluir archivos temporales, copias y respaldos en el proceso de depuración.
- Conservar evidencia de eliminación y justificar las excepciones.

## 6. Política de privacidad

El aviso integral debe permanecer accesible desde la activación y cualquier punto donde se recaben nuevos datos. Debe describir responsable y domicilio, datos tratados, finalidades, medios de limitación, derechos ARCO, transferencias, retención, seguridad y cambios. El lenguaje debe ser claro y distinguir finalidades necesarias de secundarias.

## 7. Transferencias y encargados

- Inventariar proveedor, datos compartidos, ubicación, finalidad, base y periodo de acceso.
- Exigir instrucciones documentadas, confidencialidad, seguridad y devolución o supresión.
- Informar y obtener consentimiento cuando sea necesario.
- Documentar las excepciones legales.
- Prohibir venta de datos y usos propios incompatibles por parte del proveedor.

## 8. Respuesta a vulneraciones

1. Identificar y clasificar el evento.
2. Contenerlo sin destruir evidencia.
3. Determinar datos, titulares, sistemas y consecuencias afectadas.
4. Corregir la causa y recuperar la operación segura.
5. Notificar de forma inmediata cuando exista afectación significativa a derechos patrimoniales o morales.
6. Informar naturaleza, datos, recomendaciones, acciones y canal de atención.
7. Registrar decisiones, tiempos y lecciones aprendidas.

La ley vigente utiliza el criterio de notificación inmediata; no fija una ventana genérica de 72 horas para este supuesto.

## 9. Responsabilidad y revisión

El equipo designará a una persona o área de privacidad, capacitará a quienes accedan a datos y revisará estos lineamientos al menos una vez al año o ante cambios relevantes. Cada nueva funcionalidad debe identificar datos, finalidad, base, accesos, transferencias, retención y riesgos antes de publicarse.

## Matriz de cumplimiento

| Tema | Criterio de aceptación | Evidencia en Seal | Estado |
|---|---|---|---|
| Consentimiento | Aceptación expresa, clara y no premarcada | Invitación administrativa, `/activar-cuenta`, validación del backend y `consent_record` | Cumple |
| Finalidad | Datos limitados al propósito informado | Alta administrativa mínima y finalidades documentadas | Cumple |
| Seguridad | Controles administrativos, técnicos y físicos | bcrypt, JWT, roles, Zod, Helmet y límites; HTTPS/cifrado se verifican al desplegar | Parcial |
| Derechos ARCO | Acceso, rectificación, cancelación y oposición | Edición de perfil y canal documentado; falta automatizar cancelación/oposición | Parcial |
| Retención | Plazos y supresión posterior | Criterios documentados; falta automatización integral por categoría | Parcial |
| Privacidad | Aviso integral accesible y detallado | `/politica-privacidad` y documento Word | Cumple |
| Transferencias | Información, consentimiento y control a terceros | Reglas e inventario requeridos; falta registro operativo de proveedores | Parcial |
| Vulneraciones | Procedimiento y aviso inmediato | Procedimiento documentado; falta módulo formal de gestión de incidentes | Parcial |

## Fuentes normativas

- Cámara de Diputados, *Ley Federal de Protección de Datos Personales en Posesión de los Particulares*, texto vigente, última reforma DOF 14-11-2025: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
- Cámara de Diputados, *Reglamento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares*: https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LFPDPPP.pdf

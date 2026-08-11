export const PRIVACY_NOTICE_VERSION = "1.1-2026-07-10";
export const DATA_PROTECTION_VERSION = "1.1-2026-07-10";
export const PRIVACY_CONTACT = "privacidad@seal.example";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const privacyPolicySections: LegalSection[] = [
  {
    title: "1. Identidad del responsable",
    paragraphs: [
      "Seal Contratos, proyecto académico de gestión y firma digital de contratos con domicilio de referencia en Ciudad de México, México, es responsable del tratamiento de los datos personales recabados mediante esta aplicación.",
      `El canal habilitado para privacidad y derechos ARCO es ${PRIVACY_CONTACT}. Antes de una puesta en producción deberán sustituirse los datos académicos por la razón social, domicilio completo y medio de contacto reales del responsable.`,
    ],
  },
  {
    title: "2. Datos personales tratados",
    bullets: [
      "Identificación y contacto: nombre, correo electrónico, teléfono, RFC, CURP y domicilio.",
      "Cuenta y seguridad: contraseña almacenada únicamente como hash, rol, estado de cuenta, sesiones, fechas de acceso y bitácoras de seguridad.",
      "Relación contractual: puesto, contratos asignados, mensajes, aprobaciones, versiones, evidencias y documentos asociados.",
      "Firma: trazo de firma, fecha, ubicación dentro del documento y evidencia técnica vinculada a la operación.",
      "Solicitudes de privacidad: identidad, medio de respuesta, derecho ARCO solicitado y documentación de soporte.",
    ],
    paragraphs: [
      "El administrador autorizado da de alta la cuenta con nombre, correo y puesto. La persona invitada confirma el control del correo y crea su contraseña mediante un enlace temporal; posteriormente completa los datos necesarios para su perfil o sus contratos. Seal no solicita datos personales sensibles durante la activación; si una operación posterior llegara a requerirlos, se informará la finalidad y se solicitará el consentimiento expreso correspondiente.",
    ],
  },
  {
    title: "3. Finalidades del tratamiento",
    bullets: [
      "Crear, autenticar, administrar y proteger la cuenta del usuario.",
      "Preparar, asignar, revisar, aprobar y firmar contratos, conservando evidencia y trazabilidad.",
      "Enviar avisos operativos, enlaces temporales y notificaciones de seguridad.",
      "Atender soporte, ejercer derechos ARCO, revocar el consentimiento y limitar el uso o divulgación.",
      "Prevenir fraude, accesos no autorizados y otros incidentes; mantener bitácoras y cumplir obligaciones legales.",
      "Generar métricas técnicas disociadas para mantener y mejorar la aplicación, sin utilizarlas para publicidad o venta de perfiles.",
    ],
    paragraphs: [
      "Seal limitará el tratamiento a estas finalidades. Cualquier finalidad nueva o incompatible se informará previamente y, cuando corresponda, requerirá un nuevo consentimiento.",
    ],
  },
  {
    title: "4. Consentimiento y revocación",
    paragraphs: [
      "En la activación por invitación se presentan por separado este aviso y el documento de protección de datos. Ninguna casilla aparece seleccionada por defecto y la cuenta permanece pendiente hasta aceptar expresamente ambos documentos y establecer una contraseña. Seal conserva la versión aceptada y la fecha y hora de aceptación como evidencia.",
      `El consentimiento puede revocarse sin efectos retroactivos escribiendo a ${PRIVACY_CONTACT}. La revocación puede impedir la continuidad del servicio cuando el tratamiento sea indispensable para la relación contractual o para cumplir una obligación legal.`,
    ],
  },
  {
    title: "5. Derechos ARCO y limitación de uso",
    paragraphs: [
      `La persona titular puede solicitar acceso, rectificación, cancelación u oposición (ARCO), así como limitar el uso o divulgación, mediante un mensaje a ${PRIVACY_CONTACT}. La solicitud debe indicar nombre, medio de respuesta, derecho que desea ejercer, descripción de los datos y documentos para acreditar identidad o representación.`,
      "Seal comunicará su determinación en un máximo de veinte días hábiles desde la recepción y, si resulta procedente, la hará efectiva dentro de los quince días hábiles siguientes. Ambos plazos pueden ampliarse una sola vez por un periodo igual cuando las circunstancias lo justifiquen.",
    ],
  },
  {
    title: "6. Transferencias y encargados",
    paragraphs: [
      "Los datos pueden ser tratados por proveedores que actúan por cuenta de Seal, como infraestructura en la nube, almacenamiento, correo y soporte técnico, bajo deberes de confidencialidad y seguridad. No se venden datos personales.",
      "Una transferencia a un tercero distinto de un encargado se sujetará a este aviso y al consentimiento aplicable, salvo las excepciones legales, por ejemplo, requerimientos fundados de una autoridad competente o transferencias necesarias para cumplir la relación jurídica con la persona titular.",
    ],
  },
  {
    title: "7. Conservación y eliminación",
    bullets: [
      "Cuenta y perfil: durante la relación con el usuario y, al terminar, durante el bloqueo necesario para atender responsabilidades legales o contractuales.",
      "Contratos, firmas y evidencias: durante la vigencia de la relación y los plazos legales de prescripción aplicables.",
      "Tokens temporales: hasta su uso o vencimiento.",
      "Bitácoras de seguridad: por el periodo mínimo proporcional para investigación, auditoría y defensa de derechos.",
      "Al vencer la finalidad y el plazo aplicable, los datos se suprimen de forma segura o se disocian para impedir la identificación.",
    ],
  },
  {
    title: "8. Seguridad y vulneraciones",
    paragraphs: [
      "Seal aplica controles administrativos, técnicos y físicos proporcionales al riesgo: validación de entradas, hash de contraseñas con bcrypt, autenticación mediante tokens de corta duración, control de roles, limitación de solicitudes, encabezados de seguridad, bitácoras y acceso restringido. En producción, la transmisión debe realizarse exclusivamente mediante HTTPS/TLS y el almacenamiento debe configurarse con cifrado y gestión segura de llaves.",
      "Una vulneración que afecte de forma significativa los derechos patrimoniales o morales de las personas titulares será investigada, contenida y comunicada de forma inmediata a las personas afectadas, explicando la naturaleza del incidente, los datos comprometidos, las acciones correctivas y las medidas recomendadas.",
    ],
  },
  {
    title: "9. Cambios al aviso",
    paragraphs: [
      "Los cambios se publicarán en esta misma ruta, indicando versión y fecha. Si modifican las finalidades o requieren un nuevo consentimiento, la aplicación solicitará una aceptación renovada antes de continuar con el tratamiento correspondiente.",
    ],
  },
];

export const dataProtectionSections: LegalSection[] = [
  {
    title: "Objetivo y alcance",
    paragraphs: [
      "Este documento establece los lineamientos que el equipo de Seal debe aplicar durante el diseño, desarrollo, operación y retiro de funcionalidades que traten datos personales. Se basa en los principios de licitud, finalidad, lealtad, consentimiento, calidad, proporcionalidad, información y responsabilidad.",
    ],
  },
  {
    title: "1. Consentimiento informado",
    bullets: [
      "Presentar el aviso de privacidad antes de recabar datos y mantenerlo visible y comprensible.",
      "Usar casillas independientes, no premarcadas, y mantener la cuenta pendiente hasta su aceptación durante la activación.",
      "Registrar la versión de cada documento y la fecha y hora de aceptación.",
      "Solicitar un consentimiento nuevo cuando cambie una finalidad o se incorporen datos sensibles.",
    ],
  },
  {
    title: "2. Finalidad y minimización",
    bullets: [
      "Definir una finalidad concreta para cada dato antes de incorporarlo a un formulario o base de datos.",
      "Recabar únicamente datos necesarios, adecuados y relevantes para la cuenta y el flujo contractual.",
      "Evitar copiar datos a ambientes de prueba; utilizar datos ficticios o disociados.",
      "Revisar periódicamente formularios, campos, bitácoras e integraciones para retirar información innecesaria.",
    ],
  },
  {
    title: "3. Seguridad de los datos",
    bullets: [
      "Aplicar HTTPS/TLS en producción y cifrado de almacenamiento administrado con llaves protegidas.",
      "Nunca almacenar contraseñas en texto claro; usar hash robusto con sal y factor de costo vigente.",
      "Aplicar mínimo privilegio, roles, autenticación, vencimiento de tokens y límites de solicitudes.",
      "Validar entradas, restringir tamaños de archivo y evitar exponer secretos, datos o trazas en logs.",
      "Mantener respaldos, parches, revisión de dependencias, bitácoras auditables y pruebas de restauración.",
    ],
  },
  {
    title: "4. Derechos de las personas",
    bullets: [
      "Permitir consultar y corregir el perfil desde la aplicación cuando sea posible.",
      `Canalizar solicitudes ARCO y de revocación a ${PRIVACY_CONTACT}, verificando la identidad del solicitante.`,
      "Responder dentro de veinte días hábiles y ejecutar la determinación procedente dentro de los quince días hábiles siguientes, documentando cada etapa.",
      "Bloquear y posteriormente suprimir datos cancelados, salvo conservación exigida por una obligación o responsabilidad vigente.",
    ],
  },
  {
    title: "5. Retención y eliminación",
    bullets: [
      "Asignar a cada categoría de información un propietario, finalidad y plazo de conservación.",
      "Desactivar el tratamiento al concluir la finalidad y aplicar bloqueo cuando exista una responsabilidad pendiente.",
      "Eliminar de manera segura datos, respaldos y archivos temporales al vencer el plazo, o disociarlos de forma irreversible.",
      "Conservar evidencia de eliminación y revisar excepciones legales antes de ejecutar cancelaciones.",
    ],
  },
  {
    title: "6. Transparencia y política de privacidad",
    bullets: [
      "Mantener el aviso integral accesible desde activación, inicio de sesión y áreas donde se recaben nuevos datos.",
      "Describir responsable, datos, finalidades, medios de limitación, derechos ARCO, transferencias, conservación, seguridad y cambios.",
      "Usar lenguaje claro y separar finalidades necesarias de cualquier finalidad secundaria.",
    ],
  },
  {
    title: "7. Transferencias y proveedores",
    bullets: [
      "Inventariar proveedores, datos compartidos, ubicación, finalidad, base de legitimación y periodo de acceso.",
      "Exigir confidencialidad, instrucciones documentadas, seguridad, devolución o supresión y apoyo ante incidentes.",
      "Informar y obtener consentimiento antes de transferencias que lo requieran; documentar las excepciones legales.",
      "No vender datos personales ni permitir usos propios incompatibles por parte de encargados.",
    ],
  },
  {
    title: "8. Respuesta a vulneraciones",
    bullets: [
      "Identificar, contener, preservar evidencia, evaluar alcance y corregir la causa raíz.",
      "Determinar si existe afectación significativa a derechos patrimoniales o morales.",
      "Notificar de forma inmediata a las personas afectadas cuando corresponda; la ley vigente no fija una ventana genérica de 72 horas.",
      "Comunicar naturaleza del incidente, datos comprometidos, recomendaciones, acciones correctivas y canal de atención.",
      "Registrar decisiones, responsables, tiempos y lecciones aprendidas, y actualizar controles después del incidente.",
    ],
  },
  {
    title: "9. Responsabilidad y revisión",
    paragraphs: [
      "El equipo debe designar a una persona o área responsable de privacidad, capacitar a quienes acceden a datos, revisar este documento al menos una vez al año y realizar una evaluación antes de cambios que incrementen el riesgo. El incumplimiento debe corregirse y documentarse.",
    ],
  },
];

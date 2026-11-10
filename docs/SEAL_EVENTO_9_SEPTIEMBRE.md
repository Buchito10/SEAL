# SEAL · preparación para el 9 de septiembre de 2026

## Objetivo de la demostración

Mostrar una historia completa: una plantilla se convierte en un contrato que el cliente comprende, firma y administración revisa. Las pantallas deben apoyar esa historia; evita dedicar los cinco minutos a recorrer todos los menús.

## Guion de cinco minutos y apoyo de diapositivas

| Tiempo | Apoyo | Mensaje y acción |
| --- | --- | --- |
| 0:00–0:40 | Diapositiva 1: el problema | «Un contrato no termina cuando alguien lo redacta. Hay que completar datos, aclarar dudas, recoger una firma y saber cuál es la versión final. Cuando eso queda entre archivos y mensajes, es fácil perder el seguimiento». |
| 0:40–1:15 | Diapositiva 2: la propuesta | «SEAL reúne la preparación, revisión, firma y seguimiento en un mismo expediente. La empresa administra el proceso y el cliente participa desde su dispositivo». Apoya el mensaje con el recorrido de cuatro etapas de la portada. |
| 1:15–2:00 | Proyecto: plantilla | Abre una plantilla preparada, cambia una frase e inserta un campo. Explica que los campos evitan volver a capturar datos y que los cambios se registran por versión. Ten una nota de cambio escrita de antemano. |
| 2:00–2:50 | Proyecto: IA | Abre un expediente, pregunta por las obligaciones y muestra un fragmento del contrato. «La IA ayuda a comprender y preparar documentos; las decisiones y la revisión siguen en manos de las personas». Usa una pregunta corta que ya hayas ensayado. |
| 2:50–3:50 | Proyecto: cliente y firma | Cambia a una ventana de cliente previamente abierta. Muestra la lectura y la firma desde el dispositivo. Vuelve a administración para explicar la revisión y el PDF final. Si tarda, usa un expediente de ejemplo ya completado para enseñar el resultado. |
| 3:50–4:30 | Diapositiva 3: valor | «La información, las versiones y la actividad se pueden consultar desde un mismo lugar». Muestra el historial. No afirmes ahorros medidos, certificaciones o garantías jurídicas que todavía no estén demostrados. |
| 4:30–5:00 | Diapositiva 4: siguiente paso | Explica a qué tipo de organización quieres ayudar primero y qué te gustaría validar con ella. «En el stand podemos recorrer juntos un contrato y conocer cómo encajaría en su proceso». |

El premio no necesita formar parte del discurso. Dedica el cierre al problema que resuelves, al usuario y al siguiente paso del producto.

## Recorrido del stand

- **30 segundos:** presenta el problema y deja que la persona cambie de etapa en la portada. Esa vista está identificada como ilustrativa y usa datos ficticios.
- **2 minutos:** muestra una plantilla, una consulta sobre el contrato y el expediente final. Puedes adaptar el ejemplo al visitante sin crear cuentas reales.
- **5 minutos:** recorre la experiencia de administrador y cliente; termina preguntando en qué parte de su proceso pierde más tiempo.

## Preparación por día

**6 de septiembre:** cerrar los ajustes de navegación, consultas y editor; validar móvil y escritorio. Preparar datos ficticios y una plantilla corta.

**7 de septiembre:** ensayar el recorrido con la conexión y los dispositivos que llevarás. Comprobar el proveedor de IA, los correos, la firma y el PDF en un entorno de prueba autorizado. Preparar diapositivas y un video breve del flujo completo como respaldo.

**8 de septiembre:** realizar dos ensayos cronometrados, corregir solo fallos que afecten la presentación y conservar una versión estable. Comprobar cargadores, sesión de cliente, navegador y conectividad.

**9 de septiembre:** abrir las ventanas antes de empezar; comprobar el estado del sistema. Llevar un expediente completo además del que usarás en vivo.

## Alcance técnico de esta mejora

- Navegación administrativa con iconos, sección Ajustes, menú móvil modal, acceso a cierre de sesión y enlace para saltar al contenido.
- Asistente de lectura accesible desde las pantallas administrativas, con selección explícita del expediente. Usa los endpoints existentes y sus permisos.
- Componente de consultas compartido con el portal del cliente: preguntas sugeridas, respuestas visibles, fragmentos desplegables, entrada multilínea, copia y errores recuperables.
- El historial de consultas del componente existe mientras permanece montado; no agrega almacenamiento de conversaciones de cliente al backend. Cada consulta se responde con el contrato como contexto. El Estudio IA conserva su historial existente en el servidor.
- Editor visual compartido entre las plantillas y el Estudio IA, con formato, deshacer/rehacer, campos, vista HTML y limpieza de contenido ejecutable al representar/guardar desde este editor.
- Advertencia al cerrar el editor o recargar con cambios pendientes; guardado explícito de borradores. No se implementó autoguardado.
- API de desarrollo por `/api`, evitando depender de que `localhost` del teléfono sea el servidor. El proxy local se configura con `API_PROXY_TARGET`.

## Puertas antes de producción

La compilación y las pruebas de interfaz no sustituyen una prueba con los servicios reales. Antes de publicar esta versión:

1. Confirmar dominio, HTTPS y variables de producción conforme a `docs/despliegue-nextjs-nginx-https.md` y a la directiva de liberación existente.
2. Probar en un entorno aislado la activación por correo, la recuperación de acceso y los permisos entre usuarios. No ejecutar semillas de demo contra datos reales sin revisar su efecto.
3. Probar carga DOCX → edición → versión → asignación → consulta IA → firma móvil → aprobación → descarga PDF.
4. Comprobar respuestas del proveedor de IA, límites y comportamiento de respaldo. No presentar respuestas de respaldo como generación del proveedor.
5. Revisar dependencias, respaldo persistente y restauración; conservar la versión anterior para volver atrás.
6. Revisar en el servidor la validación y limpieza del HTML de todos los puntos de entrada. La limpieza en el editor no protege peticiones externas directas al API.

Las pruebas `npm --prefix qa run test:ui` usan respuestas simuladas explícitas del API para comprobar interacción y presentación sin contactar Firebase, SMTP ni el proveedor de IA. La suite de integración existente sigue separada.

# Cartel de SEAL - septiembre de 2026

## Entrega

- `SEAL_cartel_60x90cm.pdf`: una página vertical de 600 x 900 mm. Texto y elementos de composición vectoriales; fuentes incrustadas y capturas de alta resolución.
- `SEAL_cartel_vista_previa.png`: vista previa de 1200 x 1800 px. Para imprimir, usar el PDF.
- `crear_cartel.py`: fuente reproducible del PDF, con ReportLab y las fuentes Georgia/Arial de este equipo.
- `capturar_firma.cjs`: captura reproducible de la pantalla móvil blanca en la aplicación real, con respuestas simuladas del API.
- `assets/`: recursos usados y capturas alternativas.

El archivo tiene tamaño final, sin sangrado ni marcas de corte. Si la imprenta requiere sangrado, perfil CMYK específico u otro tamaño, debe prepararse esa variante antes de imprimir. Las capturas se colocan con aproximadamente 307 ppp en escritorio y 385 ppp en móvil.

## Contenido

Se sustituyó el enfoque de renovación por gestión digital de contratos. Se incluyeron plantillas y versiones, consultas del contrato con IA, firma móvil y seguimiento/aprobación. Se retiraron estadísticas sin verificar y las pantallas ilustradas que mostraban funciones ajenas a la aplicación actual.

Las capturas provienen de la aplicación local de SEAL en ejecución, mediante Playwright. La de escritorio corresponde a `/contratos`, pestaña IA. La móvil corresponde a `/firma-movil`. No se redibujó la interfaz ni se alteraron sus estilos para las capturas.

Los datos son ficticios. Escritorio usa `qa/fixtures/workspace.js`; la pantalla móvil recibe una respuesta simulada de verificación para un contrato de ejemplo y una persona de demostración. La palabra DEMO se dibujó sobre el lienzo usando eventos de puntero. No se confirmó ni se envió ninguna firma. El token mostrado en el navegador de captura es ficticio y carece de validez.

## Identidad y generación de recursos

El cartel se reconstruyó como documento, conservando la paleta crema, verde oscuro y dorado y la composición tipográfica inspirada en la referencia del usuario. El archivo original permanece intacto.

El recurso final `assets/seal-escudo-transparente.png` adapta el escudo oficial del equipo con transparencia real, sin recuadro blanco. Se obtuvo con la herramienta integrada ImageGen y se revisó sobre el fondo crema del cartel y en la aplicación. El original permanece en `assets/seal-escudo.jpeg`. El prompt exacto y la procedencia están en `Front/public/brand/PROCEDENCIA.md` dentro del proyecto.

Esta versión amplía la explicación con tres problemas, cuatro etapas de uso, tres grupos de herramientas y cuatro beneficios previstos. Incluye importación DOCX, plantillas, campos, borradores, versiones, IA para propuestas y consulta, chat con administración, clientes, accesos, actividad, firma y PDF aprobado. No presenta cifras de impacto medido. El texto permanece vectorial y las capturas muestran la interfaz real con datos ficticios.

## Regenerar en este equipo

```bash
node output/pdf/seal-cartel/capturar_escritorio.cjs
node output/pdf/seal-cartel/capturar_firma.cjs
/Users/hugoromero/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 output/pdf/seal-cartel/crear_cartel.py
pdftoppm -scale-to 1800 -singlefile -png output/pdf/seal-cartel/SEAL_cartel_60x90cm.pdf output/pdf/seal-cartel/SEAL_cartel_vista_previa
```

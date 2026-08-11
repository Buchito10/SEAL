from __future__ import annotations

import json
import textwrap
from pathlib import Path

from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "SEAL_Release_Deployment_QA.pdf"
K6_IMAGE = ROOT / "qa" / "reports" / "evidence" / "k6-production-summary.png"
LH_IMAGE = ROOT / "qa" / "reports" / "evidence" / "lighthouse-production-overview.png"

TEAL = colors.HexColor("#00A889")
NAVY = colors.HexColor("#123B63")
BLUE = colors.HexColor("#087DBA")
LIGHT_TEAL = colors.HexColor("#E8F6F3")
LIGHT_BLUE = colors.HexColor("#EAF2F8")
GOLD = colors.HexColor("#C99A36")
INK = colors.HexColor("#20272E")
MUTED = colors.HexColor("#5B6874")
LINE = colors.HexColor("#D7E0E6")
GREEN = colors.HexColor("#138A5B")


def register_fonts() -> tuple[str, str, str]:
    candidates = [
        ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Supplemental/Arial Italic.ttf"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf"),
    ]
    for regular, bold, italic in candidates:
        if all(Path(p).exists() for p in (regular, bold, italic)):
            pdfmetrics.registerFont(TTFont("SealSans", regular))
            pdfmetrics.registerFont(TTFont("SealSans-Bold", bold))
            pdfmetrics.registerFont(TTFont("SealSans-Italic", italic))
            return "SealSans", "SealSans-Bold", "SealSans-Italic"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"


FONT, FONT_BOLD, FONT_ITALIC = register_fonts()


class ReportDoc(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph):
            style = flowable.style.name
            if style in {"H1", "H2"}:
                level = 0 if style == "H1" else 1
                text = flowable.getPlainText()
                key = f"h-{self.seq.nextf('heading')}"
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(text, key, level=level, closed=False)
                if level == 0:
                    self.notify("TOCEntry", (level, text, self.page, key))


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.setStrokeColor(TEAL)
        canvas.setLineWidth(2)
        canvas.line(18 * mm, height - 15 * mm, width - 18 * mm, height - 15 * mm)
        canvas.setFillColor(NAVY)
        canvas.setFont(FONT_BOLD, 8.5)
        canvas.drawString(18 * mm, height - 11.5 * mm, "SEAL · Deployment & Quality Assurance")
        canvas.setFillColor(MUTED)
        canvas.setFont(FONT, 8)
        canvas.drawRightString(width - 18 * mm, 10 * mm, f"Página {doc.page}")
    canvas.restoreState()


def cover_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)

    canvas.setFillColor(TEAL)
    canvas.roundRect(22 * mm, height - 43 * mm, 30 * mm, 19 * mm, 3 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont(FONT_BOLD, 22)
    canvas.drawCentredString(37 * mm, height - 36.5 * mm, "UT")
    canvas.setFillColor(BLUE)
    canvas.setFont(FONT, 13)
    canvas.drawString(58 * mm, height - 29 * mm, "UNIVERSIDAD TECNOLÓGICA DE")
    canvas.setFillColor(NAVY)
    canvas.setFont(FONT_BOLD, 20)
    canvas.drawString(58 * mm, height - 38 * mm, "SAN JUAN DEL RÍO")

    canvas.setFillColor(LIGHT_TEAL)
    for y in (88, 132, 176):
        canvas.roundRect(18 * mm, y * mm, 54 * mm, 23 * mm, 3 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.rect(33 * mm, y * mm, 12 * mm, 23 * mm, fill=1, stroke=0)
        canvas.setFillColor(LIGHT_TEAL)

    canvas.setFillColor(TEAL)
    canvas.rect(0, 0, width, 7 * mm, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.rect(width * 0.55, 0, width * 0.45, 7 * mm, fill=1, stroke=0)
    canvas.restoreState()


def page_decoration(canvas, doc):
    if doc.page == 1:
        cover_page(canvas, doc)
    else:
        header_footer(canvas, doc)


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", fontName=FONT_BOLD, fontSize=23, leading=28, textColor=colors.black, alignment=TA_CENTER, spaceAfter=16))
styles.add(ParagraphStyle(name="CoverSub", fontName=FONT, fontSize=13, leading=18, textColor=NAVY, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1", parent=styles["Heading1"], fontName=FONT_BOLD, fontSize=18, leading=22, textColor=NAVY, spaceBefore=6, spaceAfter=10))
styles.add(ParagraphStyle(name="H2", parent=styles["Heading2"], fontName=FONT_BOLD, fontSize=13, leading=17, textColor=TEAL, spaceBefore=9, spaceAfter=6))
styles.add(ParagraphStyle(name="CodeHeading", parent=styles["Heading2"], fontName=FONT_BOLD, fontSize=11, leading=14, textColor=TEAL, spaceBefore=7, spaceAfter=5))
styles.add(ParagraphStyle(name="BodySeal", parent=styles["BodyText"], fontName=FONT, fontSize=9.5, leading=14, alignment=TA_JUSTIFY, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontName=FONT, fontSize=8, leading=11, textColor=MUTED, spaceAfter=4))
styles.add(ParagraphStyle(name="BulletSeal", parent=styles["BodyText"], fontName=FONT, fontSize=9.3, leading=13.5, leftIndent=12, firstLineIndent=-7, bulletIndent=3, textColor=INK, spaceAfter=4))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName=FONT, fontSize=9.2, leading=13.5, leftIndent=9, rightIndent=9, borderColor=TEAL, borderWidth=1, borderPadding=8, backColor=LIGHT_TEAL, textColor=INK, spaceBefore=5, spaceAfter=9))
styles.add(ParagraphStyle(name="CodeSeal", fontName="Courier", fontSize=6.2, leading=7.5, leftIndent=5, rightIndent=5, borderColor=LINE, borderWidth=0.5, borderPadding=6, backColor=colors.HexColor("#F6F8FA"), textColor=colors.HexColor("#1F2933"), spaceAfter=7))
styles.add(ParagraphStyle(name="TableHead", fontName=FONT_BOLD, fontSize=8.5, leading=11, textColor=colors.white, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="TableCell", fontName=FONT, fontSize=8.2, leading=11, textColor=INK))


def P(text: str, style: str = "BodySeal") -> Paragraph:
    return Paragraph(text, styles[style])


def bullet(text: str) -> Paragraph:
    return Paragraph(f"• {text}", styles["BulletSeal"])


def section(title: str):
    return [Paragraph(title, styles["H1"]), Spacer(1, 1 * mm)]


def subsection(title: str):
    return Paragraph(title, styles["H2"])


def status_table(rows, widths=(50 * mm, 92 * mm, 24 * mm)):
    data = [[P("Criterio", "TableHead"), P("Evidencia", "TableHead"), P("Estado", "TableHead")]]
    for criterion, evidence, status in rows:
        data.append([P(criterion, "TableCell"), P(evidence, "TableCell"), P(status, "TableCell")])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("TEXTCOLOR", (-1, 1), (-1, -1), GREEN),
    ]))
    return table


def architecture_drawing():
    d = Drawing(480, 118)
    boxes = [
        (4, "Usuario", "HTTPS"),
        (126, "Nginx", "80 / 443"),
        (248, "Next.js", "3000 interno"),
        (370, "Express", "3001 interno"),
    ]
    for x, title, sub in boxes:
        d.add(Rect(x, 42, 105, 52, rx=8, ry=8, fillColor=LIGHT_BLUE if title != "Nginx" else LIGHT_TEAL, strokeColor=TEAL if title == "Nginx" else NAVY, strokeWidth=1.3))
        d.add(String(x + 52.5, 70, title, textAnchor="middle", fontName=FONT_BOLD, fontSize=11, fillColor=NAVY))
        d.add(String(x + 52.5, 53, sub, textAnchor="middle", fontName=FONT, fontSize=7.5, fillColor=MUTED))
    for x in (110, 232, 354):
        d.add(Line(x, 68, x + 14, 68, strokeColor=GOLD, strokeWidth=2))
        d.add(Line(x + 10, 72, x + 14, 68, strokeColor=GOLD, strokeWidth=2))
        d.add(Line(x + 10, 64, x + 14, 68, strokeColor=GOLD, strokeWidth=2))
    d.add(String(240, 18, "Red Docker privada: los puertos internos no se publican en Internet", textAnchor="middle", fontName=FONT_ITALIC, fontSize=8, fillColor=MUTED))
    return d


def code_flowables(path: Path, label: str):
    raw_lines = path.read_text(encoding="utf-8").splitlines()
    logical = []
    for number, line in enumerate(raw_lines, start=1):
        pieces = textwrap.wrap(line, width=106, replace_whitespace=False, drop_whitespace=False) or [""]
        logical.append(f"{number:>3}  {pieces[0]}")
        logical.extend(f"     {piece}" for piece in pieces[1:])
    out = []
    chunk_size = 63
    for index in range(0, len(logical), chunk_size):
        suffix = "" if index == 0 else " (continuación)"
        out.append(Paragraph(f"Código fuente — {label}{suffix}", styles["CodeHeading"]))
        out.append(P(f"Archivo: <font name='Courier'>{path.relative_to(ROOT)}</font>", "Small"))
        out.append(Preformatted("\n".join(logical[index:index + chunk_size]), styles["CodeSeal"]))
        if index + chunk_size < len(logical):
            out.append(PageBreak())
    return out


def build_story():
    story = []
    story += [
        Spacer(1, 54 * mm),
        P("DOCUMENTO DE RELEASE", "CoverTitle"),
        P("SEAL · Deployment & Quality Assurance con IA", "CoverSub"),
        Spacer(1, 20 * mm),
        P("Hugo Mauricio Romero Rodríguez<br/>Miguel Ángel Leal Pérez<br/>Miguel Ángel Durazno Martínez<br/>Omar Hernández Cervantes", "CoverSub"),
        Spacer(1, 12 * mm),
        P("DS01SV-25", "CoverSub"),
        Spacer(1, 18 * mm),
        P("Héctor Saldaña Benítez<br/>Desarrollo Web Integral", "CoverSub"),
        Spacer(1, 20 * mm),
        P("11 de agosto de 2026<br/>San Juan del Río, Qro.", "CoverSub"),
        PageBreak(),
    ]

    story += section("Índice")
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(name="TOC1", fontName=FONT_BOLD, fontSize=10, leading=15, textColor=NAVY, leftIndent=0, firstLineIndent=0, spaceBefore=4),
        ParagraphStyle(name="TOC2", fontName=FONT, fontSize=9, leading=13, textColor=MUTED, leftIndent=12, firstLineIndent=0),
    ]
    story += [toc, PageBreak()]

    story += section("1. Resumen del release")
    story += [
        P("SEAL es una aplicación web para la elaboración, administración y firma de contratos. La versión evaluada se publicó en una máquina virtual de Azure utilizando contenedores Docker. Nginx recibe las conexiones públicas, aplica HTTPS y dirige cada solicitud al frontend Next.js o al backend Express."),
        P("El plan de calidad se construyó con apoyo de IA y después se adaptó al funcionamiento real de SEAL. Se ejecutaron cinco grupos de pruebas: unitarias, caja blanca, integración, rendimiento y usabilidad/accesibilidad. Todas las pruebas funcionales aprobaron y los puntajes solicitados por la práctica fueron superados."),
        P("<b>Sitio:</b> <link href='https://seal.westus2.cloudapp.azure.com' color='#087DBA'>https://seal.westus2.cloudapp.azure.com</link><br/><b>Repositorio:</b> <link href='https://github.com/Buchito10/SEAL' color='#087DBA'>https://github.com/Buchito10/SEAL</link>", "Callout"),
        status_table([
            ("Despliegue en nube", "Azure VM, Docker Compose, Next.js y Express activos.", "CUMPLE"),
            ("HTTPS/TLS", "Nginx, redirección HTTP→HTTPS y certificado público de Let's Encrypt.", "CUMPLE"),
            ("Pruebas con IA", "17 Jest, 4 Playwright, k6 y Lighthouse ejecutados.", "CUMPLE"),
            ("Gobernanza", "SemVer, release, rollback y privacidad documentados.", "CUMPLE"),
        ]),
    ]

    story += [PageBreak()] + section("2. Fase 1: despliegue e infraestructura")
    story += [
        subsection("Arquitectura utilizada"),
        architecture_drawing(),
        P("Docker Compose mantiene los componentes separados. Sólo Nginx publica puertos hacia Internet. El frontend y el backend se comunican por la red privada de Docker, de modo que los puertos 3000 y 3001 no quedan expuestos al exterior."),
        subsection("Flujo de una solicitud"),
        bullet("El usuario abre el dominio utilizando <b>HTTPS</b>."),
        bullet("Nginx presenta el certificado TLS y descifra la conexión."),
        bullet("Las rutas <font name='Courier'>/api</font> se envían al backend Express; el resto se envía al frontend Next.js."),
        bullet("El backend utiliza Firebase y el almacenamiento de la aplicación sin publicarlos directamente."),
        subsection("Configuración del servidor"),
        status_table([
            ("Servidor", "Azure for Students · VM roco-v4 · Ubuntu 22.04.", "ACTIVO"),
            ("Dominio", "seal.westus2.cloudapp.azure.com → 4.154.29.114.", "RESUELVE"),
            ("Firewall", "UFW y Azure NSG permiten 80/443; SSH se conserva para administración.", "ACTIVO"),
            ("Aislamiento", "SEAL está en /opt/seal y no comparte contenedores con ROCO.", "VERIFICADO"),
        ]),
    ]

    story += [PageBreak()] + section("3. Verificación de HTTPS y contenedores")
    story += [
        P("La comprobación se realizó directamente contra el sitio público. La conexión por HTTP devuelve una redirección 301 hacia HTTPS; la pantalla de inicio de sesión responde con HTTP 200 y el endpoint de salud devuelve <font name='Courier'>{\"ok\":true}</font>."),
        subsection("Certificado observado"),
        status_table([
            ("Nombre común", "seal.westus2.cloudapp.azure.com", "VÁLIDO"),
            ("Emisor", "Let's Encrypt · YE2", "CONFIABLE"),
            ("Inicio", "11 de agosto de 2026, 15:52 UTC", "VIGENTE"),
            ("Vencimiento", "9 de noviembre de 2026, 15:52 UTC", "VIGENTE"),
        ]),
        subsection("Estado técnico"),
        bullet("Frontend y backend reportaron estado <b>healthy</b>."),
        bullet("Nginx publicó únicamente 80 y 443 para SEAL."),
        bullet("Certbot quedó activo para gestionar la renovación."),
        bullet("La base PostgreSQL y la API de ROCO continuaron funcionando después de las pruebas."),
        P("El uso del mismo servidor no implica mezclar las aplicaciones: cada proyecto tiene directorio, red, contenedores y límites propios.", "Callout"),
    ]

    story += [PageBreak()] + section("4. Fase 2: plan de pruebas asistido por IA")
    story += [
        P("Se utilizó IA como apoyo para proponer casos, aserciones, datos límite y estructura de scripts. El equipo revisó cada propuesta, la adaptó a los módulos reales de SEAL, ejecutó los comandos y conservó únicamente los resultados reproducibles. No se utilizaron credenciales ni datos personales reales."),
        subsection("Prompt adaptado"),
        P("“Actúa como QA Automation Engineer. Genera pruebas para la autenticación y el procesamiento seguro de plantillas de SEAL. Incluye Jest para casos unitarios y ramas internas, Playwright con API simulada para el login, k6 con 50 usuarios durante 30 segundos y una auditoría Lighthouse. Agrega aserciones claras y umbrales medibles.”", "Callout"),
        status_table([
            ("1. Unitarias", "Funciones y controladores aislados con Jest.", "17/17*"),
            ("2. Caja blanca", "Ramas, condiciones, escape HTML y hash SHA-256.", "APROBADA"),
            ("3. Integración", "Login, red, cookie y navegación con Playwright + mock.", "4/4"),
            ("4. Rendimiento", "50 usuarios virtuales, 30 s, p95 y errores con k6.", "APROBADA"),
            ("5. Usabilidad", "Lighthouse: accesibilidad y mejores prácticas.", "> 85"),
        ]),
        P("*Las 17 pruebas de Jest se distribuyen en cuatro suites que incluyen casos unitarios y de caja blanca.", "Small"),
    ]

    story += [PageBreak()] + section("5. Resultados de pruebas unitarias y caja blanca")
    story += [
        subsection("Resultado de Jest"),
        status_table([
            ("Suites", "4 ejecutadas", "4 APROBADAS"),
            ("Casos", "17 ejecutados", "17 APROBADOS"),
            ("Sentencias", "84.42%", "CUBIERTAS"),
            ("Ramas", "72.58%", "MEDIDAS"),
            ("Funciones", "87.50%", "CUBIERTAS"),
            ("Líneas", "90.74%", "CUBIERTAS"),
        ]),
        subsection("Qué se comprobó"),
        bullet("Extracción y validación de placeholders dentro de las plantillas."),
        bullet("Sustitución de campos y comportamiento cuando falta un valor."),
        bullet("Escape de contenido para impedir que HTML malicioso se inserte en el contrato."),
        bullet("Generación estable de la huella SHA-256 utilizada como evidencia."),
        bullet("Ramas de autenticación, validación JWT y respuestas ante sesiones inválidas."),
        P("La cobertura no significa que todo el sistema sea perfecto; indica qué porcentaje del código seleccionado fue recorrido durante esta ejecución. El resultado sirve para detectar las áreas que todavía necesitan casos adicionales.", "Callout"),
    ]

    story += [PageBreak()] + section("6. Resultados de integración con Playwright")
    story += [
        P("Playwright abrió el sitio público y simuló las respuestas del backend mediante interceptación de red. Así se validó el flujo completo de la pantalla sin crear usuarios de prueba ni alterar la base de datos."),
        status_table([
            ("Login correcto", "Formulario → API simulada → cookie HttpOnly → dashboard.", "APROBADO"),
            ("Credenciales inválidas", "Muestra error y no crea sesión.", "APROBADO"),
            ("Cambio obligatorio", "La respuesta del API dirige a cambiar-password.", "APROBADO"),
            ("Recuperación", "El control conserva un nombre accesible.", "APROBADO"),
        ]),
        P("<b>Resultado:</b> 4 de 4 escenarios aprobados en 10.0 segundos.", "Callout"),
        subsection("Comando reproducible"),
        Preformatted("BASE_URL=https://seal.westus2.cloudapp.azure.com \\\n+  npm --prefix qa run test:e2e", styles["CodeSeal"]),
    ]

    story += [PageBreak()] + section("7. Prueba de rendimiento con k6")
    story += [
        P("La prueba simuló 50 usuarios virtuales consultando la pantalla de login durante 30 segundos. Antes de iniciar se comprobó el endpoint de salud. Los umbrales exigieron menos de 1% de errores, percentil 95 inferior a 500 ms y más de 99% de checks aprobados."),
        Image(str(K6_IMAGE), width=174 * mm, height=110.2 * mm),
        Spacer(1, 3 * mm),
        P("Durante la ejecución, el frontend utilizó aproximadamente 89.88 MiB, el backend 68.61 MiB y Nginx 10.24 MiB. Los contenedores permanecieron activos y ROCO no se interrumpió.", "Small"),
    ]

    story += [PageBreak()] + section("8. Auditoría Lighthouse y WCAG 2.1")
    story += [
        P("Lighthouse auditó la página pública de inicio de sesión. La práctica exige al menos 85 puntos en Accesibilidad y Mejores Prácticas; SEAL obtuvo 95 y 96 respectivamente."),
        Image(str(LH_IMAGE), width=174 * mm, height=120.8 * mm),
        Spacer(1, 2 * mm),
        P("Métricas principales: FCP 1.1 s, LCP 1.9 s, TBT 60 ms y CLS 0. El reporte completo HTML/JSON se conserva en <font name='Courier'>qa/reports/lighthouse</font>.", "Small"),
    ]

    story += [PageBreak()] + section("9. Fase 3: política de liberación")
    story += [
        subsection("Versionamiento Git y SemVer"),
        P("Las versiones usan el formato <font name='Courier'>vMAJOR.MINOR.PATCH-release</font>. MAJOR identifica cambios incompatibles, MINOR agrega funciones compatibles y PATCH corrige defectos sin romper compatibilidad. Un ejemplo para esta entrega es <font name='Courier'>v1.0.0-release</font>."),
        subsection("Criterios antes de publicar"),
        bullet("Frontend y backend compilan correctamente."),
        bullet("Jest, Playwright, k6 y Lighthouse cumplen los criterios definidos."),
        bullet("No hay secretos, archivos <font name='Courier'>.env</font> ni llaves Firebase dentro de Git."),
        bullet("El endpoint <font name='Courier'>/api/health</font> responde y existe un punto de retorno."),
        bullet("Otro integrante revisa la versión candidata."),
        subsection("Comandos de liberación"),
        Preformatted("git tag -a v1.0.0-release -m \"Release estable 1.0.0\"\n"
                     "git push origin main --tags\n"
                     "./deploy/cloud/deploy-release.sh v1.0.0-release", styles["CodeSeal"]),
    ]

    story += [PageBreak()] + section("10. Protocolo de rollback")
    story += [
        P("Un rollback se utiliza cuando una versión recién publicada presenta errores críticos. El script conserva el commit anterior, detiene únicamente los servicios de SEAL, reconstruye esa versión y vuelve a comprobar el endpoint de salud."),
        subsection("Procedimiento"),
        bullet("Guardar los logs del incidente antes de cambiar la versión."),
        bullet("Ejecutar <font name='Courier'>./deploy/cloud/rollback.sh</font> o indicar un tag conocido."),
        bullet("Esperar la reconstrucción de los contenedores."),
        bullet("Comprobar HTTPS, <font name='Courier'>/login</font>, <font name='Courier'>/api/health</font> y el estado healthy."),
        bullet("Registrar versión, hora, síntomas, responsable y causa encontrada."),
        Preformatted("cd /opt/seal\n"
                     "docker compose logs --since=30m nginx frontend backend > incidente-release.log\n"
                     "./deploy/cloud/rollback.sh v0.9.0-release", styles["CodeSeal"]),
        P("Durante la exposición se explica el comando, pero no es necesario ejecutarlo sobre la versión estable. Esto evita provocar una interrupción sólo para demostrar el procedimiento.", "Callout"),
    ]

    story += [PageBreak()] + section("11. Normativa y privacidad")
    story += [
        P("SEAL puede tratar nombres, correos, contratos, firmas y evidencias. La directiva adopta principios de la LFPDPPP mexicana y, cuando resulte aplicable, del GDPR."),
        status_table([
            ("Finalidad y consentimiento", "Informar para qué se usan los datos antes de tratarlos.", "DEFINIDO"),
            ("Minimización", "Solicitar únicamente datos necesarios para el contrato.", "DEFINIDO"),
            ("Seguridad", "HTTPS, control por roles, sesiones protegidas y bitácora.", "IMPLEMENTADO"),
            ("Derechos", "Acceso, rectificación, cancelación y oposición; derechos GDPR aplicables.", "DOCUMENTADO"),
            ("Conservación", "Eliminar o anonimizar cuando termine la finalidad y el plazo legal.", "DEFINIDO"),
        ]),
        subsection("Avisos dentro de la interfaz"),
        bullet("<font name='Courier'>/politica-privacidad</font>: aviso general, finalidades, transferencias y contacto."),
        bullet("<font name='Courier'>/proteccion-datos</font>: derechos de las personas y medidas de protección."),
        bullet("Las evidencias académicas deben usar cuentas y contratos ficticios."),
        P("Las contraseñas, tokens, archivos .env y llaves privadas nunca se muestran en el video ni se suben al repositorio público.", "Callout"),
    ]

    story += [PageBreak()] + section("Anexo A. Código fuente de las pruebas")
    story += [P("A continuación se incluye el código fuente principal generado con asistencia de IA y adaptado al proyecto. Los archivos completos y ejecutables también forman parte del repositorio.")]
    sources = [
        (ROOT / "Back/tests/unit/placeholders.unit.test.js", "Prueba unitaria con Jest"),
        (ROOT / "Back/tests/whitebox/template-render.whitebox.test.js", "Prueba de caja blanca"),
        (ROOT / "qa/e2e/login.integration.spec.js", "Prueba de integración con Playwright"),
        (ROOT / "qa/k6/load-test.js", "Prueba de carga con k6"),
    ]
    for idx, (path, label) in enumerate(sources):
        if idx:
            story.append(PageBreak())
        story.extend(code_flowables(path, label))

    return story


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = ReportDoc(
        str(OUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=21 * mm,
        bottomMargin=16 * mm,
        title="SEAL - Documento de Release, Deployment y QA",
        author="Equipo SEAL",
        subject="Práctica final de Desarrollo Web Integral",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")
    doc.addPageTemplates([
        PageTemplate(id="content", frames=frame, onPage=page_decoration),
    ])
    story = build_story()
    doc.multiBuild(story)


if __name__ == "__main__":
    main()

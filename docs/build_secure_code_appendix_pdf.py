from pathlib import Path
import textwrap

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Preformatted,
    Table,
    TableStyle,
    KeepTogether,
)


ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = Path("/Users/hugoromero/Documents/Universidad/9no Cuatrimestre/Desarrollo Web Integral/2do Parcial/Seal - Codificación Segura.pdf")
APPENDIX = ROOT / "tmp/pdfs/seal_codigo_seguro_anexo.pdf"
FINAL = ROOT / "output/pdf/Seal - Codificacion Segura con Codigo.pdf"
FINAL_NEXT_TO_ORIGINAL = ORIGINAL.with_name("Seal - Codificacion Segura con Codigo.pdf")


CONTROLS = [
    {
        "id": "1.1",
        "title": "Aislamiento de Credenciales (.env)",
        "status": "Cumple",
        "demo": "Mostrar Back/src/config/env.js. No abrir valores reales de Back/.env durante la exposicion.",
        "snippets": [
            ("Back/src/config/env.js", 23, 42),
            ("Back/.env.example", 1, 18),
        ],
    },
    {
        "id": "1.2",
        "title": "Proteccion del Repositorio (.gitignore)",
        "status": "Cumple",
        "demo": "Mostrar .gitignore y ejecutar git status --ignored para ver .env, .next, secrets y storage local ignorados.",
        "snippets": [
            (".gitignore", 15, 35),
            (".gitignore", 40, 51),
        ],
    },
    {
        "id": "1.3",
        "title": "Entornos Separados",
        "status": "Cumple parcialmente",
        "demo": "Mostrar que existe NODE_ENV y archivos de ejemplo. Explicar que faltan plantillas separadas de produccion/desarrollo.",
        "snippets": [
            ("Back/src/config/env.js", 23, 36),
            ("Front/.env.local.example", 1, 5),
        ],
    },
    {
        "id": "2.1",
        "title": "Validacion Estricta de Tipos (Backend)",
        "status": "Cumple",
        "demo": "En la app, intentar login con correo invalido. En codigo, mostrar Zod y safeParse.",
        "snippets": [
            ("Back/src/validators/auth.schemas.js", 1, 23),
            ("Back/src/validators/assignments.schemas.js", 5, 43),
            ("Back/src/controllers/auth.controller.js", 7, 18),
        ],
    },
    {
        "id": "2.2",
        "title": "Saneamiento de Entradas (Sanitization)",
        "status": "Cumple parcialmente",
        "demo": "Mostrar escapeHtml como control positivo y dangerouslySetInnerHTML como pendiente de sanitizacion completa.",
        "snippets": [
            ("Back/src/utils/html.js", 3, 18),
            ("Back/src/utils/placeholderRender.js", 1, 35),
            ("Front/src/app/(dashboard)/contratos/page.tsx", 748, 758),
            ("Front/src/app/cliente/dashboard/page.tsx", 728, 734),
        ],
    },
    {
        "id": "2.3",
        "title": "Consultas Parametrizadas / ORM",
        "status": "Cumple",
        "demo": "Mostrar servicios Firestore. No hay SQL concatenado; se usa SDK con collection, doc, where y transacciones.",
        "snippets": [
            ("Back/src/services/users.service.js", 4, 21),
            ("Back/src/services/assignments.service.js", 317, 337),
            ("Back/src/services/assignmentWorkflow.service.js", 72, 90),
        ],
    },
    {
        "id": "2.4",
        "title": "Validacion en Carga de Archivos",
        "status": "Cumple",
        "demo": "En Admin > Plantillas intentar subir un archivo que no sea .docx. Mostrar validacion de extension, MIME, ZIP y macros.",
        "snippets": [
            ("Back/src/controllers/adminContracts.controller.js", 27, 38),
            ("Back/src/controllers/adminContracts.controller.js", 192, 217),
            ("Back/src/services/docxValidation.service.js", 3, 63),
        ],
    },
    {
        "id": "3.1",
        "title": "Cifrado de Contrasenas",
        "status": "Cumple",
        "demo": "Mostrar bcrypt.genSalt(12), bcrypt.hash y verifyPassword. No mostrar contrasenas reales.",
        "snippets": [
            ("Back/src/utils/password.js", 1, 12),
            ("Back/src/controllers/adminUsers.controller.js", 20, 35),
            ("Back/src/controllers/passwordReset.controller.js", 66, 82),
        ],
    },
    {
        "id": "3.2",
        "title": "Principio de Menor Privilegio (RBAC)",
        "status": "Cumple",
        "demo": "Entrar como admin y cliente. En codigo mostrar authJWT, requireRole y rutas ADMIN/CLIENT.",
        "snippets": [
            ("Back/src/middlewares/authJWT.js", 3, 18),
            ("Back/src/middlewares/requireRole.js", 1, 13),
            ("Back/src/routes/admin.routes.js", 1, 13),
            ("Back/src/routes/clientAssignments.routes.js", 1, 12),
        ],
    },
    {
        "id": "3.3",
        "title": "Seguridad de Tokens (JWT)",
        "status": "Cumple",
        "demo": "Hacer login y mostrar DevTools > Local Storage > seal_token. En codigo mostrar payload minimo y expiracion.",
        "snippets": [
            ("Back/src/utils/token.js", 1, 12),
            ("Back/src/controllers/auth.controller.js", 20, 39),
            ("Front/src/lib/api.ts", 339, 368),
        ],
    },
    {
        "id": "3.4",
        "title": "Atributos de Cookies Seguras",
        "status": "No cumple",
        "demo": "Mostrar en DevTools que la sesion vive en Local Storage, no en cookies HttpOnly/Secure/SameSite.",
        "snippets": [
            ("Front/src/lib/auth.ts", 13, 24),
            ("Front/src/lib/auth.ts", 33, 59),
            ("Front/src/app/(dashboard)/layout.tsx", 17, 24),
        ],
    },
    {
        "id": "4.1",
        "title": "Manejo Correcto de CORS",
        "status": "Cumple parcialmente",
        "demo": "Mostrar Back/src/app.js: usa cors(), pero sin origin restringido. Explicar que en produccion debe limitarse.",
        "snippets": [
            ("Back/src/app.js", 1, 5),
            ("Back/src/app.js", 33, 37),
        ],
    },
    {
        "id": "4.2",
        "title": "Helmet / Encabezados HTTP",
        "status": "Cumple",
        "demo": "Con backend prendido ejecutar curl -I http://localhost:3001/health y mostrar headers de seguridad.",
        "snippets": [
            ("Back/src/app.js", 1, 5),
            ("Back/src/app.js", 22, 39),
        ],
    },
    {
        "id": "5.1",
        "title": "Abstraccion de Errores en Produccion",
        "status": "Cumple",
        "demo": "Ejecutar curl -i http://localhost:3001/admin/users sin token. Debe devolver 401 sin stack trace.",
        "snippets": [
            ("Back/src/middlewares/errorHandler.js", 1, 4),
            ("Back/src/utils/response.js", 1, 18),
            ("Back/src/middlewares/authJWT.js", 7, 17),
        ],
    },
    {
        "id": "5.2",
        "title": "Logs de Seguridad Centralizados",
        "status": "Cumple parcialmente",
        "demo": "Dejar visible la terminal del backend: Morgan registra requests. Explicar que falta logging centralizado tipo Winston/Pino/Sentry.",
        "snippets": [
            ("Back/src/app.js", 1, 6),
            ("Back/src/app.js", 33, 37),
            ("Back/src/services/gemini.service.js", 133, 139),
            ("Back/src/jobs/draftCleanup.job.js", 15, 27),
        ],
    },
]


def read_lines(path, start, end):
    full = ROOT / path
    if not full.exists():
        return f"// Archivo no encontrado: {path}"
    lines = full.read_text(encoding="utf-8", errors="replace").splitlines()
    out = []
    for idx in range(start, min(end, len(lines)) + 1):
        out.append(f"{idx:>4} | {lines[idx - 1]}")
    return "\n".join(out)


def wrap_code(text, width=98):
    wrapped = []
    for line in text.splitlines():
        if len(line) <= width:
            wrapped.append(line)
            continue
        prefix = ""
        if " | " in line[:10]:
            prefix = "     | "
        chunks = textwrap.wrap(line, width=width, subsequent_indent=prefix, break_long_words=False, break_on_hyphens=False)
        wrapped.extend(chunks or [line])
    return "\n".join(wrapped)


def status_color(status):
    if status == "Cumple":
        return colors.HexColor("#E8F5E9")
    if status == "No cumple":
        return colors.HexColor("#FDECEC")
    return colors.HexColor("#FFF8E1")


def build_appendix():
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "TitleSeal",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        textColor=colors.HexColor("#1F4D78"),
        alignment=TA_LEFT,
        spaceAfter=12,
    )
    h1 = ParagraphStyle(
        "H1Seal",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        textColor=colors.HexColor("#2E74B5"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "BodySeal",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12.2,
        spaceAfter=5,
    )
    small = ParagraphStyle(
        "SmallSeal",
        parent=body,
        fontSize=8.8,
        leading=11,
        textColor=colors.HexColor("#333333"),
    )
    code = ParagraphStyle(
        "CodeSeal",
        fontName="Courier",
        fontSize=6.6,
        leading=8,
        textColor=colors.HexColor("#1F2937"),
        backColor=colors.HexColor("#F8FAFC"),
        borderColor=colors.HexColor("#D9E2EC"),
        borderWidth=0.5,
        borderPadding=5,
        spaceBefore=3,
        spaceAfter=7,
    )

    doc = SimpleDocTemplate(
        str(APPENDIX),
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title="Anexo de Codigo - SEAL",
    )
    story = []

    story.append(Paragraph("Anexo de Codigo: Evidencia de Codificacion Segura en SEAL", title))
    story.append(Paragraph(
        "Este anexo complementa el documento original. Para cada punto del checklist se agrega codigo real del proyecto y una nota breve sobre como demostrarlo en la app, terminal o repositorio.",
        body,
    ))
    rows = [[
        Paragraph("<b>#</b>", small),
        Paragraph("<b>Control</b>", small),
        Paragraph("<b>Estado</b>", small),
        Paragraph("<b>Demostracion recomendada</b>", small),
    ]]
    for c in CONTROLS:
        rows.append([
            Paragraph(c["id"], small),
            Paragraph(c["title"], small),
            Paragraph(c["status"], small),
            Paragraph(c["demo"], small),
        ])
    table = Table(rows, colWidths=[0.55*inch, 2.1*inch, 1.15*inch, 3.65*inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EEF5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1F4D78")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("LEADING", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9E2EC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    for idx, c in enumerate(CONTROLS, start=1):
        table.setStyle(TableStyle([("BACKGROUND", (2, idx), (2, idx), status_color(c["status"]))]))
    story.append(table)
    story.append(PageBreak())

    for c in CONTROLS:
        block = [
            Paragraph(f"{c['id']} - {c['title']}", h1),
            Table(
                [[Paragraph(f"<b>Estado:</b> {c['status']}", small), Paragraph(f"<b>Como demostrarlo:</b> {c['demo']}", small)]],
                colWidths=[1.35*inch, 6.1*inch],
                style=TableStyle([
                    ("BACKGROUND", (0, 0), (0, 0), status_color(c["status"])),
                    ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#F4F6F9")),
                    ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9E2EC")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D9E2EC")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ])
            ),
            Spacer(1, 5),
        ]
        story.extend(block)
        for path, start, end in c["snippets"]:
            story.append(Paragraph(f"<b>Archivo:</b> {path} <font color='#666666'>(lineas {start}-{end})</font>", small))
            story.append(Preformatted(wrap_code(read_lines(path, start, end)), code))
        story.append(Spacer(1, 8))

    def footer(canvas, doc_obj):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#666666"))
        canvas.drawString(0.55 * inch, 0.32 * inch, "SEAL - Anexo de codigo para checklist de codificacion segura")
        canvas.drawRightString(7.95 * inch, 0.32 * inch, f"Anexo pagina {doc_obj.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def merge_pdfs():
    writer = PdfWriter()
    for pdf_path in [ORIGINAL, APPENDIX]:
        reader = PdfReader(str(pdf_path))
        for page in reader.pages:
            writer.add_page(page)
    with FINAL.open("wb") as f:
        writer.write(f)
    with FINAL_NEXT_TO_ORIGINAL.open("wb") as f:
        writer.write(f)


if __name__ == "__main__":
    build_appendix()
    merge_pdfs()
    print(FINAL)
    print(FINAL_NEXT_TO_ORIGINAL)

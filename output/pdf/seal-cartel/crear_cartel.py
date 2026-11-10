from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parent
FONT = Path('/System/Library/Fonts/Supplemental')
for name, filename in [('Serif','Georgia.ttf'),('SerifBold','Georgia Bold.ttf'),('SerifItalic','Georgia Italic.ttf'),('Sans','Arial.ttf'),('SansBold','Arial Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT / filename)))

# Logical units are millimetres. Text remains vector and fonts are embedded.
S = 72 / 25.4
c = canvas.Canvas(str(ROOT / 'SEAL_cartel_60x90cm.pdf'), pagesize=(600*S,900*S), pageCompression=1)
c.setTitle('SEAL - Gestión digital de contratos - Cartel 60 x 90 cm')
c.setAuthor('SEAL')
c.setSubject('Proyecto SEAL: problema, proceso, herramientas y beneficios previstos. Capturas reales con datos ficticios.')
c.scale(S,S)
CREAM='#FAF7EE'; GREEN='#10372C'; GOLD='#A17D35'; MUTED='#56615A'; LINE='#DDD9C9'; PANEL='#F0EDE2'

def rect(x,y,w,h,color,r=0):
    c.setFillColor(HexColor(color)); c.setStrokeColor(HexColor(color))
    c.roundRect(x,900-y-h,w,h,r,stroke=0,fill=1) if r else c.rect(x,900-y-h,w,h,stroke=0,fill=1)

def text(value,x,y,size=12,font='Sans',color=GREEN,align='left',max_width=None):
    if max_width is not None and pdfmetrics.stringWidth(value,font,size)>max_width:
        raise ValueError(f'Text exceeds its column: {value}')
    c.setFillColor(HexColor(color)); c.setFont(font,size)
    {'left':c.drawString,'center':c.drawCentredString,'right':c.drawRightString}[align](x,900-y,value)

def lines(values,x,y,size=9.5,leading=12,color=MUTED,font='Sans',max_width=None):
    for i,value in enumerate(values): text(value,x,y+i*leading,size,font,color,max_width=max_width)

def line(x1,y1,x2,y2,color=LINE,width=.6):
    c.setStrokeColor(HexColor(color)); c.setLineWidth(width); c.line(x1,900-y1,x2,900-y2)

def image(name,x,y,w,h):
    c.drawImage(ImageReader(str(ROOT/'assets'/name)),x,900-y-h,width=w,height=h,mask='auto')

def icon(kind,x,y,size=20,color=GREEN):
    c.saveState(); c.translate(x,900-y); c.scale(size/28,size/28)
    c.setStrokeColor(HexColor(color)); c.setLineWidth(1.7); c.setLineCap(1); c.setLineJoin(1)
    if kind=='document':
        c.roundRect(4,-26,19,25,2,stroke=1,fill=0)
        for a in [8,14,20]: c.line(8,-a,19,-a)
    elif kind=='ai':
        p=c.beginPath();p.moveTo(14,0)
        for xx,yy in [(17,-9),(26,-14),(17,-18),(14,-28),(10,-18),(1,-14),(10,-9)]: p.lineTo(xx,yy)
        p.close();c.drawPath(p)
    elif kind=='phone':
        c.roundRect(5,-27,17,26,3,stroke=1,fill=0);c.line(10,-5,17,-5);c.circle(13.5,-23,1,stroke=1,fill=0)
    elif kind=='clock':
        c.circle(14,-14,12,stroke=1,fill=0);c.line(14,-6,14,-14);c.line(14,-14,20,-18)
    elif kind=='chat':
        p=c.beginPath();p.moveTo(3,-3);p.lineTo(25,-3);p.lineTo(25,-21);p.lineTo(11,-21);p.lineTo(4,-27);p.lineTo(4,-21);p.lineTo(3,-21);p.close();c.drawPath(p)
        c.line(8,-9,20,-9);c.line(8,-15,18,-15)
    elif kind=='folder':
        p=c.beginPath();p.moveTo(2,-6);p.lineTo(11,-6);p.lineTo(15,-10);p.lineTo(26,-10);p.lineTo(26,-25);p.lineTo(2,-25);p.close();c.drawPath(p)
    else:
        for a in [4,14,24]: c.circle(4,-a,2,stroke=1,fill=0);c.line(11,-a,25,-a)
    c.restoreState()

rect(0,0,600,900,CREAM)
# Curved corner ribbons echo the user's first poster without competing with the content.
c.setFillColor(HexColor(GREEN));p=c.beginPath();p.moveTo(0,900);p.lineTo(108,900);p.curveTo(51,878,24,850,0,815);p.close();c.drawPath(p,fill=1,stroke=0)
c.setFillColor(HexColor(GOLD));p=c.beginPath();p.moveTo(108,900);p.lineTo(118,900);p.curveTo(66,869,34,842,0,801);p.lineTo(0,812);p.curveTo(31,851,59,878,108,900);p.close();c.drawPath(p,fill=1,stroke=0)

# Actual alpha transparency: no white tile, clip, outline or artificial badge.
image('seal-escudo-transparente.png',166,11,78,78)
text('SEAL',343,74,58,'SerifBold',align='center')
text('C O N T R A T O S  C O N  P R O P Ó S I T O',300,97,8.2,align='center')
line(218,108,382,108,GOLD,.6)
text('Gestión digital',300,149,36,'SerifBold',align='center')
text('de contratos.',300,190,36,'SerifBold',GOLD,'center')
text('Una plataforma web para preparar, revisar y firmar contratos,',300,212,10.8,align='center')
text('con inteligencia artificial y seguimiento hasta su aprobación.',300,227,10.8,align='center')

# Real product screenshots, unmodified and displayed at their original aspect ratio.
rect(44,243,371,253,'#E4E0D4',8)
rect(40,239,371,253,'#242A27',8)
image('seal-escritorio.png',47,246,357,242.96)
rect(28,492,395,6,'#858B85',2);rect(176,492,99,2,'#565E56',1)
rect(433,256,115,245,'#DDD7C8',12)
rect(429,252,115,245,'#222723',12)
c.saveState();p=c.beginPath();p.roundRect(435,900-259-222.9,103,222.9,8);c.clipPath(p,stroke=0,fill=0)
image('seal-movil-publico.png',435,259,103,222.9)
c.restoreState();rect(473,489,27,1.5,'#6A706A',1)
text('ADMINISTRACIÓN + CLIENTES',31,514,7.4,'SansBold',GOLD)
text('Pantallas reales · Datos ficticios de demostración',568,514,6.8,color=MUTED,align='right')

# Problem: three concrete pain points, immediately followed by the solution.
rect(20,527,560,76,PANEL,9)
text('¿Qué problema resolvemos?',32,549,21,'SerifBold')
problems=[('clock','Tareas repetitivas',['Capturar datos y preparar','documentos una y otra vez.']),('folder','Información dispersa',['Versiones, mensajes y','archivos por separado.']),('history','Poco seguimiento',['Dificultad para saber qué','falta revisar o firmar.'])]
for i,(kind,title,body) in enumerate(problems):
    x=33+i*186
    if i: line(x-9,561,x-9,591)
    icon(kind,x,563,21)
    text(title,x+28,568,9.4,'SansBold',max_width=143)
    lines(body,x+28,582,8.5,10.5,max_width=144)

text('¿Cómo funciona SEAL?',32,633,21,'SerifBold')
steps=[('document','1. Prepara',['Edita una plantilla y','completa los datos.']),('chat','2. Revisa',['El cliente lee, pregunta','y consulta con IA.']),('phone','3. Firma',['Desde computadora','o desde el celular.']),('history','4. Aprueba',['Administración revisa','y libera el PDF final.'])]
for i,(kind,title,body) in enumerate(steps):
    x=33+i*141
    if i: line(x-11,647,x-11,699)
    icon(kind,x,646,19)
    text(title,x+26,661,11,'SansBold',max_width=111)
    lines(body,x,683,9,11.5,max_width=133)

text('Un espacio para todo el contrato.',32,730,21,'SerifBold')
features=[('Plantillas y versiones',['Importa DOCX, edita campos,','guarda borradores y compara','versiones del documento.']),('IA y comunicación',['Crea propuestas con IA y revísalas.','Consulta cláusulas y conversa','por chat con administración.']),('Gestión y trazabilidad',['Administra clientes y accesos.','Consulta estados, actividad y','firmas; descarga el PDF aprobado.'])]
for i,(title,body) in enumerate(features):
    x=25+i*187
    rect(x,744,177,62,'#F1EEE4',6)
    text(title,x+9,762,11,'SansBold',max_width=159)
    lines(body,x+9,778,8.7,10.5,max_width=159)

text('Diseñado para:',32,832,11,'SansBold')
for i,(kind,label) in enumerate([('document','Menos impresiones'),('clock','Menos recaptura'),('chat','Más claridad'),('history','Mejor seguimiento')]):
    x=133+i*113
    icon(kind,x,817,15)
    text(label,x+19,830,7.9,'SansBold',max_width=96)

# Footer wave and clear invitation; no unverified statistics or invented public QR.
c.setFillColor(HexColor(GOLD));p=c.beginPath();p.moveTo(0,54);p.curveTo(165,20,388,73,600,48);p.lineTo(600,0);p.lineTo(0,0);p.close();c.drawPath(p,fill=1,stroke=0)
c.setFillColor(HexColor(GREEN));p=c.beginPath();p.moveTo(0,51);p.curveTo(165,17,388,70,600,45);p.lineTo(600,0);p.lineTo(0,0);p.close();c.drawPath(p,fill=1,stroke=0)
text('Contratos con propósito. Acuerdos con claridad.',300,873,18,'SerifItalic',CREAM,'center')
text('Conoce SEAL y prueba la demo en nuestro stand.',300,891,9.2,'Sans',CREAM,'center')
c.showPage();c.save()
print(ROOT / 'SEAL_cartel_60x90cm.pdf')

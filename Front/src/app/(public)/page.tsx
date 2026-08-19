import Image from "next/image";
import Link from "next/link";
import styles from "./landing.module.css";

const modules = [
  {
    number: "01",
    title: "Plantillas dinámicas",
    text: "Administra plantillas DOCX, versiones y placeholders para reutilizar información sin capturarla varias veces.",
  },
  {
    number: "02",
    title: "Redacción asistida con IA",
    text: "Genera o modifica borradores con OpenRouter. Cada propuesta requiere revisión humana antes de publicarse.",
  },
  {
    number: "03",
    title: "Expedientes y firma",
    text: "Asigna contratos, acompaña la revisión del cliente y conserva los eventos asociados al proceso de firma.",
  },
  {
    number: "04",
    title: "Seguimiento centralizado",
    text: "Consulta estados, conversaciones, bitácora y documentos PDF desde un mismo espacio de trabajo.",
  },
];

const steps = [
  ["Prepara", "Carga una plantilla o crea un borrador con asistencia de IA."],
  ["Revisa", "Valida el contenido, los placeholders y las condiciones del documento."],
  ["Asigna", "Relaciona el contrato con una persona y abre su expediente de seguimiento."],
  ["Formaliza", "La persona revisa, firma y el equipo administrativo confirma el resultado."],
];

export default function LandingPage() {
  return (
    <main className={styles.landing}>
      <header className={styles.header}>
        <div className={styles.navbar}>
          <a className={styles.brand} href="#inicio" aria-label="Ir al inicio de SEAL">
            <span className={styles.brandMark}>S</span>
            <span>
              <strong>SEAL</strong>
              <small>Contratos inteligentes</small>
            </span>
          </a>

          <nav className={styles.desktopNav} aria-label="Navegación principal">
            <a href="#solucion">Solución</a>
            <a href="#modulos">Módulos</a>
            <a href="#flujo">Cómo funciona</a>
            <a href="#ia">Asistencia IA</a>
          </nav>

          <Link className={styles.navLogin} href="/login">
            Iniciar sesión
          </Link>

          <details className={styles.mobileMenu}>
            <summary aria-label="Abrir menú de navegación">Menú</summary>
            <nav aria-label="Navegación móvil">
              <a href="#solucion">Solución</a>
              <a href="#modulos">Módulos</a>
              <a href="#flujo">Cómo funciona</a>
              <a href="#ia">Asistencia IA</a>
              <Link href="/login">Iniciar sesión</Link>
            </nav>
          </details>
        </div>
      </header>

      <section className={styles.hero} id="inicio">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span /> Gestión contractual en un solo lugar
          </p>
          <h1>
            Contratos claros.
            <em> Procesos mejor conectados.</em>
          </h1>
          <p className={styles.lead}>
            SEAL reúne plantillas, expedientes, revisión, firma y asistencia con IA para
            que cada contrato avance con orden, contexto y trazabilidad.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/login">
              Entrar a SEAL <span aria-hidden="true">→</span>
            </Link>
            <a className={styles.secondaryButton} href="#flujo">
              Conocer el flujo
            </a>
          </div>
          <div className={styles.heroNotes} aria-label="Características principales">
            <span>Revisión humana</span>
            <span>Acceso por roles</span>
            <span>HTTPS</span>
          </div>
        </div>

        <div className={styles.productPreview} aria-label="Ejemplo visual del panel SEAL">
          <div className={styles.browserBar}>
            <span className={styles.browserDots} aria-hidden="true"><i /><i /><i /></span>
            <span className={styles.address}>app.seal.mx</span>
          </div>
          <div className={styles.previewBody}>
            <aside className={styles.previewSidebar}>
              <b><span>S</span> SEAL</b>
              <div className={styles.activePreviewItem}>Expedientes</div>
              <div>Plantillas</div>
              <div>Clientes</div>
              <div>Bitácora</div>
            </aside>
            <div className={styles.previewMain}>
              <div className={styles.previewHeading}>
                <div>
                  <small>EXPEDIENTE ACTIVO</small>
                  <strong>Ana Torres Demo</strong>
                </div>
                <span>EN REVISIÓN</span>
              </div>
              <div className={styles.contractCard}>
                <div className={styles.documentIcon}>§</div>
                <div>
                  <strong>Contrato laboral indefinido</strong>
                  <p>Desarrollador Frontend · Tecnología</p>
                </div>
                <button type="button" tabIndex={-1}>Ver detalle</button>
              </div>
              <div className={styles.previewGrid}>
                <article>
                  <small>ESTADO</small>
                  <strong>Documento revisado</strong>
                  <p>Listo para continuar con el proceso.</p>
                </article>
                <article>
                  <small>ACTIVIDAD</small>
                  <strong>4 eventos registrados</strong>
                  <p>Historial disponible en la bitácora.</p>
                </article>
              </div>
              <div className={styles.previewPeople}>
                <span>También en preparación</span>
                <b>Desarrollador Backend</b>
                <b>QA Tester</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.solution} id="solucion">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Una operación más ordenada</p>
          <h2>Del documento aislado a un expediente con contexto.</h2>
          <p>
            SEAL conecta las etapas que normalmente quedan repartidas entre archivos,
            correos y seguimientos manuales.
          </p>
        </div>
        <div className={styles.comparison}>
          <article className={styles.beforeCard}>
            <span className={styles.cardLabel}>Proceso disperso</span>
            <h3>Información separada y difícil de seguir</h3>
            <ul>
              <li>Versiones de documentos sin una referencia común.</li>
              <li>Captura repetida de datos entre contratos.</li>
              <li>Seguimiento manual de revisión y firma.</li>
              <li>Dudas del expediente fuera de contexto.</li>
            </ul>
          </article>
          <article className={styles.afterCard}>
            <span className={styles.cardLabel}>Con SEAL</span>
            <h3>Un flujo compartido y verificable</h3>
            <ul>
              <li>Plantillas versionadas con campos reutilizables.</li>
              <li>Expedientes vinculados con personas y estados.</li>
              <li>Registro de acciones relevantes del proceso.</li>
              <li>IA contextual con respaldo local y revisión humana.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className={styles.modulesSection} id="modulos">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Módulos conectados</p>
          <h2>Herramientas para preparar, asignar y acompañar contratos.</h2>
        </div>
        <div className={styles.moduleGrid}>
          {modules.map((module) => (
            <article key={module.number} className={styles.moduleCard}>
              <span>{module.number}</span>
              <h3>{module.title}</h3>
              <p>{module.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.aiSection} id="ia">
        <div className={styles.aiVisual} aria-hidden="true">
          <div className={styles.aiOrb}>
            <Image src="/landing/ai-layers.png" alt="" width={343} height={361} />
          </div>
          <div className={styles.aiMessage}>
            <span>Ejemplo de asistencia</span>
            <p>“Resume los puntos importantes de este contrato.”</p>
          </div>
        </div>
        <div className={styles.aiCopy}>
          <p className={styles.eyebrow}>Asistencia con OpenRouter</p>
          <h2>IA que trabaja con el documento, no fuera de él.</h2>
          <p>
            El asistente analiza el contenido del contrato específico para resumirlo o
            explicar cláusulas. Si el proveedor no está disponible, SEAL conserva una
            respuesta local de apoyo.
          </p>
          <ul>
            <li>Las respuestas se limitan al contenido disponible en el expediente.</li>
            <li>La generación de plantillas separa la solicitud del HTML de referencia.</li>
            <li>El resultado generado no sustituye revisión profesional o legal.</li>
          </ul>
          <span className={styles.demoNotice}>Demostración visual; el acceso real requiere iniciar sesión.</span>
        </div>
      </section>

      <section className={styles.flowSection} id="flujo">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Cómo funciona</p>
          <h2>Cuatro pasos, un mismo expediente.</h2>
        </div>
        <ol className={styles.steps}>
          {steps.map(([title, text], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.eyebrow}>Acceso privado</p>
          <h2>Continúa en tu espacio de trabajo SEAL.</h2>
          <p>Las cuentas son creadas o invitadas por una persona administradora.</p>
        </div>
        <Link className={styles.primaryButton} href="/login">
          Iniciar sesión <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>S</span>
          <span><strong>SEAL</strong><small>Contratos inteligentes</small></span>
        </div>
        <p>Proyecto académico de Ingeniería en Desarrollo y Gestión de Software · UTSJR</p>
        <div>
          <Link href="/politica-privacidad">Privacidad</Link>
          <Link href="/proteccion-datos">Protección de datos</Link>
        </div>
      </footer>
    </main>
  );
}

import Link from "next/link";
import type { LegalSection } from "@/lib/privacyContent";

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  summary: string;
  version: string;
  sections: LegalSection[];
};

export default function LegalDocument({
  eyebrow,
  title,
  summary,
  version,
  sections,
}: LegalDocumentProps) {
  return (
    <main className="legal-page">
      <header className="legal-topbar">
        <Link className="legal-brand" href="/login" aria-label="Ir al inicio de sesión de Seal">
          <span className="legal-brand__mark">S</span>
          <span>
            <strong>Seal</strong>
            <small>Contratos y firma digital</small>
          </span>
        </Link>
        <Link className="legal-topbar__action" href="/login">Iniciar sesión</Link>
      </header>

      <article className="legal-document">
        <div className="legal-document__hero">
          <p className="legal-document__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-document__summary">{summary}</p>
          <div className="legal-document__meta">
            <span>Versión {version}</span>
            <span>Actualizado el 10 de julio de 2026</span>
          </div>
        </div>

        <aside className="legal-document__notice">
          Documento del prototipo académico Seal. Los datos del responsable deberán sustituirse por los de la entidad operadora antes de un despliegue real.
        </aside>

        <div className="legal-document__body">
          {sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className="legal-document__footer">
          <Link href="/proteccion-datos">Protección de datos personales</Link>
          <Link href="/politica-privacidad">Política de privacidad</Link>
          <Link href="/login">Volver al acceso</Link>
        </footer>
      </article>
    </main>
  );
}

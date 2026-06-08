"use client";

import Link from "next/link";

const POLICIES = [
  {
    title: "Acceso por rol",
    detail: "Administradores gestionan clientes, plantillas y expedientes. Clientes solo ven sus contratos asignados.",
    status: "Implementado",
  },
  {
    title: "Contraseñas",
    detail: "Las contraseñas se almacenan con hash seguro y los clientes configuran acceso mediante enlace temporal.",
    status: "Implementado",
  },
  {
    title: "Tokens temporales",
    detail: "Los enlaces de firma móvil usan tokens de un solo uso con expiración.",
    status: "Implementado",
  },
  {
    title: "Firma digital",
    detail: "La firma se guarda como evidencia, con hash, fecha, agente/IP y archivo asociado.",
    status: "Implementado",
  },
  {
    title: "PDF final",
    detail: "El PDF se genera solo después de firma del cliente y aprobación administrativa.",
    status: "Implementado",
  },
  {
    title: "IA asistiva",
    detail: "La IA ayuda a explicar contratos, pero no sustituye revisión humana ni legal.",
    status: "Implementado",
  },
  {
    title: "HTTPS",
    detail: "Debe activarse en despliegue productivo. En local se trabaja por HTTP para desarrollo.",
    status: "Pendiente despliegue",
  },
  {
    title: "Correo SMTP",
    detail: "En local se registra como dev-skip. En producción se debe configurar proveedor real.",
    status: "Pendiente producción",
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Acceso controlado",
    detail: "Cada usuario entra con permisos definidos por rol y solo ve la información que le corresponde.",
  },
  {
    step: "02",
    title: "Expediente trazable",
    detail: "El contrato avanza por asignación, revisión, firma y aprobación con eventos registrados.",
  },
  {
    step: "03",
    title: "Evidencia final",
    detail: "La firma, el hash, el PDF aprobado y la bitácora sostienen el cierre del expediente.",
  },
];

export default function PoliticasPage() {
  const implemented = POLICIES.filter((policy) => policy.status === "Implementado").length;
  const pending = POLICIES.length - implemented;

  return (
    <div className="policies-screen">
      <header className="topbar policies-topbar">
        <div className="topbar__left">
          <div className="eyebrow">Gobierno y cumplimiento</div>
          <h1 className="title">Políticas de seguridad</h1>
        </div>

        <div className="topbar__right">
          <Link className="btn btn--ghost" href="/ajustes">
            Ajustes
          </Link>
          <Link className="btn btn--primary" href="/contratos">
            Expedientes
          </Link>
        </div>
      </header>

      <section className="policies-metrics">
        <div className="policy-metric policy-metric--gold">
          <span>Controles</span>
          <strong>{POLICIES.length}</strong>
        </div>
        <div className="policy-metric policy-metric--ok">
          <span>Implementados</span>
          <strong>{implemented}</strong>
        </div>
        <div className="policy-metric policy-metric--pending">
          <span>Pendientes</span>
          <strong>{pending}</strong>
        </div>
        <div className="policy-metric policy-metric--trust">
          <span>Modelo</span>
          <strong>RBAC</strong>
        </div>
      </section>

      <section className="policies-grid">
        <article className="card policies-main">
          <div className="card__title-row policies-main__head">
            <div>
              <h2 className="card__title">Política actual</h2>
              <div className="muted small">Controles activos para operación legal y firma digital</div>
            </div>
            <span className="chip">{POLICIES.length}</span>
          </div>

          <div className="policies-list">
            {POLICIES.map((policy) => (
              <div
                className={`policy-row ${policy.status === "Implementado" ? "policy-row--ok" : "policy-row--pending"}`}
                key={policy.title}
              >
                <div className="policy-row__marker">
                  <span className={policy.status === "Implementado" ? "log__dot log__dot--ok" : "log__dot log__dot--gold"} />
                </div>
                <div className="policy-row__body">
                  <div className="policy-row__title">{policy.title}</div>
                  <div className="policy-row__detail">{policy.detail}</div>
                </div>
                <span className={policy.status === "Implementado" ? "badge badge--done" : "badge badge--sign"}>
                  {policy.status}
                </span>
              </div>
            ))}
          </div>
        </article>

        <aside className="card policies-workflow">
          <div className="card__title-row">
            <h2 className="card__title">Cómo trabaja</h2>
            <span className="chip">Seal</span>
          </div>

          <div className="policy-flow">
            {WORKFLOW.map((item) => (
              <div className="policy-flow__item" key={item.step}>
                <span className="policy-flow__step">{item.step}</span>
                <div>
                  <div className="policy-flow__title">{item.title}</div>
                  <div className="policy-flow__detail">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <aside className="card policies-checklist">
          <div className="card__title-row">
            <h2 className="card__title">Checklist producción</h2>
            <span className="chip">{pending}</span>
          </div>

          <div className="note">
            <div className="note__title">Antes de publicar</div>
            <div className="note__text">
              Configurar HTTPS, SMTP real, bucket Firebase Storage, dominio del frontend para QR y variables secretas fuera del repositorio.
            </div>
          </div>

          <div className="note">
            <div className="note__title">Auditoría</div>
            <div className="note__text">
              La bitácora de expedientes conserva asignación, visualización, firma, aprobación y cambios de chat.
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

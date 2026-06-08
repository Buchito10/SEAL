"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  listAdminAssignments,
  listContracts,
  listUsers,
  type AdminContract,
  type AdminUser,
  type AssignmentSummary,
} from "@/lib/api";
import { getUser } from "@/lib/auth";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Ocurrió un error inesperado";
}

export default function AjustesPage() {
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = getUser();

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [assignmentRows, userRows, contractRows] = await Promise.all([
        listAdminAssignments(),
        listUsers(),
        listContracts(),
      ]);
      setAssignments(assignmentRows);
      setUsers(userRows);
      setContracts(contractRows);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const checks = useMemo(
    () => [
      {
        title: "Autenticación",
        value: user?.email || "Sesión admin",
        hint: "Acceso protegido por JWT y rol ADMIN.",
        ok: true,
      },
      {
        title: "Clientes",
        value: `${users.filter((item) => item.role === "CLIENT" && item.status === "ACTIVE").length} activos`,
        hint: `${users.filter((item) => item.role === "CLIENT" && (!item.profile_completed || item.must_change_password)).length} con perfil o acceso pendiente.`,
        ok: true,
      },
      {
        title: "Plantillas",
        value: `${contracts.filter((item) => item.status === "ACTIVE").length} activas`,
        hint: "Las plantillas activas pueden asignarse como expedientes.",
        ok: contracts.some((item) => item.status === "ACTIVE"),
      },
      {
        title: "Storage local",
        value: "Habilitado en desarrollo",
        hint: "Si no hay bucket Firebase, firmas/PDFs se guardan en Back/.local-storage.",
        ok: true,
      },
      {
        title: "IA",
        value: "Fallback operativo",
        hint: "El asistente local responde aunque Gemini no esté configurado.",
        ok: true,
      },
      {
        title: "Expedientes",
        value: `${assignments.length} registrados`,
        hint: `${assignments.filter((item) => item.status === "SIGNED").length} listos para aprobar.`,
        ok: true,
      },
    ],
    [assignments, contracts, user?.email, users]
  );

  return (
    <>
      <header className="topbar">
        <div className="topbar__left">
          <h1 className="title">Ajustes</h1>
          <p className="subtitle">Estado operativo del sistema y accesos rápidos de configuración.</p>
        </div>

        <div className="topbar__right">
          <button className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
            Actualizar
          </button>
          <Link className="btn btn--soft" href="/politicas">
            Ver políticas
          </Link>
        </div>
      </header>

      {error && (
        <section className="card" style={{ padding: 12 }}>
          <div className="muted small text-danger">{error}</div>
        </section>
      )}

      <section className="grid">
        <article className="card" style={{ gridColumn: "1 / span 8" }}>
          <div className="card__title-row">
            <h2 className="card__title">Configuración operativa</h2>
            <span className="chip">{checks.filter((item) => item.ok).length}/{checks.length}</span>
          </div>

          <div className="tiles">
            {checks.map((item) => (
              <div className="tile" key={item.title}>
                <div className="tile__top">
                  <div className="tile__icon">{item.ok ? "OK" : "!"}</div>
                  <span className={item.ok ? "badge badge--done" : "badge badge--draft text-danger"}>
                    {item.ok ? "Correcto" : "Revisar"}
                  </span>
                </div>
                <div className="strong">{item.title}</div>
                <div className="gold" style={{ marginTop: 8 }}>
                  {item.value}
                </div>
                <div className="muted small" style={{ marginTop: 8 }}>
                  {item.hint}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card" style={{ gridColumn: "9 / span 4" }}>
          <div className="card__title-row">
            <h2 className="card__title">Accesos rápidos</h2>
          </div>

          <div className="form-grid">
            <Link className="btn btn--ghost" href="/clientes">
              Gestionar clientes
            </Link>
            <Link className="btn btn--ghost" href="/plantillas">
              Gestionar plantillas
            </Link>
            <Link className="btn btn--ghost" href="/contratos">
              Revisar expedientes
            </Link>
            <Link className="btn btn--ghost" href="/notificaciones">
              Ver notificaciones
            </Link>
          </div>

          <div className="note">
            <div className="note__title">Variables locales</div>
            <div className="note__text">
              API: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

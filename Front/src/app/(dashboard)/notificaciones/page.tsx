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
import { buildNotifications, type NotificationSeverity } from "@/lib/adminView";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Ocurrió un error inesperado";
}

function dotClass(kind: NotificationSeverity) {
  if (kind === "danger") return "log__dot log__dot--danger";
  if (kind === "ok") return "log__dot log__dot--ok";
  return "log__dot log__dot--gold";
}

function severityLabel(kind: NotificationSeverity) {
  if (kind === "danger") return "Crítica";
  if (kind === "warn") return "Atención";
  return "Informativa";
}

export default function NotificacionesPage() {
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [filter, setFilter] = useState<"all" | NotificationSeverity>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const notifications = useMemo(
    () => buildNotifications(assignments, users, contracts),
    [assignments, contracts, users]
  );

  const filtered = notifications.filter((item) => filter === "all" || item.severity === filter);
  const summary = useMemo(
    () => ({
      total: notifications.length,
      danger: notifications.filter((item) => item.severity === "danger").length,
      warn: notifications.filter((item) => item.severity === "warn").length,
      ok: notifications.filter((item) => item.severity === "ok").length,
    }),
    [notifications]
  );

  return (
    <div className="notifications-screen">
      <header className="topbar notifications-topbar">
        <div className="topbar__left">
          <div className="eyebrow">Centro operativo</div>
          <h1 className="title">Notificaciones</h1>
        </div>

        <div className="topbar__right">
          <button className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <section className="card notifications-alert" style={{ padding: 12 }}>
          <div className="muted small text-danger">{error}</div>
        </section>
      )}

      <section className="notifications-metrics">
        <div className="notification-metric notification-metric--gold">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="notification-metric notification-metric--danger">
          <span>Críticas</span>
          <strong>{summary.danger}</strong>
        </div>
        <div className="notification-metric notification-metric--warn">
          <span>Atención</span>
          <strong>{summary.warn}</strong>
        </div>
        <div className="notification-metric notification-metric--ok">
          <span>Informativas</span>
          <strong>{summary.ok}</strong>
        </div>
      </section>

      <section className="card card--toolbar notifications-toolbar">
        <div className="notification-filter-copy">
          <span className="muted small">Alertas visibles</span>
          <strong>{filtered.length}</strong>
        </div>

        <select className="control notifications-filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">Todas</option>
          <option value="danger">Críticas</option>
          <option value="warn">Atención</option>
          <option value="ok">Informativas</option>
        </select>
      </section>

      <section className="notifications-grid">
        <article className="card notifications-center">
          <div className="card__title-row notifications-center__head">
            <div>
              <h2 className="card__title">Centro de alertas</h2>
              <div className="muted small">{loading ? "Actualizando..." : "Estado operativo del sistema"}</div>
            </div>
            <span className="chip">{filtered.length}</span>
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="notifications-empty">Cargando notificaciones...</div>
            ) : filtered.length === 0 ? (
              <div className="notifications-empty">No hay alertas para este filtro.</div>
            ) : filtered.map((item) => (
              <Link
                className={`notification-item notification-item--${item.severity}`}
                key={item.id}
                href={item.href}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="notification-item__marker">
                  <span className={dotClass(item.severity)} />
                </div>

                <div className="notification-item__body">
                  <div className="notification-item__title">{item.title}</div>
                  <div className="notification-item__detail">{item.detail}</div>
                </div>

                <div className="notification-item__meta">
                  <span className="pill">{severityLabel(item.severity)}</span>
                  <span className="muted small">{item.when}</span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <aside className="card notifications-panel">
          <div className="card__title-row">
            <h2 className="card__title">Prioridad</h2>
            <span className="chip">{filter === "all" ? "Todo" : severityLabel(filter)}</span>
          </div>

          <div className="notification-priority">
            <button className={`notification-priority__row ${filter === "danger" ? "is-active" : ""}`} onClick={() => setFilter("danger")}>
              <span>Críticas</span>
              <strong>{summary.danger}</strong>
            </button>
            <button className={`notification-priority__row ${filter === "warn" ? "is-active" : ""}`} onClick={() => setFilter("warn")}>
              <span>Atención</span>
              <strong>{summary.warn}</strong>
            </button>
            <button className={`notification-priority__row ${filter === "ok" ? "is-active" : ""}`} onClick={() => setFilter("ok")}>
              <span>Informativas</span>
              <strong>{summary.ok}</strong>
            </button>
            <button className={`notification-priority__row ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>
              <span>Todas</span>
              <strong>{summary.total}</strong>
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listAdminAssignments, type AssignmentSummary } from "@/lib/api";
import { buildActivity, eventHint, eventLabel, formatDate } from "@/lib/adminView";

type EventFilter = "all" | "ASSIGNED" | "VIEWED" | "SIGNED" | "APPROVED" | "CHAT";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Ocurrió un error inesperado";
}

function dotClass(type: string) {
  if (type === "REJECTED") return "log__dot log__dot--danger";
  if (type === "APPROVED") return "log__dot log__dot--ok";
  if (type === "SIGNED" || type === "ASSIGNED" || type === "CHAT_REOPENED") return "log__dot log__dot--gold";
  return "log__dot";
}

function eventTone(type: string) {
  if (type === "APPROVED") return "ok";
  if (type === "REJECTED") return "danger";
  if (type === "SIGNED" || type === "ASSIGNED") return "gold";
  if (type === "CHAT_CLOSED" || type === "CHAT_REOPENED") return "chat";
  return "default";
}

export default function BitacoraPage() {
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [filter, setFilter] = useState<EventFilter>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setAssignments(await listAdminAssignments());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const events = useMemo(() => {
    const query = q.trim().toLowerCase();

    return assignments
      .flatMap((assignment) =>
        (assignment.events || []).map((event) => ({
          id: `${assignment.id}-${event.id}`,
          assignment,
          event,
          rawDate: new Date(event.at).getTime() || 0,
        }))
      )
      .filter((row) => {
        const matchesFilter =
          filter === "all"
            ? true
            : filter === "CHAT"
            ? row.event.type === "CHAT_CLOSED" || row.event.type === "CHAT_REOPENED"
            : row.event.type === filter;

        const text = [
          row.assignment.contract_title,
          row.assignment.client_name,
          row.assignment.client_email,
          eventLabel(row.event.type),
          eventHint(row.event.type),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesFilter && (!query || text.includes(query));
      })
      .sort((a, b) => b.rawDate - a.rawDate);
  }, [assignments, filter, q]);

  const summary = useMemo(
    () => ({
      total: events.length,
      signed: events.filter((row) => row.event.type === "SIGNED").length,
      approved: events.filter((row) => row.event.type === "APPROVED").length,
      chat: new Set(events.map((row) => row.assignment.id)).size,
    }),
    [events]
  );

  const recent = buildActivity(assignments).slice(0, 3);

  return (
    <div className="audit-screen">
      <header className="topbar audit-topbar">
        <div className="topbar__left">
          <div className="eyebrow">Evidencia auditable</div>
          <h1 className="title">Bitácora</h1>
        </div>

        <div className="topbar__right">
          <button className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <section className="card audit-alert" style={{ padding: 12 }}>
          <div className="muted small text-danger">{error}</div>
        </section>
      )}

      <section className="audit-metrics">
        <div className="audit-metric audit-metric--gold">
          <span>Eventos</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="audit-metric audit-metric--signed">
          <span>Firmas</span>
          <strong>{summary.signed}</strong>
        </div>
        <div className="audit-metric audit-metric--ok">
          <span>Aprobados</span>
          <strong>{summary.approved}</strong>
        </div>
        <div className="audit-metric audit-metric--chat">
          <span>Chat</span>
          <strong>{summary.chat}</strong>
        </div>
      </section>

      <section className="card card--toolbar audit-toolbar">
        <div className="search" style={{ flex: 1 }}>
          <span className="search__icon">⌕</span>
          <input
            className="search__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente, contrato o evento..."
          />
        </div>

        <select
          className="control audit-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as EventFilter)}
        >
          <option value="all">Todos</option>
          <option value="ASSIGNED">Enviados</option>
          <option value="VIEWED">Vistos</option>
          <option value="SIGNED">Firmados</option>
          <option value="APPROVED">Aprobados</option>
          <option value="CHAT">Chat</option>
        </select>
      </section>

      <section className="audit-grid">
        <article className="card audit-events">
          <div className="card__title-row audit-events__head">
            <div>
              <h2 className="card__title">Eventos</h2>
              <div className="muted small">{loading ? "Actualizando..." : "Registro cronológico"}</div>
            </div>
            <span className="chip">{events.length}</span>
          </div>

          <div className="audit-timeline">
            {loading ? (
              <div className="audit-empty">Cargando actividad...</div>
            ) : events.length === 0 ? (
              <div className="audit-empty">Sin eventos para este filtro.</div>
            ) : (
              events.map((row) => (
                <Link
                  href="/contratos"
                  className={`audit-event audit-event--${eventTone(row.event.type)}`}
                  key={row.id}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="audit-event__rail">
                    <span className={dotClass(row.event.type)} />
                  </div>
                  <div className="audit-event__body">
                    <div className="audit-event__title">{eventLabel(row.event.type)}</div>
                    <div className="audit-event__subject">
                      {row.assignment.contract_title || "Contrato"} · {row.assignment.client_name || "Cliente"}
                    </div>
                    <div className="audit-event__hint">{eventHint(row.event.type)}</div>
                  </div>
                  <div className="audit-event__time">
                    <span>{formatDate(row.event.at)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="card audit-recent">
          <div className="card__title-row">
            <h2 className="card__title">Resumen reciente</h2>
            <span className="chip">{recent.length}</span>
          </div>

          <div className="audit-recent__list">
            {recent.length === 0 ? (
              <div className="audit-empty">Aún no hay actividad.</div>
            ) : (
              recent.map((item) => (
                <div className="audit-recent__item" key={item.id}>
                  <span className={item.dot === "ok" ? "log__dot log__dot--ok" : "log__dot log__dot--gold"} />
                  <div className="audit-recent__body">
                    <div className="strong">{item.title}</div>
                    <div className="muted small">{item.detail}</div>
                  </div>
                  <div className="audit-recent__time">{item.when}</div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

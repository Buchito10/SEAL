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
import {
  buildActivity,
  buildNotifications,
  countByStatus,
  statusLabel,
} from "@/lib/adminView";

type IconName =
  | "alert"
  | "bell"
  | "check"
  | "clock"
  | "download"
  | "eye"
  | "file"
  | "folder"
  | "pen"
  | "plus"
  | "refresh"
  | "send"
  | "shield"
  | "template"
  | "trend"
  | "userPlus"
  | "users";

const ICONS: Record<IconName, string> = {
  alert: "M12 9v3m0 4h.01M10.3 4.6 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z",
  bell: "M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0",
  check: "M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  clock: "M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  download: "M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M8 12l4 4 4-4M12 4v12",
  eye: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z",
  file: "M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5ZM14 2v5h5M9 13h6M9 17h6",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  pen: "M16.9 3.7a2.4 2.4 0 0 1 3.4 3.4L7 20.4 3 21l.6-4L16.9 3.7ZM15 6l3 3",
  plus: "M12 5v14M5 12h14",
  refresh: "M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0 0 12 3M19 9A7 7 0 0 0 7 6",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z",
  shield: "M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3ZM9.5 12l1.7 1.7 3.8-4",
  template: "M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3H4V5ZM4 12h8v8H5a1 1 0 0 1-1-1v-7ZM16 12h4v7a1 1 0 0 1-1 1h-3v-8Z",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  userPlus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M16 11h6",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
};

const STATUS_META: Record<string, { color: string; bg: string; border: string; icon: IconName }> = {
  ASSIGNED: { color: "var(--muted2)", bg: "rgba(148,163,184,.08)", border: "rgba(148,163,184,.18)", icon: "send" },
  VIEWED: { color: "var(--gold)", bg: "rgba(214,178,94,.11)", border: "rgba(214,178,94,.28)", icon: "eye" },
  SIGNED: { color: "#69a7ff", bg: "rgba(105,167,255,.11)", border: "rgba(105,167,255,.28)", icon: "pen" },
  APPROVED: { color: "var(--ok)", bg: "rgba(54,196,134,.11)", border: "rgba(54,196,134,.28)", icon: "check" },
  REJECTED: { color: "var(--danger)", bg: "rgba(239,107,107,.1)", border: "rgba(239,107,107,.26)", icon: "alert" },
};

const STATUS_ORDER = ["ASSIGNED", "VIEWED", "SIGNED", "APPROVED", "REJECTED"];

function Icon({ name, size = 16, color = "currentColor" }: { name: IconName; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Ocurrió un error inesperado";
}

function dotClass(kind: "ok" | "warn" | "danger") {
  if (kind === "danger") return "log__dot log__dot--danger";
  if (kind === "ok") return "log__dot log__dot--ok";
  return "log__dot log__dot--gold";
}

function activityDot(dot: "gold" | "ok" | "default") {
  if (dot === "ok") return "log__dot log__dot--ok";
  if (dot === "gold") return "log__dot log__dot--gold";
  return "log__dot";
}

function eventTimes(assignments: AssignmentSummary[]) {
  return assignments.flatMap((assignment) =>
    (assignment.events || [])
      .map((event) => new Date(event.at).getTime())
      .filter((value) => Number.isFinite(value))
  );
}

function dayKey(value: number) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function makeDailySeries(assignments: AssignmentSummary[], length = 20) {
  const counts = new Map<number, number>();
  eventTimes(assignments).forEach((time) => {
    const key = dayKey(time);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const today = dayKey(Date.now());
  return Array.from({ length }, (_, index) => {
    const key = today - (length - 1 - index) * 86400000;
    return counts.get(key) || 0;
  });
}

function makeWeeklySeries(assignments: AssignmentSummary[], length = 12) {
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const buckets = Array.from({ length }, () => 0);

  eventTimes(assignments).forEach((time) => {
    const distance = Math.floor((now - time) / weekMs);
    const index = length - 1 - distance;
    if (index >= 0 && index < length) buckets[index] += 1;
  });

  return buckets;
}

function makeHeatmap(assignments: AssignmentSummary[], weeks = 10) {
  const daily = makeDailySeries(assignments, weeks * 7);
  const max = Math.max(...daily, 1);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const value = daily[week * 7 + day] || 0;
      return value === 0 ? 0 : Math.max(1, Math.ceil((value / max) * 4));
    })
  );
}

function formatTime(value?: number) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Sparkline({ data }: { data: number[] }) {
  const width = 180;
  const height = 38;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const points = data
    .map((value, index) => {
      const x = data.length === 1 ? 0 : (index / (data.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `M0,${height} L${points.split(" ").join(" L")} L${width},${height} Z`;

  return (
    <svg className="dashboard-sparkline" viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      <path d={area} />
      <polyline points={points} />
    </svg>
  );
}

function DashboardDonut({
  rows,
  total,
}: {
  rows: Array<{ status: string; count: number; color: string }>;
  total: number;
}) {
  return (
    <div className="dashboard-donut">
      <div className="dashboard-donut__total">
        <strong>{total}</strong>
        <span>Total</span>
      </div>

      <div className="dashboard-donut__legend">
        {rows
          .filter((row) => row.count > 0)
          .slice(0, 4)
          .map((row) => (
            <div className="dashboard-donut__legend-row" key={row.status}>
              <span style={{ background: row.color }} />
              <small>{statusLabel(row.status)}</small>
              <strong>{row.count}</strong>
            </div>
          ))}
        {total === 0 && (
          <div className="dashboard-donut__legend-row">
            <span />
            <small>Sin expedientes</small>
            <strong>0</strong>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [contracts, setContracts] = useState<AdminContract[]>([]);
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
  const activity = useMemo(() => buildActivity(assignments).slice(0, 8), [assignments]);
  const dailySeries = useMemo(() => makeDailySeries(assignments), [assignments]);
  const weeklySeries = useMemo(() => makeWeeklySeries(assignments), [assignments]);
  const heatmap = useMemo(() => makeHeatmap(assignments), [assignments]);

  const activeClients = users.filter((user) => user.role === "CLIENT" && user.status === "ACTIVE");
  const pendingClients = activeClients.filter((user) => !user.profile_completed || user.must_change_password);
  const activeTemplates = contracts.filter((contract) => contract.status === "ACTIVE");
  const openContracts = countByStatus(assignments, "ASSIGNED") + countByStatus(assignments, "VIEWED");
  const readyToApprove = countByStatus(assignments, "SIGNED");
  const approved = countByStatus(assignments, "APPROVED");
  const totalContracts = assignments.length;
  const lastEventAt = Math.max(...eventTimes(assignments), 0);
  const previousActivity = dailySeries.slice(0, 10).reduce((sum, value) => sum + value, 0);
  const currentActivity = dailySeries.slice(10).reduce((sum, value) => sum + value, 0);
  const activityDelta = previousActivity
    ? Math.round(((currentActivity - previousActivity) / previousActivity) * 100)
    : currentActivity > 0
    ? 100
    : 0;

  const statusRows = STATUS_ORDER.map((status) => {
    const count = countByStatus(assignments, status);
    const percent = totalContracts ? Math.round((count / totalContracts) * 100) : 0;
    const meta = STATUS_META[status];
    return {
      status,
      count,
      percent,
      color: meta.color,
      bg: meta.bg,
      border: meta.border,
      icon: meta.icon,
    };
  });

  const heatColors = ["#edebe4", "#fde8bc", "#f5c842", "#c4973e", "#836228"];
  const maxWeekly = Math.max(...weeklySeries, 1);

  return (
    <div className="dashboard-screen dashboard-reference">
      <header className="topbar dashboard-topbar">
        <div className="topbar__left">
          <div className="eyebrow">Panel administrativo</div>
          <h1 className="title">Dashboard</h1>
        </div>

        <div className="topbar__right">
          <span className="dashboard-live">
            <i />
            En vivo
          </span>
          <button className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
            <Icon name="refresh" size={14} />
            Actualizar
          </button>
          <Link className="btn btn--primary" href="/contratos">
            Ver expedientes
          </Link>
        </div>
      </header>

      {error && (
        <section className="card dashboard-error" style={{ padding: 12 }}>
          <div className="muted small text-danger">{error}</div>
        </section>
      )}

      <main className="dashboard-page">
        <section className="dashboard-editorial-hero">
          <div className="dashboard-section-label">Estado general</div>

          <div className="dashboard-hero-line">
            <div className="dashboard-hero-metric">
              <strong>{openContracts}</strong>
              <span>en revisión</span>
              <em>·</em>
              <strong>{readyToApprove}</strong>
              <span>por aprobar</span>
            </div>

            <DashboardDonut rows={statusRows} total={totalContracts} />
          </div>

          <div className="dashboard-hero-foot">
            <div className="dashboard-trust dashboard-trust--inline">
              <Icon name="shield" size={14} />
              <span>Cifrado de sesión</span>
              <span>Roles autorizados</span>
              <span>Evidencia auditable</span>
            </div>

            <div className="dashboard-trend">
              <div>
                <p>Actividad · últimos 20 días</p>
                <Sparkline data={dailySeries} />
              </div>
              <div className={activityDelta >= 0 ? "dashboard-trend__value is-up" : "dashboard-trend__value is-down"}>
                <Icon name="trend" size={16} />
                <strong>{activityDelta > 0 ? "+" : ""}{activityDelta}%</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-stat-row">
          <Link className="dashboard-stat-cell" href="/contratos">
            <div>
              <span>Total contratos</span>
              <Icon name="folder" size={15} />
            </div>
            <strong>{totalContracts}</strong>
            <small>{loading ? "Actualizando" : "en el sistema"}</small>
          </Link>

          <Link className="dashboard-stat-cell" href="/contratos">
            <div>
              <span>Por aprobar</span>
              <Icon name="clock" size={15} />
            </div>
            <strong>{readyToApprove}</strong>
            <small>{readyToApprove === 0 ? "sin pendientes" : "requieren revisión"}</small>
          </Link>

          <Link className="dashboard-stat-cell" href="/clientes">
            <div>
              <span>Clientes pendientes</span>
              <Icon name="users" size={15} />
            </div>
            <strong>{pendingClients.length}</strong>
            <small>{activeClients.length} clientes activos</small>
          </Link>

          <Link className="dashboard-stat-cell" href="/contratos">
            <div>
              <span>Finalizados</span>
              <Icon name="check" size={15} />
            </div>
            <strong>{approved}</strong>
            <small>{activeTemplates.length} plantillas activas</small>
          </Link>
        </section>

        <section className="dashboard-editorial-grid">
          <article className="dashboard-panel dashboard-status-panel">
            <div className="dashboard-section-head">
              <span className="dashboard-section-label">Contratos por estado</span>
              <small>{totalContracts} expedientes</small>
            </div>

            <div className="dashboard-status-list">
              {statusRows.map((row) => (
                <div className="dashboard-status-row" key={row.status}>
                  <div className="dashboard-status-row__head">
                    <span className="dashboard-status-tag" style={{ color: row.color, borderColor: row.border, background: row.bg }}>
                      <Icon name={row.icon} size={13} color={row.color} />
                      {statusLabel(row.status)}
                    </span>
                    <strong>{row.count}</strong>
                  </div>
                  <div className="dashboard-mini-progress">
                    <i style={{ width: `${row.percent}%`, background: row.color }} />
                  </div>
                  <small>{row.percent}%</small>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-panel dashboard-activity-panel">
            <div className="dashboard-section-head">
              <span className="dashboard-section-label">Actividad reciente</span>
              <Link className="link small" href="/bitacora">Ver bitácora</Link>
            </div>

            <div className="dashboard-activity-list">
              {activity.length === 0 ? (
                <div className="dashboard-empty">Aún no hay actividad registrada.</div>
              ) : (
                activity.slice(0, 5).map((item) => (
                  <Link className="dashboard-activity-row" href={item.href} key={item.id}>
                    <span className={activityDot(item.dot)} />
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </div>
                    <time>{item.when}</time>
                  </Link>
                ))
              )}
            </div>

            <div className="dashboard-heatmap">
              <div className="dashboard-section-head">
                <span className="dashboard-section-label">Historial · 10 semanas</span>
                <div className="dashboard-heatmap__legend" aria-hidden="true">
                  <small>menos</small>
                  {heatColors.map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                  <small>más</small>
                </div>
              </div>
              <div className="dashboard-heatmap__grid">
                {heatmap.map((week, weekIndex) => (
                  <div className="dashboard-heatmap__week" key={weekIndex}>
                    {week.map((value, dayIndex) => (
                      <span
                        key={`${weekIndex}-${dayIndex}`}
                        title={`${value} nivel de actividad`}
                        style={{ background: heatColors[value] }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="dashboard-panel dashboard-notifications-panel">
            <div className="dashboard-section-head">
              <span className="dashboard-section-label">Notificaciones</span>
              <Link className="link small" href="/notificaciones">Ver todo</Link>
            </div>

            <div className="dashboard-notification-list">
              {notifications.slice(0, 4).map((item) => (
                <Link className="dashboard-notification" key={item.id} href={item.href}>
                  <div>
                    <span className={dotClass(item.severity)} />
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                  <em>{item.when}</em>
                </Link>
              ))}
            </div>

            <div className="dashboard-weekly">
              <div className="dashboard-section-head">
                <span className="dashboard-section-label">Resumen semanal</span>
                <small>{weeklySeries.reduce((sum, value) => sum + value, 0)} eventos</small>
              </div>
              <div className="dashboard-weekly__bars">
                {weeklySeries.map((value, index) => (
                  <span
                    key={index}
                    title={`${value} eventos`}
                    style={{ height: `${Math.max(8, (value / maxWeekly) * 100)}%` }}
                    className={index === weeklySeries.length - 1 ? "is-current" : ""}
                  />
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className="dashboard-quickbar">
          <span>Acciones rápidas</span>
          <Link href="/contratos" className="dashboard-quick-action">
            <Icon name="plus" size={14} />
            Nuevo contrato
          </Link>
          <Link href="/clientes" className="dashboard-quick-action">
            <Icon name="userPlus" size={14} />
            Agregar cliente
          </Link>
          <Link href="/plantillas" className="dashboard-quick-action">
            <Icon name="template" size={14} />
            Nueva plantilla
          </Link>
          <Link href="/bitacora" className="dashboard-quick-action">
            <Icon name="download" size={14} />
            Revisar bitácora
          </Link>
          <small>Última actualización: {formatTime(lastEventAt)}</small>
        </section>
      </main>
    </div>
  );
}

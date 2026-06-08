import type { AdminContract, AdminUser, AssignmentEvent, AssignmentSummary } from "./api";

export type NotificationSeverity = "ok" | "warn" | "danger";

export type NotificationItem = {
  id: string;
  severity: NotificationSeverity;
  title: string;
  detail: string;
  when: string;
  href: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  when: string;
  dot: "gold" | "ok" | "default";
  href: string;
  rawDate: number;
};

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    ASSIGNED: "Enviado",
    VIEWED: "En revisión",
    SIGNED: "Firmado",
    APPROVED: "Finalizado",
    REJECTED: "Rechazado",
  };
  return map[status] || status;
}

export function statusBadgeClass(status: string) {
  if (status === "SIGNED" || status === "APPROVED") return "badge badge--done";
  if (status === "REJECTED") return "badge badge--draft text-danger";
  if (status === "VIEWED") return "badge badge--sign";
  return "badge badge--sent";
}

export function eventLabel(type: string) {
  const map: Record<string, string> = {
    ASSIGNED: "Contrato enviado",
    VIEWED: "Cliente abrió el contrato",
    SIGNED: "Cliente firmó",
    APPROVED: "PDF aprobado",
    REJECTED: "Contrato rechazado",
    CHAT_CLOSED: "Chat cerrado",
    CHAT_REOPENED: "Chat reabierto",
  };
  return map[type] || type;
}

export function eventHint(type: string) {
  const map: Record<string, string> = {
    ASSIGNED: "El expediente quedó disponible para el cliente.",
    VIEWED: "El cliente ya revisó el contrato en su bandeja.",
    SIGNED: "Requiere aprobación administrativa para generar el PDF final.",
    APPROVED: "El contrato final está listo para descarga.",
    REJECTED: "Se detuvo el proceso de aprobación.",
    CHAT_CLOSED: "El cliente no puede enviar mensajes ni firmar mientras esté cerrado.",
    CHAT_REOPENED: "El cliente puede volver a interactuar con el expediente.",
  };
  return map[type] || "Actividad registrada en el expediente.";
}

export function eventDot(type: string): ActivityItem["dot"] {
  if (type === "APPROVED") return "ok";
  if (type === "SIGNED" || type === "ASSIGNED" || type === "CHAT_REOPENED") return "gold";
  return "default";
}

export function isWithinDays(value: string | undefined | null, days: number) {
  if (!value) return false;
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return false;
  return Date.now() - date <= days * 24 * 60 * 60 * 1000;
}

export function buildActivity(assignments: AssignmentSummary[]) {
  return assignments
    .flatMap((assignment) => {
      const events = assignment.events || [];
      return events.map((event: AssignmentEvent) => ({
        id: `${assignment.id}-${event.id}`,
        title: assignment.contract_title || "Contrato",
        detail: `${eventLabel(event.type)} · ${assignment.client_name || "Cliente"}`,
        when: formatDate(event.at),
        dot: eventDot(event.type),
        href: "/contratos",
        rawDate: new Date(event.at).getTime() || 0,
      }));
    })
    .sort((a, b) => b.rawDate - a.rawDate);
}

export function buildNotifications(
  assignments: AssignmentSummary[],
  users: AdminUser[],
  contracts: AdminContract[]
) {
  const items: NotificationItem[] = [];
  const ready = assignments.filter((item) => item.status === "SIGNED");
  const pendingClients = users.filter(
    (user) =>
      user.role === "CLIENT" &&
      user.status === "ACTIVE" &&
      (!user.profile_completed || user.must_change_password)
  );
  const rejected = assignments.filter((item) => item.status === "REJECTED");
  const withoutTemplates = contracts.length === 0;
  const recentlyApproved = assignments.filter(
    (item) => item.status === "APPROVED" && isWithinDays(item.approval?.at || item.updated_at, 7)
  );

  if (ready.length > 0) {
    items.push({
      id: "ready-approval",
      severity: "warn",
      title: "Contratos listos para aprobar",
      detail: `${ready.length} contrato${ready.length === 1 ? "" : "s"} firmado${ready.length === 1 ? "" : "s"} esperando PDF final.`,
      when: "ahora",
      href: "/contratos",
    });
  }

  if (pendingClients.length > 0) {
    items.push({
      id: "pending-clients",
      severity: "warn",
      title: "Clientes con perfil pendiente",
      detail: `${pendingClients.length} cliente${pendingClients.length === 1 ? "" : "s"} sin perfil completo o primer acceso.`,
      when: "activo",
      href: "/clientes",
    });
  }

  if (rejected.length > 0) {
    items.push({
      id: "rejected",
      severity: "danger",
      title: "Contratos rechazados",
      detail: `${rejected.length} expediente${rejected.length === 1 ? "" : "s"} requieren revisión administrativa.`,
      when: "activo",
      href: "/contratos",
    });
  }

  if (withoutTemplates) {
    items.push({
      id: "no-templates",
      severity: "danger",
      title: "No hay plantillas activas",
      detail: "Carga al menos una plantilla para poder asignar contratos.",
      when: "bloqueante",
      href: "/plantillas",
    });
  }

  if (recentlyApproved.length > 0) {
    items.push({
      id: "approved-week",
      severity: "ok",
      title: "PDFs aprobados recientes",
      detail: `${recentlyApproved.length} contrato${recentlyApproved.length === 1 ? "" : "s"} finalizado${recentlyApproved.length === 1 ? "" : "s"} en los últimos 7 días.`,
      when: "7 días",
      href: "/contratos",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "all-clear",
      severity: "ok",
      title: "Sin alertas críticas",
      detail: "No hay contratos pendientes de aprobación ni bloqueos de clientes.",
      when: "ahora",
      href: "/",
    });
  }

  return items;
}

export function countByStatus(assignments: AssignmentSummary[], status: string) {
  return assignments.filter((item) => item.status === status).length;
}

export function clientDisplayStatus(user: AdminUser) {
  if (user.status === "DISABLED") return "Desactivado";
  if (user.profile_completed && !user.must_change_password) return "Activo";
  return "Pendiente";
}

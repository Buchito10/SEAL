"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createUser,
  deleteUser,
  disableUser,
  listUsers,
  patchUser,
  resendInvitation,
  type AdminUser,
} from "@/lib/api";

type ClientStatus = "Activo" | "Pendiente" | "Desactivado";
type StatusFilter = "all" | "active" | "pending" | "disabled";

type ClientRow = {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: string;
  dept: string;
  status: ClientStatus;
  contractsText: string;
  user: AdminUser;
};

type ModalMode = "create" | "edit";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  role: "",
  dept: "Seleccionar...",
  forcePwdChange: true,
};

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Ocurrió un error inesperado";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CL";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.slice(0, 1).join(" "),
    lastName: parts.slice(1).join(" "),
  };
}

function getClientStatus(user: AdminUser): ClientStatus {
  if (user.status === "DISABLED") return "Desactivado";
  if (user.status === "PENDING_ACTIVATION") return "Pendiente";
  return "Activo";
}

function mapClient(user: AdminUser): ClientRow {
  const status = getClientStatus(user);

  return {
    id: user.id,
    initials: getInitials(user.name),
    name: user.name,
    email: user.email,
    role: user.position || "Sin puesto",
    dept:
      status === "Desactivado"
        ? "Cuenta desactivada"
        : user.profile_completed
        ? "Perfil completo"
        : "Perfil pendiente",
    status,
    contractsText: "Sin expedientes",
    user,
  };
}

function statusBadgeClass(status: ClientStatus) {
  if (status === "Activo") return "badge badge--done";
  if (status === "Desactivado") return "badge badge--draft text-danger";
  return "badge badge--sent";
}

export default function ClientesPage() {
  const [clients, setClients] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const modalTitle = modalMode === "create" ? "Invitar nuevo cliente" : "Editar Cliente";

  async function loadClients() {
    setError("");
    setIsLoading(true);

    try {
      const users = await listUsers();
      setClients(users.filter((user) => user.role === "CLIENT"));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  const rows = useMemo(() => clients.map(mapClient), [clients]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return rows.filter((client) => {
      const matchesQuery =
        !query ||
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.role.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? client.status === "Activo"
          : statusFilter === "pending"
          ? client.status === "Pendiente"
          : client.status === "Desactivado";

      return matchesQuery && matchesStatus;
    });
  }, [q, rows, statusFilter]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((client) => client.status === "Activo").length,
      pending: rows.filter((client) => client.status === "Pendiente").length,
      disabled: rows.filter((client) => client.status === "Desactivado").length,
    }),
    [rows]
  );

  function openModal(mode: ModalMode, existing?: ClientRow) {
    setError("");
    setNotice("");
    setModalMode(mode);

    if (mode === "create") {
      setEditingId(null);
      setForm(EMPTY_FORM);
    } else if (existing) {
      const { firstName, lastName } = splitName(existing.name);
      setEditingId(existing.id);
      setForm({
        firstName,
        lastName,
        email: existing.email,
        role: existing.user.position || "",
        dept: "Seleccionar...",
        forcePwdChange: Boolean(existing.user.must_change_password),
      });
    }

    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const position = form.role.trim();

    try {
      if (modalMode === "create") {
        const result = await createUser({
          name,
          email: form.email.trim(),
          role: "CLIENT",
          position: position || undefined,
        });
        setNotice(
          result.invitationSent
            ? "Cliente invitado. Se envió un enlace seguro para activar su cuenta."
            : "Cliente creado con activación pendiente. Configura SMTP y usa Reenviar para entregar la invitación."
        );
      } else if (editingId) {
        await patchUser(editingId, {
          name,
          position: position || null,
        });
        setNotice("Cliente actualizado.");
      }

      setIsModalOpen(false);
      await loadClients();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onResend(client: ClientRow) {
    setActionId(client.id);
    setError("");
    setNotice("");

    try {
      const result = await resendInvitation(client.id);
      setNotice(result.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function onDisable(client: ClientRow) {
    const confirmed = window.confirm(`¿Desactivar la cuenta de ${client.name}?`);
    if (!confirmed) return;

    setActionId(client.id);
    setError("");
    setNotice("");

    try {
      await disableUser(client.id);
      setNotice("Cliente desactivado.");
      await loadClients();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function onDelete(client: ClientRow) {
    const confirmed = window.confirm(
      `¿Eliminar permanentemente a ${client.name}?\n\n` +
        "Se borrarán su cuenta, perfil y enlaces de acceso. El correo quedará disponible para registrarlo nuevamente. " +
        "La evidencia contractual histórica se conservará."
    );
    if (!confirmed) return;

    setActionId(client.id);
    setError("");
    setNotice("");

    try {
      const result = await deleteUser(client.id);
      setNotice(result.message);
      await loadClients();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="clients-screen">
      <header className="topbar clients-topbar">
        <div className="topbar__left">
          <div className="eyebrow">Directorio seguro</div>
          <h1 className="title">Clientes</h1>
        </div>

        <div className="topbar__right">
          <button className="btn btn--primary" onClick={() => openModal("create")}>
            + Invitar cliente
          </button>
        </div>
      </header>

      {(error || notice) && (
        <section className="card clients-alert" style={{ padding: 12 }}>
          {error && <div className="muted small text-danger">{error}</div>}
          {notice && <div className="muted small">{notice}</div>}
        </section>
      )}

      <section className="clients-metrics">
        <div className="client-metric client-metric--gold">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="client-metric client-metric--ok">
          <span>Activos</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="client-metric client-metric--pending">
          <span>Pendientes</span>
          <strong>{summary.pending}</strong>
        </div>
        <div className="client-metric client-metric--muted">
          <span>Desactivados</span>
          <strong>{summary.disabled}</strong>
        </div>
      </section>

      <section className="card card--toolbar clients-toolbar">
        <div className="search" style={{ flex: 1 }}>
          <span className="search__icon">⌕</span>
          <input
            className="search__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="text"
            placeholder="Buscar por nombre, correo o puesto..."
          />
        </div>

        <select
          className="control clients-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">Estado: Todos</option>
          <option value="active">Activos</option>
          <option value="pending">Pendientes de ingreso</option>
          <option value="disabled">Desactivados</option>
        </select>
      </section>

      <section className="card clients-directory">
        <div className="card__title-row clients-directory__head">
          <div>
            <h2 className="card__title">Directorio de clientes</h2>
            <div className="muted small">
              Mostrando {filtered.length} de {clients.length}
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => void loadClients()} disabled={isLoading}>
            Actualizar
          </button>
        </div>

        <div className="clients-table">
          <div className="clients-table__row clients-table__head">
            <div>Cliente</div>
            <div>Puesto</div>
            <div>Estado</div>
            <div>Contratos</div>
            <div className="t-right">Acciones</div>
          </div>

          {isLoading ? (
            <div className="clients-table__row">
              <div className="clients-empty">Cargando clientes...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="clients-table__row">
              <div className="clients-empty">No hay clientes para mostrar.</div>
            </div>
          ) : (
            filtered.map((client) => (
              <div className="clients-table__row clients-table__body" key={client.id}>
                <div className="client-person">
                  <div className={`client-avatar client-avatar--${client.status.toLowerCase()}`}>{client.initials}</div>
                  <div className="client-person__text">
                    <div className="strong">{client.name}</div>
                    <div className="muted small">{client.email}</div>
                  </div>
                </div>

                <div>
                  <div className="strong small">{client.role}</div>
                  <div className="muted small">{client.dept}</div>
                </div>

                <div>
                  <span className={statusBadgeClass(client.status)}>{client.status}</span>
                </div>

                <div className="muted small">{client.contractsText}</div>

                <div className="clients-actions">
                  {client.user.status === "PENDING_ACTIVATION" && (
                    <button
                      className="btn btn--ghost btn--sm"
                      title="Reenviar invitación de activación"
                      disabled={actionId === client.id}
                      onClick={() => void onResend(client)}
                    >
                      Reenviar invitación
                    </button>
                  )}

                  <button
                    className="icon-btn icon-btn--sm"
                    title="Editar"
                    disabled={actionId === client.id}
                    onClick={() => openModal("edit", client)}
                  >
                    ✎
                  </button>

                  {client.status !== "Desactivado" && (
                    <button
                      className="icon-btn icon-btn--sm text-danger"
                      title="Desactivar"
                      disabled={actionId === client.id}
                      onClick={() => void onDisable(client)}
                    >
                      X
                    </button>
                  )}

                  <button
                    className="btn btn--ghost btn--sm text-danger"
                    title="Eliminar cliente permanentemente"
                    disabled={actionId === client.id}
                    onClick={() => void onDelete(client)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div
        className={`modal-overlay ${isModalOpen ? "is-visible" : ""}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="modal card clients-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <div>
              <div className="eyebrow">Acceso de cliente</div>
              <h2 className="card__title">{modalTitle}</h2>
            </div>
            <button className="icon-btn icon-btn--sm" onClick={closeModal} aria-label="Cerrar" disabled={saving}>
              X
            </button>
          </div>

          <div className="modal__body">
            <form className="form-grid" onSubmit={onSave}>
              <div className="grid-2">
                <label className="field">
                  <span className="field__label">Nombre(s) *</span>
                  <input
                    className="control"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Apellidos *</span>
                  <input
                    className="control"
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <label className="field">
                <span className="field__label">Correo *</span>
                <input
                  className="control"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={modalMode === "edit"}
                />
              </label>

              <div className="grid-2">
                <label className="field">
                  <span className="field__label">Puesto *</span>
                  <input
                    className="control"
                    type="text"
                    value={form.role}
                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Área</span>
                  <select
                    className="control"
                    value={form.dept}
                    onChange={(e) => setForm((prev) => ({ ...prev, dept: e.target.value }))}
                  >
                    <option>Seleccionar...</option>
                    <option>Operaciones</option>
                    <option>Recursos Humanos</option>
                    <option>Tecnología</option>
                    <option>Ventas</option>
                  </select>
                </label>
              </div>

              <label className="field checkbox-field clients-secure-note">
                <input type="checkbox" checked={form.forcePwdChange} disabled readOnly />
                <span className="muted small">
                  El sistema enviará una invitación segura. El cliente deberá crear su contraseña y aceptar los documentos de privacidad para activar la cuenta.
                </span>
              </label>

              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? "Enviando..." : modalMode === "create" ? "Crear y enviar invitación" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  askAdminAssignmentAi,
  approveAdminAssignment,
  createAssignment,
  getAdminAssignment,
  getAdminAssignmentPdf,
  listAdminAssignments,
  listAssignmentMessages,
  listContracts,
  listUsers,
  precheckAssignment,
  requestAssignmentProfileUpdate,
  sendAssignmentMessage,
  setAssignmentChatStatus,
  type AdminContract,
  type AdminUser,
  type AssignmentMessage,
  type AssignmentPrecheck,
  type AssignmentSummary,
} from "@/lib/api";

type StatusFilter = "all" | "attention" | "ready" | "open" | "signed" | "approved";
type DetailTab = "chat" | "documento" | "datos" | "ia" | "actividad";

const EMPTY_ASSIGN_FORM = {
  client_id: "",
  contract_id: "",
  contract_version: 1,
  initial_message: "Te comparto el contrato para que lo revises y lo firmes.",
};

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Ocurrió un error inesperado";
}

function formatDate(value?: string | null) {
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

function statusLabel(status: string) {
  const map: Record<string, string> = {
    ASSIGNED: "Enviado",
    VIEWED: "En revisión",
    SIGNED: "Firmado",
    APPROVED: "Finalizado",
    REJECTED: "Rechazado",
  };
  return map[status] || status;
}

function statusClass(status: string) {
  if (status === "SIGNED" || status === "APPROVED") return "badge badge--done";
  if (status === "REJECTED") return "badge badge--draft text-danger";
  if (status === "VIEWED") return "badge badge--sign";
  return "badge badge--sent";
}

function eventLabel(type: string) {
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

function eventHint(type: string) {
  const map: Record<string, string> = {
    ASSIGNED: "El expediente quedó disponible para el cliente.",
    VIEWED: "El cliente ya revisó el contrato en su bandeja.",
    SIGNED: "Requiere aprobación administrativa para generar el PDF final.",
    APPROVED: "El contrato final está listo para descarga.",
    REJECTED: "Se detuvo el proceso de aprobación.",
    CHAT_CLOSED: "El cliente ya no puede enviar mensajes ni firmar mientras esté cerrado.",
    CHAT_REOPENED: "El cliente puede volver a interactuar con el expediente.",
  };

  return map[type] || "Actividad registrada en el expediente.";
}

function initials(name?: string | null) {
  const parts = String(name || "CL").trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function placeholderLabel(key: string) {
  const labels: Record<string, string> = {
    "company.title": "Título del contrato",
    "company.area": "Área",
    "company.position": "Puesto",
    "company.duration": "Duración",
    "company.legal_representative_name": "Representante legal",
    "company.start_date": "Fecha de inicio",
    "company.end_date": "Fecha de fin",
    "company.salary": "Salario",
    "company.work_schedule": "Jornada / horario",
    "employee.name": "Nombre del cliente",
    "employee.email": "Correo del cliente",
    "employee.rfc": "RFC",
    "employee.curp": "CURP",
    "employee.phone": "Teléfono",
    "employee.address_line1": "Dirección",
    "employee.address_city": "Ciudad",
    "employee.address_state": "Estado",
    "employee.address_zip": "Código postal",
    "employee.address_country": "País",
  };

  return labels[key] || key;
}

function hasAttention(assignment: AssignmentSummary) {
  return assignment.status === "SIGNED" || assignment.status === "REJECTED";
}

export default function ContratosPage() {
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [selected, setSelected] = useState<AssignmentSummary | null>(null);
  const [messages, setMessages] = useState<AssignmentMessage[]>([]);

  const [clients, setClients] = useState<AdminUser[]>([]);
  const [contracts, setContracts] = useState<AdminContract[]>([]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTab, setActiveTab] = useState<DetailTab>("chat");

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [composer, setComposer] = useState("");
  const [aiQuestion, setAiQuestion] = useState("Resume los puntos importantes de este contrato.");
  const [aiAnswer, setAiAnswer] = useState("");
  const [sending, setSending] = useState(false);
  const [askingAi, setAskingAi] = useState(false);
  const [approving, setApproving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN_FORM);
  const [precheck, setPrecheck] = useState<AssignmentPrecheck | null>(null);
  const [companyValues, setCompanyValues] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [prechecking, setPrechecking] = useState(false);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setError("");

    try {
      const [assignment, rows] = await Promise.all([getAdminAssignment(id), listAssignmentMessages(id)]);
      selectedIdRef.current = id;
      setAiAnswer("");
      setSelected(assignment);
      setMessages(rows);
      setSelectedId(id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadAssignments = useCallback(async (preferredId?: string) => {
    setError("");
    setLoadingList(true);

    try {
      const rows = await listAdminAssignments();
      setAssignments(rows);

      const nextId = preferredId || selectedIdRef.current || rows[0]?.id || null;
      selectedIdRef.current = nextId;
      setSelectedId(nextId);
      if (nextId) await loadDetail(nextId);
      else {
        setSelected(null);
        setMessages([]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  }, [loadDetail]);

  const loadSupportData = useCallback(async () => {
    try {
      const [users, contractRows] = await Promise.all([listUsers(), listContracts()]);
      setClients(users.filter((user) => user.role === "CLIENT" && user.status === "ACTIVE"));
      setContracts(contractRows.filter((contract) => contract.status === "ACTIVE"));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    void loadSupportData();
    void loadAssignments();
  }, [loadAssignments, loadSupportData]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const text = [
        assignment.client_name,
        assignment.client_email,
        assignment.contract_title,
        assignment.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !query || text.includes(query);
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "open"
          ? assignment.status === "ASSIGNED" || assignment.status === "VIEWED"
          : statusFilter === "ready"
          ? assignment.status === "SIGNED"
          : statusFilter === "signed"
          ? assignment.status === "SIGNED"
          : statusFilter === "approved"
          ? assignment.status === "APPROVED"
          : hasAttention(assignment);

      return matchesQuery && matchesStatus;
    });
  }, [assignments, q, statusFilter]);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === assignForm.contract_id) || null,
    [assignForm.contract_id, contracts]
  );

  const stats = useMemo(
    () => ({
      open: assignments.filter((item) => item.status === "ASSIGNED" || item.status === "VIEWED").length,
      ready: assignments.filter((item) => item.status === "SIGNED").length,
      approved: assignments.filter((item) => item.status === "APPROVED").length,
    }),
    [assignments]
  );

  function openAssignModal() {
    setError("");
    setNotice("");
    setPrecheck(null);
    setCompanyValues({});
    setAssignForm({
      ...EMPTY_ASSIGN_FORM,
      client_id: clients[0]?.id || "",
      contract_id: contracts[0]?.id || "",
      contract_version: contracts[0]?.current_version || 1,
    });
    setIsModalOpen(true);
  }

  function closeAssignModal() {
    if (creating || prechecking) return;
    setIsModalOpen(false);
  }

  async function runPrecheck() {
    if (!assignForm.client_id || !assignForm.contract_id) {
      setError("Selecciona cliente y plantilla antes de validar.");
      return;
    }

    setPrechecking(true);
    setError("");
    setNotice("");

    try {
      const result = await precheckAssignment({
        client_id: assignForm.client_id,
        contract_id: assignForm.contract_id,
        contract_version: assignForm.contract_version,
      });

      setPrecheck(result);

      const nextValues: Record<string, string> = {};
      for (const key of result.required_company_placeholders || []) {
        if (key === "company.title") nextValues[key] = selectedContract?.title || "";
        else if (key === "company.area") nextValues[key] = selectedContract?.area || "";
        else if (key === "company.position") nextValues[key] = selectedContract?.position || "";
        else nextValues[key] = companyValues[key] || "";
      }
      setCompanyValues(nextValues);
    } catch (err) {
      setPrecheck(null);
      setError(getErrorMessage(err));
    } finally {
      setPrechecking(false);
    }
  }

  async function onRequestProfileUpdate() {
    if (!precheck) return;
    setPrechecking(true);
    setError("");
    setNotice("");

    try {
      await requestAssignmentProfileUpdate({
        client_id: assignForm.client_id,
        contract_id: assignForm.contract_id,
        contract_version: assignForm.contract_version,
      });
      setNotice("Se solicitó actualización de perfil al cliente.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPrechecking(false);
    }
  }

  async function onCreateAssignment(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!precheck) {
      await runPrecheck();
      return;
    }

    if (precheck.missing_employee_placeholders.length > 0) {
      setError("El cliente aún tiene datos obligatorios pendientes.");
      return;
    }

    const missingCompany = precheck.required_company_placeholders.filter(
      (key) => !companyValues[key] || !String(companyValues[key]).trim()
    );

    if (missingCompany.length > 0) {
      setError(`Faltan datos del contrato: ${missingCompany.map(placeholderLabel).join(", ")}`);
      return;
    }

    setCreating(true);

    try {
      const created = await createAssignment({
        client_id: assignForm.client_id,
        contract_id: assignForm.contract_id,
        contract_version: assignForm.contract_version,
        initial_message: assignForm.initial_message,
        company_values: companyValues,
      });

      setNotice("Expediente creado y asignado al cliente.");
      setIsModalOpen(false);
      await loadAssignments(created.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function onSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!selected || !composer.trim()) return;

    setSending(true);
    setError("");

    try {
      await sendAssignmentMessage(selected.id, composer.trim());
      setComposer("");
      await loadDetail(selected.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function onToggleChatStatus() {
    if (!selected) return;
    const next = selected.chat_status === "CLOSED" ? "OPEN" : "CLOSED";
    setError("");

    try {
      const updated = await setAssignmentChatStatus(selected.id, next);
      setSelected(updated);
      await loadAssignments(updated.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onApproveAssignment() {
    if (!selected) return;

    setApproving(true);
    setError("");
    setNotice("");

    try {
      const updated = await approveAdminAssignment(selected.id);
      setSelected(updated);
      setNotice("Contrato aprobado y PDF final generado.");
      await loadAssignments(updated.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setApproving(false);
    }
  }

  async function onDownloadPdf() {
    if (!selected) return;

    setDownloadingPdf(true);
    setError("");
    setNotice("");

    try {
      const data = await getAdminAssignmentPdf(selected.id);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function onAskAi(e: FormEvent) {
    e.preventDefault();
    if (!selected || !aiQuestion.trim()) return;

    setAskingAi(true);
    setError("");

    try {
      const data = await askAdminAssignmentAi(selected.id, aiQuestion.trim());
      setAiAnswer(data.answer);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAskingAi(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__left">
          <h1 className="title">Contratos / Expedientes</h1>
          <p className="subtitle">Bandeja tipo chat para dar seguimiento a contratos asignados.</p>
        </div>

        <div className="topbar__right">
          <button className="btn btn--ghost" onClick={() => void loadAssignments()} disabled={loadingList}>
            Actualizar
          </button>
          <button className="btn btn--primary" onClick={openAssignModal}>
            + Nuevo expediente
          </button>
        </div>
      </header>

      {(error || notice) && (
        <section className="card" style={{ padding: 12 }}>
          {error && <div className="muted small text-danger">{error}</div>}
          {notice && <div className="muted small">{notice}</div>}
        </section>
      )}

      <section className="grid workspace-grid">
        <article className="card workspace-sidebar" style={{ gridColumn: "1 / span 4", minHeight: 680 }}>
          <div className="card__title-row">
            <h2 className="card__title">Bandeja</h2>
            <span className="chip">{filtered.length}</span>
          </div>

          <div className="hero__stats" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 12 }}>
            <button
              className="stat"
              type="button"
              onClick={() => setStatusFilter("open")}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <div className="stat__label">En revisión</div>
              <div className="stat__value">{stats.open}</div>
            </button>
            <button
              className="stat"
              type="button"
              onClick={() => setStatusFilter("ready")}
              style={{
                textAlign: "left",
                cursor: "pointer",
                borderColor: stats.ready > 0 ? "rgba(214,178,94,.45)" : "var(--stroke2)",
              }}
            >
              <div className="stat__label">Por aprobar</div>
              <div className="stat__value">{stats.ready}</div>
            </button>
            <button
              className="stat"
              type="button"
              onClick={() => setStatusFilter("approved")}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <div className="stat__label">Finalizados</div>
              <div className="stat__value">{stats.approved}</div>
            </button>
          </div>

          <div className="search" style={{ minWidth: 0, width: "100%", marginBottom: 10 }}>
            <span className="search__icon">⌕</span>
            <input
              className="search__input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="text"
              placeholder="Buscar cliente o contrato..."
            />
          </div>

          <select
            className="control"
            style={{ marginBottom: 12 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">Todos</option>
            <option value="attention">Requieren atención</option>
            <option value="ready">Listos para aprobar</option>
            <option value="open">En revisión</option>
            <option value="signed">Firmados</option>
            <option value="approved">Finalizados</option>
          </select>

          <div style={{ display: "grid", gap: 10 }}>
            {loadingList ? (
              <div className="muted small">Cargando expedientes...</div>
            ) : filtered.length === 0 ? (
              <div className="note">
                <div className="note__title">Sin expedientes</div>
                <div className="note__text">Crea un expediente para asignar una plantilla a un cliente.</div>
              </div>
            ) : (
              filtered.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  className="tile"
                  onClick={() => void loadDetail(assignment.id)}
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    borderColor:
                      selectedId === assignment.id || assignment.status === "SIGNED"
                        ? "var(--goldGlow)"
                        : "var(--stroke2)",
                  }}
                >
                  <div className="cell-main">
                    <div className="avatar">{initials(assignment.client_name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="strong">{assignment.client_name || "Cliente"}</div>
                      <div className="muted small">{assignment.contract_title || "Contrato asignado"}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, gap: 8 }}>
                    <span className={statusClass(assignment.status)}>{statusLabel(assignment.status)}</span>
                    <span className="muted small">{formatDate(assignment.updated_at || assignment.created_at)}</span>
                  </div>
                  {assignment.status === "SIGNED" && (
                    <div className="muted small" style={{ marginTop: 8, color: "var(--goldHi)" }}>
                      Listo para aprobar PDF
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </article>

        <article className="card workspace-detail" style={{ gridColumn: "5 / span 8", minHeight: 680 }}>
          {!selected ? (
            <div className="note">
              <div className="note__title">Selecciona un expediente</div>
              <div className="note__text">Aquí aparecerán chat, documento, datos y actividad.</div>
            </div>
          ) : (
            <>
              <div className="card__title-row">
                <div className="cell-main">
                  <div className="avatar">{initials(selected.client_name)}</div>
                  <div>
                    <h2 className="card__title" style={{ marginBottom: 3 }}>
                      {selected.client_name || "Cliente"}
                    </h2>
                    <div className="muted small">
                      {selected.contract_title || "Contrato"} · v{selected.contract_version || 1}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span className={statusClass(selected.status)}>{statusLabel(selected.status)}</span>
                  <span className="pill">Chat: {selected.chat_status === "CLOSED" ? "Cerrado" : "Abierto"}</span>
                  {selected.status === "SIGNED" && (
                    <button className="btn btn--primary btn--sm" onClick={() => void onApproveAssignment()} disabled={approving}>
                      {approving ? "Aprobando..." : "Aprobar PDF"}
                    </button>
                  )}
                  {selected.status === "APPROVED" && (
                    <button className="btn btn--soft btn--sm" onClick={() => void onDownloadPdf()} disabled={downloadingPdf}>
                      {downloadingPdf ? "Preparando..." : "Descargar PDF"}
                    </button>
                  )}
                  <button className="btn btn--ghost btn--sm" onClick={() => void onToggleChatStatus()}>
                    {selected.chat_status === "CLOSED" ? "Reabrir chat" : "Cerrar chat"}
                  </button>
                </div>
              </div>

              <div className="seg" style={{ width: "fit-content", marginBottom: 12 }}>
                {(["chat", "documento", "datos", "ia", "actividad"] as DetailTab[]).map((tab) => (
                  <button
                    key={tab}
                    className={`seg__btn ${activeTab === tab ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {selected.status === "SIGNED" && (
                <div className="note" style={{ borderColor: "rgba(214,178,94,.35)", marginBottom: 12 }}>
                  <div className="note__title">Pendiente de aprobación</div>
                  <div className="note__text">
                    El cliente ya firmó el contrato. Revisa el documento y aprueba para generar el PDF final.
                  </div>
                  <button
                    className="btn btn--primary btn--sm"
                    style={{ marginTop: 10 }}
                    onClick={() => void onApproveAssignment()}
                    disabled={approving}
                  >
                    {approving ? "Aprobando..." : "Aprobar y generar PDF"}
                  </button>
                </div>
              )}

              {selected.status === "APPROVED" && (
                <div className="note" style={{ borderColor: "rgba(43,182,115,.35)", marginBottom: 12 }}>
                  <div className="note__title">PDF final disponible</div>
                  <div className="note__text">
                    Aprobado por {selected.approval?.by_name || "Administración"} · {formatDate(selected.approval?.at)}
                  </div>
                  <button
                    className="btn btn--soft btn--sm"
                    style={{ marginTop: 10 }}
                    onClick={() => void onDownloadPdf()}
                    disabled={downloadingPdf}
                  >
                    {downloadingPdf ? "Preparando..." : "Descargar PDF final"}
                  </button>
                </div>
              )}

              {loadingDetail ? (
                <div className="muted small">Cargando expediente...</div>
              ) : activeTab === "chat" ? (
                <div className="conversation-panel">
                  <div className="chat-thread">
                    {(selected.events || []).map((event) => (
                      <div className="chat__bubble chat__bubble--sys" key={event.id}>
                        {eventLabel(event.type)} · {formatDate(event.at)}
                      </div>
                    ))}

                    {messages.length === 0 ? (
                      <div className="muted small">Aún no hay mensajes en este expediente.</div>
                    ) : (
                      messages.map((message) => {
                        const isAdmin = message.sender_role === "ADMIN";
                        return (
                          <div
                            key={message.id}
                            className={`chat-message ${isAdmin ? "chat-message--mine" : "chat-message--other"}`}
                          >
                            <div className="strong small">{isAdmin ? "Admin" : message.sender_name || "Cliente"}</div>
                            <div style={{ marginTop: 4 }}>{message.text}</div>
                            <div className="muted small" style={{ marginTop: 6 }}>
                              {formatDate(message.created_at)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form className="chat__composer" onSubmit={onSendMessage}>
                    <input
                      className="control"
                      type="text"
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      placeholder={selected.chat_status === "CLOSED" ? "Chat cerrado" : "Escribe un mensaje al cliente..."}
                      disabled={sending || selected.chat_status === "CLOSED"}
                    />
                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={sending || selected.chat_status === "CLOSED" || !composer.trim()}
                    >
                      Enviar
                    </button>
                  </form>
                </div>
              ) : activeTab === "documento" ? (
                <div className="note document-viewer">
                  {selected.resolved_html_snapshot ? (
                    <div
                      className="document-page"
                      dangerouslySetInnerHTML={{ __html: selected.resolved_html_snapshot }}
                    />
                  ) : (
                    <div className="note__text">No hay preview disponible.</div>
                  )}
                </div>
              ) : activeTab === "datos" ? (
                <div className="detail-stack">
                  <div className="note">
                    <div className="note__title">Evidencia de firma</div>
                    <div className="note__text">
                      {selected.signature?.hash ? (
                        <>
                          <div>
                            <span className="gold">Firmado:</span> {formatDate(selected.signed_at)}
                          </div>
                          <div>
                            <span className="gold">Hash de firma:</span> {selected.signature.hash}
                          </div>
                          <div>
                            <span className="gold">Archivo:</span> {selected.signature.storage_path || "-"}
                          </div>
                        </>
                      ) : (
                        "El cliente aún no ha firmado este contrato."
                      )}
                    </div>
                  </div>

                  <div className="note">
                    <div className="note__title">PDF final</div>
                    <div className="note__text">
                      {selected.approval?.pdf?.hash ? (
                        <>
                          <div>
                            <span className="gold">Aprobado:</span> {formatDate(selected.approval.at)}
                          </div>
                          <div>
                            <span className="gold">Hash del PDF:</span> {selected.approval.pdf.hash}
                          </div>
                          <div>
                            <span className="gold">Archivo:</span> {selected.approval.pdf.storage_path || "-"}
                          </div>
                        </>
                      ) : (
                        "El PDF final se generará cuando administración apruebe un contrato firmado."
                      )}
                    </div>
                  </div>

                  <div className="note">
                    <div className="note__title">Datos del contrato</div>
                    <div className="note__text">
                      {Object.entries(selected.placeholders_company_values || {}).length === 0
                        ? "Sin datos de empresa capturados."
                        : Object.entries(selected.placeholders_company_values || {}).map(([key, value]) => (
                            <div key={key}>
                              <span className="gold">{placeholderLabel(key)}:</span> {String(value || "-")}
                            </div>
                          ))}
                    </div>
                  </div>

                  <div className="note">
                    <div className="note__title">Datos del cliente usados</div>
                    <div className="note__text">
                      {Object.entries(selected.placeholders_employee_snapshot || {}).map(([key, value]) => (
                        <div key={key}>
                          <span className="gold">{key}:</span> {String(value || "-")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeTab === "ia" ? (
                <div className="detail-stack">
                  <div className="note">
                    <div className="note__title">Asistente IA administrativo</div>
                    <div className="note__text">
                      Úsalo para resumir el contrato, ubicar cláusulas o revisar qué debe confirmar el cliente antes de firmar.
                    </div>
                  </div>

                  <form className="form-grid" onSubmit={onAskAi}>
                    <textarea
                      className="control"
                      rows={4}
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder="Pregunta sobre este expediente..."
                    />
                    <button className="btn btn--primary" type="submit" disabled={askingAi || !aiQuestion.trim()}>
                      {askingAi ? "Pensando..." : "Preguntar"}
                    </button>
                  </form>

                  {aiAnswer && (
                    <div className="chat__bubble" style={{ whiteSpace: "pre-wrap" }}>
                      {aiAnswer}
                    </div>
                  )}
                </div>
              ) : (
                <div className="log">
                  {(selected.events || []).length === 0 ? (
                    <div className="muted small">Sin actividad registrada.</div>
                  ) : (
                    selected.events?.map((event) => (
                      <div className="log__item" key={event.id}>
                        <span className={`log__dot ${event.type === "APPROVED" ? "log__dot--ok" : "log__dot--gold"}`} />
                        <div className="log__body">
                          <div className="strong">{eventLabel(event.type)}</div>
                          <div className="muted small">
                            {eventHint(event.type)} · {event.by_name || "Sistema"}
                          </div>
                        </div>
                        <div className="muted small">{formatDate(event.at)}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </article>
      </section>

      <div
        className={`modal-overlay ${isModalOpen ? "is-visible" : ""}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeAssignModal();
        }}
      >
        <div className="modal card" style={{ maxWidth: 760 }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <h2 className="card__title">Nuevo expediente</h2>
            <button className="icon-btn icon-btn--sm" onClick={closeAssignModal} aria-label="Cerrar" disabled={creating}>
              X
            </button>
          </div>

          <div className="modal__body">
            <form className="form-grid" onSubmit={onCreateAssignment}>
              <div className="grid-2">
                <label className="field">
                  <span className="field__label">Cliente *</span>
                  <select
                    className="control"
                    value={assignForm.client_id}
                    onChange={(e) => {
                      setAssignForm((prev) => ({ ...prev, client_id: e.target.value }));
                      setPrecheck(null);
                    }}
                    required
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} · {client.email}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Plantilla *</span>
                  <select
                    className="control"
                    value={assignForm.contract_id}
                    onChange={(e) => {
                      const contract = contracts.find((item) => item.id === e.target.value);
                      setAssignForm((prev) => ({
                        ...prev,
                        contract_id: e.target.value,
                        contract_version: contract?.current_version || 1,
                      }));
                      setPrecheck(null);
                      setCompanyValues({});
                    }}
                    required
                  >
                    <option value="">Seleccionar plantilla</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.title} · {contract.position} · v{contract.current_version || 1}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field">
                <span className="field__label">Mensaje inicial</span>
                <textarea
                  className="control"
                  rows={3}
                  value={assignForm.initial_message}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, initial_message: e.target.value }))}
                />
              </label>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" className="btn btn--soft" onClick={() => void runPrecheck()} disabled={prechecking}>
                  {prechecking ? "Validando..." : "Validar datos"}
                </button>
                {precheck && <span className="muted small">Versión validada: {precheck.version}</span>}
              </div>

              {precheck && (
                <div style={{ display: "grid", gap: 12 }}>
                  {precheck.missing_employee_placeholders.length > 0 && (
                    <div className="note">
                      <div className="note__title text-danger">Faltan datos del cliente</div>
                      <div className="note__text">
                        {precheck.missing_employee_placeholders.map(placeholderLabel).join(", ")}
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ marginTop: 10 }}
                        onClick={() => void onRequestProfileUpdate()}
                        disabled={prechecking}
                      >
                        Solicitar actualización
                      </button>
                    </div>
                  )}

                  {precheck.required_company_placeholders.length > 0 ? (
                    <div className="note">
                      <div className="note__title">Datos del contrato</div>
                      <div className="form-grid" style={{ marginTop: 12 }}>
                        {precheck.required_company_placeholders.map((key) => (
                          <label className="field" key={key}>
                            <span className="field__label">{placeholderLabel(key)} *</span>
                            <input
                              className="control"
                              value={companyValues[key] || ""}
                              onChange={(e) =>
                                setCompanyValues((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              required
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="note">
                      <div className="note__title">Sin datos adicionales</div>
                      <div className="note__text">La plantilla no requiere placeholders de empresa.</div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal__footer" style={{ padding: 0, borderTop: 0, background: "transparent" }}>
                <button type="button" className="btn btn--ghost" onClick={closeAssignModal} disabled={creating}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={creating || prechecking}>
                  {creating ? "Creando..." : precheck ? "Crear expediente" : "Validar primero"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

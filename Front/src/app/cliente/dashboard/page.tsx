"use client";

import {
  askClientAssignmentAi,
  createClientSignatureToken,
  getClientAssignment,
  getClientAssignmentPdf,
  getClientAssignmentSignature,
  getClientProfile,
  listClientAssignmentMessages,
  listClientAssignments,
  markClientAssignmentViewed,
  sendClientAssignmentMessage,
  signClientAssignment,
  updateClientProfile,
  type AdminUser,
  type AssignmentMessage,
  type AssignmentSummary,
  type ClientProfileInput,
  type SignatureTokenLink,
} from "@/lib/api";
import { getToken, getUser, logout, updateSessionUser, type SessionUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type DetailTab = "chat" | "documento" | "firmar" | "ia" | "actividad";

const AI_SUGGESTIONS = [
  "Resume los puntos importantes antes de firmar",
  "Explícame salario, jornada y fechas",
  "¿Qué obligaciones debo revisar con cuidado?",
  "¿Hay algo que deba confirmar con administración?",
];

const EMPTY_PROFILE_FORM: ClientProfileInput = {
  rfc: "",
  curp: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  address_country: "MX",
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
    ASSIGNED: "Pendiente",
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

function initials(name?: string | null) {
  const parts = String(name || "CL").trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function canSign(assignment: AssignmentSummary | null) {
  return assignment?.chat_status !== "CLOSED" && (assignment?.status === "ASSIGNED" || assignment?.status === "VIEWED");
}

export default function ClienteDashboardPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);

  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [selected, setSelected] = useState<AssignmentSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssignmentMessage[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>("chat");
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [profileForm, setProfileForm] = useState<ClientProfileInput>(EMPTY_PROFILE_FORM);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [composer, setComposer] = useState("");
  const [aiQuestion, setAiQuestion] = useState("¿Qué significa esta parte del contrato?");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiSnippets, setAiSnippets] = useState<string[]>([]);
  const [signatureImageUrl, setSignatureImageUrl] = useState("");
  const [signatureImageFailed, setSignatureImageFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [askingAi, setAskingAi] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [signatureLink, setSignatureLink] = useState<SignatureTokenLink | null>(null);
  const [signatureDirty, setSignatureDirty] = useState(false);
  const [signing, setSigning] = useState(false);
  const [creatingSignatureLink, setCreatingSignatureLink] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfDialog, setPdfDialog] = useState<{ title: string; message: string; url?: string } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  function profileToForm(userProfile: AdminUser): ClientProfileInput {
    return {
      rfc: userProfile.rfc || "",
      curp: userProfile.curp || "",
      phone: userProfile.phone || "",
      address_line1: userProfile.address_line1 || "",
      address_line2: userProfile.address_line2 || "",
      address_city: userProfile.address_city || "",
      address_state: userProfile.address_state || "",
      address_zip: userProfile.address_zip || "",
      address_country: userProfile.address_country || "MX",
    };
  }

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);

    try {
      const data = await getClientProfile();
      setProfile(data);
      setProfileForm(profileToForm(data));
      updateSessionUser({
        name: data.name,
        email: data.email,
        role: data.role,
        profile_completed: data.profile_completed,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string, markViewed = false) => {
    setLoadingDetail(true);
    setError("");
    setNotice("");

    try {
      let assignment = await getClientAssignment(id);
      if (markViewed && assignment.status === "ASSIGNED") {
        assignment = await markClientAssignmentViewed(id);
      }

      const rows = await listClientAssignmentMessages(id);
      if (selectedIdRef.current !== id) {
        setSignatureLink(null);
        setAiAnswer("");
        setAiSnippets([]);
        setSignatureImageUrl("");
        setSignatureImageFailed(false);
      }
      selectedIdRef.current = id;
      setSelectedId(id);
      setSelected(assignment);
      setMessages(rows);

      if (assignment.signature?.storage_path) {
        try {
          const signature = await getClientAssignmentSignature(id);
          if (selectedIdRef.current === id) {
            setSignatureImageUrl(signature.url);
            setSignatureImageFailed(false);
          }
        } catch {
          if (selectedIdRef.current === id) {
            setSignatureImageUrl("");
            setSignatureImageFailed(true);
          }
        }
      } else {
        setSignatureImageUrl("");
        setSignatureImageFailed(false);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadAssignments = useCallback(async (preferredId?: string) => {
    setLoadingList(true);
    setError("");

    try {
      const rows = await listClientAssignments();
      setAssignments(rows);

      const nextId = preferredId || selectedIdRef.current || rows[0]?.id || null;
      selectedIdRef.current = nextId;
      setSelectedId(nextId);

      if (nextId) await loadDetail(nextId);
      else {
        setSelected(null);
        setMessages([]);
        setSignatureImageUrl("");
        setSignatureImageFailed(false);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  }, [loadDetail]);

  useEffect(() => {
    const token = getToken();
    const sessionUser = getUser();

    if (!token || !sessionUser) {
      router.replace("/login");
      return;
    }

    setSessionUser(sessionUser);

    if (sessionUser.role !== "CLIENT") {
      router.replace("/");
      return;
    }

    void loadAssignments();
    void loadProfile();
  }, [loadAssignments, loadProfile, router]);

  useEffect(() => {
    if (!isSignatureOpen) return;
    const frame = requestAnimationFrame(() => setupSignatureCanvas());
    return () => cancelAnimationFrame(frame);
  }, [isSignatureOpen]);

  const totals = useMemo(() => {
    return {
      pending: assignments.filter((item) => item.status === "ASSIGNED" || item.status === "VIEWED").length,
      signed: assignments.filter((item) => item.status === "SIGNED").length,
      approved: assignments.filter((item) => item.status === "APPROVED").length,
    };
  }, [assignments]);

  const qrImageUrl = useMemo(() => {
    if (!signatureLink?.link) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(signatureLink.link)}`;
  }, [signatureLink]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function openProfileModal() {
    setError("");
    setNotice("");
    if (profile) setProfileForm(profileToForm(profile));
    setIsProfileOpen(true);
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setNotice("");

    try {
      const updated = await updateClientProfile({
        ...profileForm,
        rfc: profileForm.rfc.trim().toUpperCase(),
        curp: profileForm.curp.trim().toUpperCase(),
        phone: profileForm.phone.trim(),
        address_country: profileForm.address_country.trim().toUpperCase() || "MX",
      });

      setProfile(updated);
      setProfileForm(profileToForm(updated));
      updateSessionUser({
        name: updated.name,
        email: updated.email,
        role: updated.role,
        profile_completed: updated.profile_completed,
      });
      setSessionUser((current) =>
        current
          ? {
              ...current,
              name: updated.name,
              email: updated.email,
              role: updated.role,
              profile_completed: updated.profile_completed,
            }
          : current
      );
      setIsProfileOpen(false);
      setNotice("Perfil actualizado. Ya puedes continuar con contratos que dependan de tus datos.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  function setupSignatureCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.floor(190 * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, 190);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }

  function pointerPosition(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function beginSignature(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = event.currentTarget;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const point = pointerPosition(event);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function drawSignature(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();

    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;

    const point = pointerPosition(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setSignatureDirty(true);
  }

  function endSignature(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();
    drawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function clearSignature() {
    setupSignatureCanvas();
    setSignatureDirty(false);
  }

  function openSignatureModal() {
    setError("");
    setNotice("");
    setSignatureDirty(false);
    setIsSignatureOpen(true);
  }

  async function onSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!selected || !composer.trim()) return;

    setSending(true);
    setError("");

    try {
      await sendClientAssignmentMessage(selected.id, composer.trim());
      setComposer("");
      await loadDetail(selected.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function onSign() {
    if (!selected || !canvasRef.current) return;
    if (!signatureDirty) {
      setError("Dibuja tu firma antes de continuar.");
      return;
    }

    setSigning(true);
    setError("");
    setNotice("");

    try {
      const updated = await signClientAssignment(selected.id, {
        signature_png_base64: canvasRef.current.toDataURL("image/png"),
        signature_bbox: {
          x: 80,
          y: 650,
          width: 220,
          height: 90,
          page: 1,
        },
      });

      setSelected(updated);
      setIsSignatureOpen(false);
      setNotice("Contrato firmado. Administración podrá aprobarlo y generar el PDF final.");
      await loadAssignments(updated.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSigning(false);
    }
  }

  async function onCreateMobileSignatureLink() {
    if (!selected) return;

    setCreatingSignatureLink(true);
    setError("");
    setNotice("");

    try {
      const data = await createClientSignatureToken(selected.id);
      setSignatureLink(data);
      setNotice("QR generado. El enlace expira en 10 minutos y solo se puede usar una vez.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreatingSignatureLink(false);
    }
  }

  async function onAskAi(e: FormEvent) {
    e.preventDefault();
    if (!selected || !aiQuestion.trim()) return;

    setAskingAi(true);
    setError("");

    try {
      const data = await askClientAssignmentAi(selected.id, aiQuestion.trim());
      setAiAnswer(data.answer);
      setAiSnippets(data.snippets || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAskingAi(false);
    }
  }

  async function onDownloadPdf() {
    if (!selected) return;

    setDownloading(true);
    setError("");
    setNotice("");
    setPdfDialog(null);

    const pdfWindow = window.open("", "_blank");

    try {
      const data = await getClientAssignmentPdf(selected.id);
      if (pdfWindow) {
        pdfWindow.location.href = data.url;
      } else {
        setPdfDialog({
          title: "Descarga bloqueada",
          message:
            "El navegador bloqueó la ventana del PDF. Puedes abrirlo desde este aviso para conservar una experiencia controlada.",
          url: data.url,
        });
      }
    } catch (err) {
      pdfWindow?.close();
      setPdfDialog({
        title: "No se pudo abrir el PDF",
        message: getErrorMessage(err),
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="app client-portal">
      <section className="main client-shell">
        <header className="topbar client-topbar">
          <div className="topbar__left">
            <h1 className="title">Mis contratos</h1>
            <p className="subtitle">Revisa, conversa con administración y firma tus contratos asignados.</p>
          </div>

          <div className="topbar__right">
            <span className="pill">{profile?.name || sessionUser?.name || "Cliente"}</span>
            <button className="btn btn--soft" onClick={openProfileModal} disabled={loadingProfile}>
              Mi perfil
            </button>
            <button className="btn btn--ghost" onClick={() => void loadAssignments()} disabled={loadingList}>
              Actualizar
            </button>
            <button className="btn btn--ghost" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </header>

        {profile && !profile.profile_completed && (
          <section className="card client-alert" style={{ padding: 12 }}>
            <div className="muted small">
              Tu perfil está incompleto. Actualiza tus datos legales para que administración pueda asignarte contratos sin pendientes.
            </div>
          </section>
        )}

        {(error || notice) && (
          <section className="card client-alert" style={{ padding: 12 }}>
            {error && <div className="muted small text-danger">{error}</div>}
            {notice && <div className="muted small">{notice}</div>}
          </section>
        )}

        <section className="grid workspace-grid client-workspace">
          <article className="card workspace-sidebar client-inbox" style={{ gridColumn: "1 / span 4", minHeight: 680 }}>
            <div className="card__title-row">
              <h2 className="card__title">Bandeja</h2>
              <span className="chip">{assignments.length}</span>
            </div>

            <div className="hero__stats client-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 12 }}>
              <div className="stat">
                <div className="stat__label">Pendientes</div>
                <div className="stat__value">{totals.pending}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Firmados</div>
                <div className="stat__value">{totals.signed}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Finalizados</div>
                <div className="stat__value">{totals.approved}</div>
              </div>
            </div>

            <div className="client-contract-list" style={{ display: "grid", gap: 10 }}>
              {loadingList ? (
                <div className="muted small">Cargando contratos...</div>
              ) : assignments.length === 0 ? (
                <div className="note">
                  <div className="note__title">Sin contratos</div>
                  <div className="note__text">Cuando administración te asigne un contrato, aparecerá aquí.</div>
                </div>
              ) : (
                assignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    type="button"
                    className={`tile client-contract-card ${selectedId === assignment.id ? "is-selected" : ""}`}
                    onClick={() => void loadDetail(assignment.id, true)}
                    style={{
                      textAlign: "left",
                      cursor: "pointer",
                      borderColor: selectedId === assignment.id ? "var(--goldGlow)" : "var(--stroke2)",
                    }}
                  >
                    <div className="cell-main">
                      <div className="avatar">{initials(assignment.contract_title)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="strong">{assignment.contract_title || "Contrato asignado"}</div>
                        <div className="muted small">Versión {assignment.contract_version || 1}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, gap: 8 }}>
                      <span className={statusClass(assignment.status)}>{statusLabel(assignment.status)}</span>
                      <span className="muted small">{formatDate(assignment.updated_at || assignment.created_at)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="card workspace-detail client-detail" style={{ gridColumn: "5 / span 8", minHeight: 680 }}>
            {!selected ? (
              <div className="note client-empty-state">
                <div className="note__title">Selecciona un contrato</div>
                <div className="note__text">Aquí podrás revisar el documento, resolver dudas y firmarlo.</div>
              </div>
            ) : (
              <>
                <div className="card__title-row client-detail__head">
                  <div className="cell-main">
                    <div className="avatar">{initials(selected.contract_title)}</div>
                    <div>
                      <h2 className="card__title" style={{ marginBottom: 3 }}>
                        {selected.contract_title || "Contrato"}
                      </h2>
                      <div className="muted small">
                        Asignado por {selected.assigned_by_name || "Administración"} · v{selected.contract_version || 1}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span className={statusClass(selected.status)}>{statusLabel(selected.status)}</span>
                    <span className="pill">Chat: {selected.chat_status === "CLOSED" ? "Cerrado" : "Abierto"}</span>
                  </div>
                </div>

                <div className="seg client-detail__tabs" style={{ width: "fit-content", marginBottom: 12 }}>
                  {(["chat", "documento", "firmar", "ia", "actividad"] as DetailTab[]).map((tab) => (
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

                {loadingDetail ? (
                  <div className="muted small">Cargando contrato...</div>
                ) : activeTab === "chat" ? (
                  <div className="conversation-panel client-conversation">
                    <div className="chat-thread">
                      {(selected.events || []).map((event) => (
                        <div className="chat__bubble chat__bubble--sys" key={event.id}>
                          {event.type} · {formatDate(event.at)}
                        </div>
                      ))}

                      {messages.length === 0 ? (
                        <div className="muted small">Aún no hay mensajes en este contrato.</div>
                      ) : (
                        messages.map((message) => {
                          const isClient = message.sender_role === "CLIENT";
                          return (
                            <div
                              key={message.id}
                              className={`chat-message ${isClient ? "chat-message--mine" : "chat-message--other"}`}
                            >
                              <div className="strong small">{isClient ? "Tú" : message.sender_name || "Admin"}</div>
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
                        placeholder={selected.chat_status === "CLOSED" ? "Chat cerrado" : "Pregunta o comenta sobre el contrato..."}
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
                  <div className="note document-viewer client-document-viewer">
                    {selected.resolved_html_snapshot ? (
                      <div className={`document-page ${signatureImageUrl ? "document-page--signed" : ""}`}>
                        <div dangerouslySetInnerHTML={{ __html: selected.resolved_html_snapshot }} />

                        {(signatureImageUrl || signatureImageFailed) && (
                          <section className="document-signature-section" aria-label="Firma digital del empleado">
                            <div className="document-signature-heading">Firma digital del empleado</div>
                            <div className="document-signature-line" />
                            <div className="document-signature">
                            {signatureImageUrl && !signatureImageFailed ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={signatureImageUrl}
                                alt="Firma digital plasmada en el contrato"
                                onError={() => setSignatureImageFailed(true)}
                              />
                            ) : (
                              <div className="document-signature__fallback">
                                Firma registrada
                              </div>
                            )}
                            <div className="document-signature__meta">
                              <span>Firmado digitalmente</span>
                              <small>{formatDate(selected.signed_at)}</small>
                            </div>
                            </div>
                            <div className="document-signature-hash">
                              Hash: {selected.signature?.hash || "registrado"}
                            </div>
                          </section>
                        )}
                      </div>
                    ) : (
                      <div className="note__text">No hay preview disponible.</div>
                    )}
                  </div>
                ) : activeTab === "firmar" ? (
                  <div className="detail-stack client-sign-flow">
                    <div className="note">
                      <div className="note__title">Firma del contrato</div>
                      <div className="note__text">
                        {selected.status === "APPROVED"
                          ? "Tu contrato ya fue aprobado. Puedes descargar el PDF final."
                          : selected.status === "SIGNED"
                          ? "Tu firma fue enviada. Administración debe aprobar el contrato para generar el PDF final."
                          : selected.chat_status === "CLOSED"
                          ? "El chat está cerrado; no es posible firmar este contrato por ahora."
                          : "Cuando estés de acuerdo con el contenido, firma con el dedo o mouse."}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="btn btn--primary" onClick={openSignatureModal} disabled={!canSign(selected)}>
                        Firmar aquí
                      </button>
                      <button
                        className="btn btn--soft"
                        onClick={() => void onCreateMobileSignatureLink()}
                        disabled={!canSign(selected) || creatingSignatureLink}
                      >
                        {creatingSignatureLink ? "Generando..." : "Firmar con celular"}
                      </button>
                      <button
                        className="btn btn--ghost"
                        onClick={() => void onDownloadPdf()}
                        disabled={downloading || selected.status !== "APPROVED"}
                      >
                        {downloading ? "Preparando..." : "Descargar PDF"}
                      </button>
                    </div>

                    {signatureLink && (
                      <div className="qr-box client-qr-box" style={{ alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: 132,
                            height: 132,
                            borderRadius: 16,
                            overflow: "hidden",
                            background: "#fff",
                            padding: 8,
                            flex: "0 0 auto",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrImageUrl}
                            alt="QR para firmar desde celular"
                            width={116}
                            height={116}
                            style={{ display: "block" }}
                          />
                        </div>
                        <div className="qr-meta">
                          <div className="strong">Escanea para firmar</div>
                          <div className="muted small" style={{ marginTop: 6 }}>
                            Expira: {formatDate(signatureLink.expires_at)}
                          </div>
                          <div className="qr-actions">
                            <a className="btn btn--ghost btn--sm" href={signatureLink.link} target="_blank" rel="noreferrer">
                              Abrir enlace
                            </a>
                            <button
                              className="btn btn--ghost btn--sm"
                              type="button"
                              onClick={() => void navigator.clipboard?.writeText(signatureLink.link)}
                            >
                              Copiar link
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeTab === "ia" ? (
                  <div className="client-ai">
                    <section className="client-ai__hero">
                      <div>
                        <div className="eyebrow">Asistente de lectura</div>
                        <h3>Resuelve dudas antes de firmar</h3>
                        <p>
                          La IA revisa el texto renderizado de este contrato y te señala fragmentos relacionados. Sus respuestas son orientativas.
                        </p>
                      </div>
                      <span className="chip chip--ok">Contrato v{selected.contract_version || 1}</span>
                    </section>

                    <section className="client-ai__grid">
                      <div className="client-ai__panel">
                        <div className="note__title">Preguntas rápidas</div>
                        <div className="client-ai__suggestions">
                          {AI_SUGGESTIONS.map((question) => (
                            <button
                              key={question}
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => setAiQuestion(question)}
                            >
                              {question}
                            </button>
                          ))}
                        </div>

                        <form className="client-ai__form" onSubmit={onAskAi}>
                          <label className="field">
                            <span className="field__label">Tu duda</span>
                            <textarea
                              className="control"
                              rows={5}
                              value={aiQuestion}
                              onChange={(e) => setAiQuestion(e.target.value)}
                              placeholder="Ej. ¿qué significa la cláusula de confidencialidad?"
                            />
                          </label>
                          <button className="btn btn--primary" type="submit" disabled={askingAi || !aiQuestion.trim()}>
                            {askingAi ? "Buscando en el contrato..." : "Preguntar a la IA"}
                          </button>
                        </form>
                      </div>

                      <div className="client-ai__answer">
                        <div className="card__title-row">
                          <h3 className="card__title">Respuesta</h3>
                          <span className="badge badge--sign">Orientativa</span>
                        </div>

                        {aiAnswer ? (
                          <>
                            <div className="client-ai__bubble">{aiAnswer}</div>
                            {aiSnippets.length > 0 && (
                              <div className="client-ai__snippets">
                                <div className="note__title">Partes encontradas</div>
                                {aiSnippets.map((snippet) => (
                                  <blockquote key={snippet}>{snippet}</blockquote>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="client-ai__empty">
                            Haz una pregunta o elige una sugerencia para que el asistente busque dentro de tu contrato.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="log">
                    {(selected.events || []).length === 0 ? (
                      <div className="muted small">Sin actividad registrada.</div>
                    ) : (
                      selected.events?.map((event) => (
                        <div className="log__item" key={event.id}>
                          <span className="log__dot log__dot--gold" />
                          <div className="log__body">
                            <div className="strong">{event.type}</div>
                            <div className="muted small">{event.by_name || "Sistema"}</div>
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
      </section>

      <div
        className={`modal-overlay ${isProfileOpen ? "is-visible" : ""}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !savingProfile) setIsProfileOpen(false);
        }}
      >
        <div className="modal card" style={{ maxWidth: 760 }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <h2 className="card__title">Mi perfil</h2>
            <button
              className="icon-btn icon-btn--sm"
              onClick={() => setIsProfileOpen(false)}
              aria-label="Cerrar"
              disabled={savingProfile}
            >
              X
            </button>
          </div>

          <form onSubmit={onSaveProfile}>
            <div className="modal__body">
              <div className="note" style={{ marginTop: 0 }}>
                <div className="note__title">Datos para contratos</div>
                <div className="note__text">
                  Estos datos se usan para llenar automáticamente tus contratos asignados.
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="grid-2">
                  <label className="field">
                    <span className="field__label">RFC *</span>
                    <input
                      className="control"
                      value={profileForm.rfc}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">CURP *</span>
                    <input
                      className="control"
                      value={profileForm.curp}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, curp: e.target.value.toUpperCase() }))}
                      required
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="field__label">Teléfono *</span>
                  <input
                    className="control"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    placeholder="10 dígitos"
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Dirección *</span>
                  <input
                    className="control"
                    value={profileForm.address_line1}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, address_line1: e.target.value }))}
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Dirección 2</span>
                  <input
                    className="control"
                    value={profileForm.address_line2 || ""}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, address_line2: e.target.value }))}
                  />
                </label>

                <div className="grid-2">
                  <label className="field">
                    <span className="field__label">Ciudad *</span>
                    <input
                      className="control"
                      value={profileForm.address_city}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, address_city: e.target.value }))}
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Estado *</span>
                    <input
                      className="control"
                      value={profileForm.address_state}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, address_state: e.target.value }))}
                      required
                    />
                  </label>
                </div>

                <div className="grid-2">
                  <label className="field">
                    <span className="field__label">Código postal *</span>
                    <input
                      className="control"
                      value={profileForm.address_zip}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, address_zip: e.target.value }))}
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">País *</span>
                    <input
                      className="control"
                      value={profileForm.address_country}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, address_country: e.target.value.toUpperCase() }))}
                      required
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="modal__footer">
              <button className="btn btn--ghost" type="button" onClick={() => setIsProfileOpen(false)} disabled={savingProfile}>
                Cancelar
              </button>
              <button className="btn btn--primary" type="submit" disabled={savingProfile}>
                {savingProfile ? "Guardando..." : "Guardar perfil"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div
        className={`modal-overlay ${isSignatureOpen ? "is-visible" : ""}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !signing) setIsSignatureOpen(false);
        }}
      >
        <div className="modal card" style={{ maxWidth: 700 }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <h2 className="card__title">Firma digital</h2>
            <button
              className="icon-btn icon-btn--sm"
              onClick={() => setIsSignatureOpen(false)}
              aria-label="Cerrar"
              disabled={signing}
            >
              X
            </button>
          </div>

          <div className="modal__body">
            <div className="note" style={{ marginTop: 0 }}>
              <div className="note__title">Dibuja tu firma</div>
              <div className="note__text">Usa el dedo en móvil o el mouse en computadora.</div>
            </div>

            <canvas
              ref={canvasRef}
              onPointerDown={beginSignature}
              onPointerMove={drawSignature}
              onPointerUp={endSignature}
              onPointerCancel={endSignature}
              style={{
                width: "100%",
                height: 190,
                marginTop: 12,
                display: "block",
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid var(--stroke2)",
                touchAction: "none",
              }}
            />
          </div>

          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={clearSignature} disabled={signing}>
              Limpiar
            </button>
            <button className="btn btn--primary" onClick={() => void onSign()} disabled={signing || !signatureDirty}>
              {signing ? "Firmando..." : "Confirmar firma"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay ${pdfDialog ? "is-visible" : ""}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setPdfDialog(null);
        }}
      >
        <div className="modal card client-pdf-modal" style={{ maxWidth: 520 }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <h2 className="card__title">{pdfDialog?.title || "PDF"}</h2>
            <button
              className="icon-btn icon-btn--sm"
              onClick={() => setPdfDialog(null)}
              aria-label="Cerrar"
            >
              X
            </button>
          </div>
          <div className="modal__body">
            <div className="note" style={{ marginTop: 0 }}>
              <div className="note__text">{pdfDialog?.message}</div>
            </div>
          </div>
          <div className="modal__footer">
            <button className="btn btn--ghost" type="button" onClick={() => setPdfDialog(null)}>
              Cerrar
            </button>
            {pdfDialog?.url && (
              <a className="btn btn--primary" href={pdfDialog.url} target="_blank" rel="noreferrer">
                Abrir PDF
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

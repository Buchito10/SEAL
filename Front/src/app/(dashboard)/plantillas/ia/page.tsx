"use client";

import {
  createAdminAiChat,
  getContractVersionTemplate,
  listAdminAiChats,
  listAdminAiMessages,
  listContracts,
  publishAdminAiChatToContract,
  saveAdminAiHumanEdit,
  sendAdminAiMessage,
  type AdminAiChat,
  type AdminAiMessage,
  type AdminContract,
} from "@/lib/api";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const EMPTY_PUBLISH = {
  title: "",
  area: "General",
  position: "",
};

const QUICK_PROMPTS = [
  {
    title: "Contrato indefinido",
    text: "Genera una plantilla laboral por tiempo indefinido para Desarrollador Backend.",
  },
  {
    title: "Contrato temporal",
    text: "Genera una plantilla laboral por tiempo determinado con fecha de inicio, fecha de fin, salario, jornada y firmas.",
  },
  {
    title: "Mejorar una base",
    text: "Mejora la plantilla seleccionada, conserva placeholders válidos y hazla más clara para el cliente.",
  },
  {
    title: "Placeholders",
    text: "Explícame qué placeholders puedo usar para esta plantilla y cuándo conviene usar cada uno.",
  },
];

type StudioMode = "chat" | "viewer";

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

export default function PlantillasIaPage() {
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [chats, setChats] = useState<AdminAiChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminAiMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [selectedContractId, setSelectedContractId] = useState("");
  const [contextForm, setContextForm] = useState({
    title_hint: "Contrato laboral",
    area: "General",
    position: "Por definir",
    jurisdiction: "MX",
    language: "es-MX",
  });
  const [templateHtml, setTemplateHtml] = useState("");
  const [reviewHtml, setReviewHtml] = useState("");
  const [editNote, setEditNote] = useState("");
  const [publishForm, setPublishForm] = useState(EMPTY_PUBLISH);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mode, setMode] = useState<StudioMode>("chat");

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) || null,
    [contracts, selectedContractId]
  );

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || null,
    [activeChatId, chats]
  );

  const canPublish =
    Boolean(activeChatId) &&
    Boolean(templateHtml.trim()) &&
    Boolean(reviewHtml.trim()) &&
    Boolean(publishForm.title.trim()) &&
    Boolean(publishForm.area.trim()) &&
    Boolean(publishForm.position.trim()) &&
    editNote.trim().length >= 20;

  async function loadInitial() {
    setLoading(true);
    setError("");

    try {
      const [contractRows, chatRows] = await Promise.all([listContracts(), listAdminAiChats()]);
      setContracts(contractRows);
      setChats(chatRows);

      const [firstChat] = chatRows;
      if (firstChat) {
        setActiveChatId(firstChat.id);
        setTemplateHtml(firstChat.ai_last_template_html || "");
        setReviewHtml(firstChat.ai_last_template_html || "");
        setPublishForm({
          title: firstChat.title_hint || "Plantilla generada con IA",
          area: firstChat.area || "General",
          position: firstChat.position || "Por definir",
        });
        const rows = await listAdminAiMessages(firstChat.id);
        setMessages(rows);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInitial();
  }, []);

  async function selectChat(chat: AdminAiChat) {
    setActiveChatId(chat.id);
    setTemplateHtml(chat.ai_last_template_html || "");
    setReviewHtml(chat.ai_last_template_html || "");
    setPublishForm({
      title: chat.title_hint || "Plantilla generada con IA",
      area: chat.area || "General",
      position: chat.position || "Por definir",
    });
    setMessages(await listAdminAiMessages(chat.id));
    setMode("chat");
  }

  async function ensureChat() {
    if (activeChatId) return activeChatId;

    const chat = await createAdminAiChat(contextForm);
    setChats((current) => [chat, ...current]);
    setActiveChatId(chat.id);
    setPublishForm({
      title: chat.title_hint || contextForm.title_hint,
      area: chat.area || contextForm.area,
      position: chat.position || contextForm.position,
    });
    return chat.id;
  }

  async function startNewChat() {
    setError("");
    setNotice("");
    setGenerating(true);

    try {
      const chat = await createAdminAiChat(contextForm);
      setChats((current) => [chat, ...current]);
      setActiveChatId(chat.id);
      setMessages([]);
      setTemplateHtml("");
      setReviewHtml("");
      setEditNote("");
      setPublishForm({
        title: chat.title_hint || contextForm.title_hint,
        area: chat.area || contextForm.area,
        position: chat.position || contextForm.position,
      });
      setMode("chat");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function sendPrompt(e: FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || generating) return;

    setError("");
    setNotice("");
    setGenerating(true);

    try {
      const chatId = await ensureChat();
      let selectedTemplateHtml = "";
      if (selectedContract) {
        const template = await getContractVersionTemplate(selectedContract.id, selectedContract.current_version || 1);
        selectedTemplateHtml = template.template_html || "";
      }

      const selectedContext = selectedContract
        ? [
            `Contexto de plantilla existente: ${selectedContract.title}`,
            `Área: ${selectedContract.area}`,
            `Puesto: ${selectedContract.position}`,
            `Versión actual: ${selectedContract.current_version || 1}`,
            "HTML actual de referencia:",
            selectedTemplateHtml || "(No se encontró HTML de la versión seleccionada)",
            "Si el usuario pide mejorar o ajustar, úsala como referencia funcional, pero devuelve una plantilla HTML completa.",
          ].join("\n")
        : "";

      const finalPrompt = selectedContext ? `${selectedContext}\n\nSolicitud:\n${text}` : text;

      const localMessage: AdminAiMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        text,
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, localMessage]);
      setPrompt("");

      const response = await sendAdminAiMessage(chatId, finalPrompt);
      setMessages((current) => [...current, response.assistant_message]);

      if (response.template_html) {
        setTemplateHtml(response.template_html);
        setReviewHtml(response.template_html);
        setEditNote("");
        setNotice("La IA generó una propuesta. Revísala y edítala antes de publicar.");
        setMode("viewer");
      }

      const refreshed = await listAdminAiChats();
      setChats(refreshed);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function publishTemplate() {
    if (!activeChatId || publishing) return;

    if (!reviewHtml.trim()) {
      setError("Primero genera o escribe una propuesta de plantilla.");
      return;
    }

    if (editNote.trim().length < 20) {
      setError("Describe la revisión humana con al menos 20 caracteres.");
      return;
    }

    setPublishing(true);
    setError("");
    setNotice("");

    try {
      await saveAdminAiHumanEdit(activeChatId, {
        template_html: reviewHtml,
        edit_note: editNote.trim(),
      });

      const contract = await publishAdminAiChatToContract(activeChatId, {
        title: publishForm.title.trim(),
        area: publishForm.area.trim(),
        position: publishForm.position.trim(),
      });

      setNotice(`Plantilla "${contract.title}" publicada como contrato base v1.`);
      setContracts(await listContracts());
      setChats(await listAdminAiChats());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="ai-chat-shell">
      <aside className="ai-chat-sidebar">
        <div className="ai-chat-sidebar__top">
          <Link className="ai-chat-sidebar__back" href="/plantillas">
            Plantillas
          </Link>
          <button className="icon-btn icon-btn--sm" type="button" onClick={() => void startNewChat()} disabled={generating} aria-label="Nuevo chat">
            +
          </button>
        </div>

        <button className="ai-chat-sidebar__new" type="button" onClick={() => void startNewChat()} disabled={generating}>
          Nuevo chat
        </button>

        <div className="ai-chat-sidebar__history">
          {loading ? (
            <div className="muted small">Cargando chats...</div>
          ) : chats.length === 0 ? (
            <div className="ai-chat-sidebar__empty">Aún no hay conversaciones.</div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                className={`ai-chat-history-item ${chat.id === activeChatId ? "is-active" : ""}`}
                onClick={() => void selectChat(chat)}
              >
                <span>{chat.title_hint || "Plantilla IA"}</span>
                <small>{chat.position || "Puesto por definir"} · {formatDate(chat.updated_at || chat.created_at)}</small>
              </button>
            ))
          )}
        </div>

        <div className="ai-chat-context">
          <div className="ai-chat-context__title">Contexto inicial</div>
          <input
            className="control"
            value={contextForm.title_hint}
            onChange={(e) => setContextForm((prev) => ({ ...prev, title_hint: e.target.value }))}
            placeholder="Título"
          />
          <input
            className="control"
            value={contextForm.position}
            onChange={(e) => setContextForm((prev) => ({ ...prev, position: e.target.value }))}
            placeholder="Puesto"
          />
          <input
            className="control"
            value={contextForm.area}
            onChange={(e) => setContextForm((prev) => ({ ...prev, area: e.target.value }))}
            placeholder="Área"
          />
        </div>
      </aside>

      <main className="ai-chat-main">
        <header className="ai-chat-topbar">
          <div>
            <div className="ai-chat-model">Seal IA</div>
            <div className="ai-chat-thread">
              {activeChat?.title_hint || "Generador de plantillas"} · {activeChat?.position || contextForm.position}
            </div>
          </div>

          <div className="ai-chat-topbar__actions">
            {templateHtml && (
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setMode(mode === "viewer" ? "chat" : "viewer")}>
                {mode === "viewer" ? "Volver al chat" : "Ver visualizador"}
              </button>
            )}
            <span className={templateHtml ? "chip chip--ok" : "chip"}>{templateHtml ? "Plantilla generada" : "Sin propuesta"}</span>
          </div>
        </header>

        {(error || notice) && (
          <section className="ai-chat-alert">
            {error && <div className="muted small text-danger">{error}</div>}
            {notice && <div className="muted small">{notice}</div>}
          </section>
        )}

        {mode === "chat" ? (
          <>
            <section className={`ai-chat-messages ${messages.length === 0 ? "is-empty" : ""}`}>
              {messages.length === 0 ? (
                <div className="ai-chat-welcome">
                  <div className="ai-chat-welcome__logo">S</div>
                  <h1>¿Qué plantilla necesitas crear?</h1>
                  <p>Pide una plantilla, pregunta por placeholders o solicita cambios sobre una propuesta existente.</p>

                  <div className="ai-chat-suggestions">
                    {QUICK_PROMPTS.map((item) => (
                      <button key={item.title} type="button" onClick={() => setPrompt(item.text)}>
                        <strong>{item.title}</strong>
                        <span>{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div key={message.id} className={`ai-chat-message ai-chat-message--${message.role}`}>
                      <div className="ai-chat-message__avatar">{message.role === "user" ? "Tú" : "IA"}</div>
                      <div className="ai-chat-message__body">
                        <div>{message.text}</div>
                        <small>{formatDate(message.created_at)}</small>
                      </div>
                    </div>
                  ))}

                  {templateHtml && (
                    <div className="ai-chat-viewer-card">
                      <div>
                        <strong>Hay una plantilla lista para revisar.</strong>
                        <span>Ábrela en el visualizador. Para cambios, vuelve al chat y pídelos aquí.</span>
                      </div>
                      <button className="btn btn--primary btn--sm" type="button" onClick={() => setMode("viewer")}>
                        Ver plantilla
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            <form className="ai-chat-composer" onSubmit={sendPrompt}>
              <div className="ai-chat-composer__context">
                <select className="control" value={selectedContractId} onChange={(e) => setSelectedContractId(e.target.value)}>
                  <option value="">Crear desde cero</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      Usar base: {contract.title} · {contract.position}
                    </option>
                  ))}
                </select>
                {selectedContract && <span>Base: {selectedContract.title}</span>}
              </div>

              <div className="ai-chat-composer__input">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Mensaje a Seal IA..."
                  disabled={generating}
                />
                <button type="submit" disabled={generating || !prompt.trim()} aria-label="Enviar mensaje">
                  {generating ? "..." : "↑"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <section className="ai-doc-viewer">
            <div className="ai-doc-viewer__toolbar">
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setMode("chat")}>
                Volver al chat
              </button>
              <div>
                <strong>Visualizador de plantilla</strong>
                <span>{publishForm.title || activeChat?.title_hint || "Plantilla generada"}</span>
              </div>
              <span className={canPublish ? "badge badge--done" : "badge badge--sign"}>
                {canPublish ? "Lista para publicar" : "Revisión pendiente"}
              </span>
            </div>

            <div className="ai-doc-viewer__content">
              <article className="ai-doc-viewer__paper" dangerouslySetInnerHTML={{ __html: reviewHtml || "<p>La plantilla aparecerá aquí.</p>" }} />

              <aside className="ai-doc-review">
                <div>
                  <div className="eyebrow">Revisión humana</div>
                  <h2>Validar y publicar</h2>
                  <p>Si necesitas cambios de contenido, vuelve al chat y pídeselos a la IA.</p>
                </div>

                <label className="field">
                  <span className="field__label">Nombre *</span>
                  <input
                    className="control"
                    value={publishForm.title}
                    onChange={(e) => setPublishForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </label>

                <div className="grid-2">
                  <label className="field">
                    <span className="field__label">Puesto *</span>
                    <input
                      className="control"
                      value={publishForm.position}
                      onChange={(e) => setPublishForm((prev) => ({ ...prev, position: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Área *</span>
                    <input
                      className="control"
                      value={publishForm.area}
                      onChange={(e) => setPublishForm((prev) => ({ ...prev, area: e.target.value }))}
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="field__label">HTML revisado</span>
                  <textarea
                    className="control ai-doc-review__html"
                    value={reviewHtml}
                    onChange={(e) => setReviewHtml(e.target.value)}
                    placeholder="Puedes hacer un ajuste manual mínimo si lo necesitas."
                  />
                </label>

                <label className="field">
                  <span className="field__label">Nota de revisión *</span>
                  <textarea
                    className="control"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Ej. Revisé cláusulas, placeholders, puesto, duración y estructura general."
                  />
                </label>

                <button className="btn btn--primary w-full" type="button" onClick={() => void publishTemplate()} disabled={publishing || !canPublish}>
                  {publishing ? "Publicando..." : "Publicar como plantilla v1"}
                </button>
                <button className="btn btn--ghost w-full" type="button" onClick={() => setMode("chat")}>
                  Pedir cambios en el chat
                </button>
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import Icon from "./Icon";
import BrandLogo from "./BrandLogo";

export function ChatComposer({ value, onChange, onSubmit, busy = false, disabled = false, placeholder = "Pregunta sobre este contrato…", maxLength = 2000 }: {
  value: string; onChange: (value: string) => void; onSubmit: (event: FormEvent) => void;
  busy?: boolean; disabled?: boolean; placeholder?: string; maxLength?: number;
}) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [value]);
  return (
    <form ref={form} className="seal-composer" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor={id}>Mensaje a SEAL IA</label>
      <div className="seal-composer__input">
        <textarea ref={input} id={id} value={value} onChange={(event) => onChange(event.target.value)} rows={1}
          maxLength={maxLength} placeholder={placeholder} disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (value.trim() && !busy && !disabled) form.current?.requestSubmit();
            }
          }} />
        <button type="submit" aria-label="Enviar mensaje" title={busy ? "Espera a que termine la respuesta" : "Enviar mensaje"} disabled={busy || disabled || !value.trim()}><Icon name="arrow" /></button>
      </div>
      <div className="seal-composer__hint"><span>{busy ? "Puedes preparar tu siguiente mensaje…" : "Enter para enviar · Shift + Enter para otra línea"}</span><span>{value.length}/{maxLength}</span></div>
    </form>
  );
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) =>
    part.startsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> :
    part.startsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part
  );
}

/** Render model text as React nodes, never as executable HTML. */
export function ChatText({ text }: { text: string }) {
  return <div className="seal-chat-text">{text.split(/\n{2,}/).map((block, index) => {
    const lines = block.split("\n");
    if (lines.every((line) => /^\s*[-*]\s/.test(line))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\s*[-*]\s/, ""))}</li>)}</ul>;
    if (lines.every((line) => /^\s*\d+[.)]\s/.test(line))) return <ol key={index}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\s*\d+[.)]\s/, ""))}</li>)}</ol>;
    return <p key={index}>{inline(block.replace(/^#{1,6}\s/gm, ""))}</p>;
  })}</div>;
}

function AssistantIdentity() {
  return <span className="seal-chat-identity"><BrandLogo size="small" /><strong>SEAL IA</strong></span>;
}

export function ChatQuestion({ text }: { text: string }) {
  return <div className="seal-user-message"><span className="seal-user-message__label">Tú</span><div className="seal-question">{text}</div></div>;
}

export function ChatThinking({ label = "Revisando el contrato…" }: { label?: string }) {
  return <div className="seal-thinking" role="status" aria-label={label}>
    <AssistantIdentity />
    <div className="seal-thinking__activity" aria-hidden="true"><span className="seal-thinking__dots"><i /><i /><i /></span><span>{label}</span></div>
  </div>;
}

export function ChatAnswer({ text, snippets = [], mode }: { text: string; snippets?: string[]; mode?: string }) {
  const [copyState, setCopyState] = useState("");
  return <article className="seal-answer" aria-label="Respuesta de SEAL IA">
    <div className="seal-answer__head"><AssistantIdentity /></div>
    <ChatText text={text} />
    {snippets.length > 0 && <details className="seal-sources"><summary>Ver {snippets.length} fragmento{snippets.length === 1 ? "" : "s"} del contrato</summary>{snippets.map((snippet, index) => <blockquote key={index}>{snippet}</blockquote>)}</details>}
    {mode && mode.startsWith("local-") && <small className="seal-answer__mode">Respuesta de respaldo basada en el documento.</small>}
    <div className="seal-answer__actions"><button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setCopyState("Copiado"); }
      catch { setCopyState("No se pudo copiar"); }
    }}><Icon name="copy" />{copyState || "Copiar respuesta"}</button></div>
    <span className="sr-only" role="status">{copyState}</span>
  </article>;
}

/** Scroll only the transcript; preserve the reader's position when a reply arrives. */
export function ChatTranscript({ children, revision, followKey, label, className = "" }: {
  children: ReactNode; revision: string; followKey: string; label: string; className?: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const previousKey = useRef(followKey);
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    const sent = previousKey.current !== followKey;
    previousKey.current = followKey;
    const frame = requestAnimationFrame(() => {
      const element = scroll.current;
      if (!element) return;
      if (follow.current || sent) {
        element.scrollTop = element.scrollHeight;
        follow.current = true;
        setUnread(false);
      } else setUnread(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [revision, followKey]);
  return <div className={`seal-transcript ${className}`}>
    <div ref={scroll} className="seal-transcript__scroll" role="log" aria-label={label} aria-live="polite" aria-relevant="additions text" tabIndex={0} onScroll={() => {
      const element = scroll.current;
      if (!element) return;
      follow.current = element.scrollHeight - element.scrollTop - element.clientHeight < 60;
      if (follow.current) setUnread(false);
    }}>{children}</div>
    {unread && <button className="seal-chat-latest" type="button" onClick={() => {
      if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
      follow.current = true; setUnread(false);
    }}><Icon name="arrow" />Ir al último mensaje</button>}
  </div>;
}

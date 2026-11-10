"use client";

import BrandLogo from "@/components/BrandLogo";
import { useRef, useState, type FormEvent } from "react";
import { askAdminAssignmentAi, askClientAssignmentAi, type ContractAiAnswer } from "@/lib/api";
import { ChatAnswer, ChatComposer, ChatQuestion, ChatThinking, ChatTranscript } from "./Chat";
import Icon from "./Icon";

type Exchange = { id: number; question: string; result?: ContractAiAnswer; error?: string };
const SUGGESTIONS = ["Resume los puntos principales del contrato", "¿Qué obligaciones tiene cada parte?", "¿Qué debo revisar antes de firmar?"];

export default function ContractAssistant({ assignmentId, role, title }: { assignmentId: string; role: "ADMIN" | "CLIENT"; title: string }) {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState<number | null>(null);
  const busy = useRef(false);
  const sequence = useRef(0);

  async function request(text: string, retryId?: number) {
    if (busy.current) return;
    busy.current = true;
    const id = retryId ?? ++sequence.current;
    setPending(id);
    setExchanges(current => retryId !== undefined
      ? current.map(item => item.id === id ? { id, question: text } : item)
      : [...current, { id, question: text }]);
    try {
      const ask = role === "ADMIN" ? askAdminAssignmentAi : askClientAssignmentAi;
      const result = await ask(assignmentId, text);
      setExchanges(current => current.map(item => item.id === id ? { ...item, result } : item));
    } catch (err) {
      const error = err instanceof Error ? err.message : "No se pudo obtener una respuesta. Intenta de nuevo.";
      setExchanges(current => current.map(item => item.id === id ? { ...item, error } : item));
      // A failed request must never overwrite a new draft written while waiting.
      setQuestion(current => current || text);
    } finally { setPending(null); busy.current = false; }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy.current) return;
    const failed = exchanges.findLast(item => item.error && item.question === text);
    setQuestion("");
    void request(text, failed?.id);
  }

  return <section className="seal-assistant" aria-label="Asistente del contrato">
    <div className="seal-assistant__context"><Icon name="document" /><div><small>Conversación sobre tu contrato</small><strong>{title}</strong></div></div>
    <ChatTranscript className="seal-assistant__messages" label="Consultas del contrato" revision={`${exchanges.length}:${pending}:${exchanges.filter(item => item.result || item.error).length}`} followKey={String(exchanges.at(-1)?.id || "")}>
      {exchanges.length === 0 && <div className="seal-assistant__welcome"><BrandLogo alt="SEAL" /><h3>Tu contrato, más claro.</h3><p>Pregunta con tus propias palabras. Te ayudo a explorar sus cláusulas y a encontrar los fragmentos relacionados.</p><div className="seal-suggestions">{SUGGESTIONS.map(text => <button key={text} type="button" onClick={() => setQuestion(text)}>{text}<span aria-hidden="true">↗</span></button>)}</div></div>}
      {exchanges.map(exchange => <div className="seal-exchange" key={exchange.id}>
        <ChatQuestion text={exchange.question} />
        {exchange.result && <ChatAnswer text={exchange.result.answer} snippets={exchange.result.snippets} mode={exchange.result.mode} />}
        {pending === exchange.id && <ChatThinking />}
        {exchange.error && <div className="seal-chat-error"><p role="alert">{exchange.error} Tu pregunta está lista para reintentar.</p><button type="button" disabled={pending !== null} onClick={() => {
          setQuestion(current => current.trim() === exchange.question ? "" : current);
          void request(exchange.question, exchange.id);
        }}>Reintentar respuesta</button></div>}
      </div>)}
    </ChatTranscript>
    <ChatComposer value={question} onChange={setQuestion} onSubmit={send} busy={pending !== null} />
    <p className="seal-assistant__note">La IA puede equivocarse. Confirma la información en el contrato antes de tomar una decisión.</p>
  </section>;
}

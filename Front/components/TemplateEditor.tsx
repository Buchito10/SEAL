"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import DOMPurify from "dompurify";

export type TemplateEditorHandle = { insertPlaceholder: (key: string) => void };
export type PlaceholderGroup = { label: string; items: string[][] };

export function sanitizeTemplate(html: string) {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
    FORBID_ATTR: ["id", "name"],
  });
}

const TemplateEditor = forwardRef<TemplateEditorHandle, {
  value: string; onChange: (html: string) => void; disabled?: boolean; groups?: PlaceholderGroup[];
}>(function TemplateEditor({ value, onChange, disabled = false, groups = [] }, ref) {
  const editor = useRef<HTMLDivElement>(null);
  const source = useRef<HTMLTextAreaElement>(null);
  const selection = useRef<Range | null>(null);
  const [view, setView] = useState<"visual" | "html">("visual");
  const id = useId();

  useEffect(() => {
    if (view !== "visual" || !editor.current) return;
    const clean = sanitizeTemplate(value) || "<p><br></p>";
    if (editor.current.innerHTML !== clean) {
      editor.current.innerHTML = clean;
      selection.current = null;
    }
  }, [value, view]);

  useEffect(() => {
    function remember() {
      const current = window.getSelection();
      if (current?.rangeCount && editor.current?.contains(current.anchorNode) && editor.current.contains(current.focusNode)) selection.current = current.getRangeAt(0).cloneRange();
    }
    document.addEventListener("selectionchange", remember);
    return () => document.removeEventListener("selectionchange", remember);
  }, []);

  function command(name: string, text?: string) {
    if (disabled || view !== "visual" || !editor.current) return;
    editor.current.focus();
    const current = window.getSelection();
    if (selection.current && editor.current.contains(selection.current.commonAncestorContainer)) {
      current?.removeAllRanges(); current?.addRange(selection.current);
    }
    // Preserve the browser's native undo history for the existing HTML editor.
    document.execCommand(name, false, text);
    onChange(editor.current.innerHTML);
  }

  function insertPlaceholder(key: string) {
    if (!key || disabled) return;
    const token = `{{ ${key} }}`;
    if (view === "visual") command("insertText", token);
    else {
      const start = source.current?.selectionStart ?? value.length;
      const end = source.current?.selectionEnd ?? start;
      onChange(value.slice(0, start) + token + value.slice(end));
      requestAnimationFrame(() => { source.current?.focus(); source.current?.setSelectionRange(start + token.length, start + token.length); });
    }
  }
  useImperativeHandle(ref, () => ({ insertPlaceholder }));

  const words = value.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const fields = new Set(Array.from(value.matchAll(/{{\s*([\w.]+)\s*}}/g), (match) => match[1])).size;

  return <div className="seal-editor">
    <div className="seal-editor__toolbar">
      <div className="seal-editor__views" aria-label="Vista del editor">
        <button type="button" aria-pressed={view === "visual"} onClick={() => setView("visual")}>Documento</button>
        <button type="button" aria-pressed={view === "html"} onClick={() => setView("html")}>Código HTML</button>
      </div>
      <div className="seal-editor__formats" role="group" aria-label="Formato de documento">
        <select aria-label="Estilo de párrafo" value="" disabled={disabled || view !== "visual"} onChange={(event) => command("formatBlock", event.target.value)}><option value="" disabled>Estilo de texto</option><option value="p">Párrafo</option><option value="h1">Título</option><option value="h2">Subtítulo</option><option value="h3">Sección</option></select>
        {[["undo", "↶", "Deshacer"], ["redo", "↷", "Rehacer"], ["bold", "B", "Negritas"], ["italic", "I", "Cursivas"], ["underline", "U", "Subrayado"], ["insertUnorderedList", "•", "Lista con viñetas"], ["insertOrderedList", "1.", "Lista numerada"], ["justifyLeft", "⇤", "Alinear a la izquierda"], ["justifyCenter", "↔", "Centrar"]].map(([name, label, title]) => <button key={name} type="button" title={title} aria-label={title} disabled={disabled || view !== "visual"} onMouseDown={(event) => event.preventDefault()} onClick={() => command(name)}>{label}</button>)}
        {groups.length > 0 && <select value="" aria-label="Insertar campo del contrato" disabled={disabled} onChange={(event) => insertPlaceholder(event.target.value)}><option value="" disabled>+ Insertar campo</option>{groups.map((group) => <optgroup key={group.label} label={group.label}>{group.items.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</optgroup>)}</select>}
      </div>
    </div>
    {view === "visual" ? <div className="seal-editor__canvas"><div ref={editor} className="seal-editor__paper" contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-label="Editor visual de plantilla" aria-multiline="true" spellCheck onInput={() => onChange(editor.current?.innerHTML || "")} onPaste={(event) => {
      event.preventDefault();
      const html = event.clipboardData.getData("text/html");
      if (html) command("insertHTML", sanitizeTemplate(html));
      else command("insertText", event.clipboardData.getData("text/plain"));
    }} onDrop={(event) => event.preventDefault()} /></div> : <div className="seal-editor__source"><label htmlFor={id}>HTML de la plantilla</label><textarea id={id} ref={source} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} spellCheck={false} /><p>La vista Documento elimina contenido ejecutable del HTML.</p></div>}
    <div className="seal-editor__status"><span>{words} palabras</span><span>{fields} campos variables</span><span>{disabled ? "Solo lectura" : "Edición manual"}</span></div>
  </div>;
});
export default TemplateEditor;

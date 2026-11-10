"use client";

import BrandLogo from "@/components/BrandLogo";
import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { listAdminAssignments, type AssignmentSummary } from "@/lib/api";
import ContractAssistant from "./ContractAssistant";
import Icon from "./Icon";

export default function AssistantDock() {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const selected = assignments.find((item) => item.id === selectedId);

  async function load() {
    setLoading(true); setError("");
    try { const rows = await listAdminAssignments(); setAssignments(rows); setLoaded(true); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudieron cargar los contratos."); }
    finally { setLoading(false); }
  }

  return <>
    {pathname !== "/plantillas/ia" && <button className="seal-assistant-launch" aria-haspopup="dialog" onClick={() => { dialog.current?.showModal(); if (!loaded) void load(); }}><Icon name="sparkles" /><span>Consultar con IA</span></button>}
    <dialog ref={dialog} className="seal-assistant-dialog" aria-labelledby="seal-assistant-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="seal-assistant-dialog__body">
        <header className="seal-dock-head"><div><small>ASISTENTE DE CONTRATOS</small><h2 id="seal-assistant-title">SEAL IA</h2></div><button className="icon-btn" aria-label="Cerrar asistente" onClick={() => dialog.current?.close()}><Icon name="close" /></button></header>
        <div className="seal-dock-select"><label htmlFor="seal-assistant-contract">¿Qué expediente quieres consultar?</label><select id="seal-assistant-contract" className="control" value={selectedId} disabled={loading} onChange={(event) => setSelectedId(event.target.value)}><option value="">{loading ? "Cargando expedientes…" : "Selecciona un expediente"}</option>{assignments.map((item) => <option key={item.id} value={item.id}>{item.client_name || "Cliente"} · {item.contract_title || "Contrato"}</option>)}</select>{error && <p className="seal-error" role="alert">{error}</p>}<button className="seal-text-button" type="button" disabled={loading} onClick={() => void load()}>Actualizar expedientes</button></div>
        {selected ? <ContractAssistant key={selected.id} assignmentId={selected.id} role="ADMIN" title={`${selected.contract_title || "Contrato"} · ${selected.client_name || "Cliente"}`} /> : <div className="seal-dock-empty"><BrandLogo alt="SEAL" /><h3>Una consulta, con contexto.</h3><p>{loaded && assignments.length === 0 ? "Cuando asignes tu primer contrato, podrás consultar sus cláusulas desde aquí." : "Selecciona un expediente para resolver dudas sin salir de lo que estás haciendo."}</p></div>}
        <footer className="seal-dock-footer"><span>¿Quieres crear una plantilla?</span><Link href="/plantillas/ia" onClick={() => dialog.current?.close()}>Abrir Estudio IA <Icon name="external" width="15" height="15" /></Link></footer>
      </div>
    </dialog>
  </>;
}

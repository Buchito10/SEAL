"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  acquireContractLock,
  cloneContract,
  compareContractVersions,
  createContractVersion,
  getContract,
  getContractDraft,
  getContractVersionTemplate,
  getPlaceholderCatalog,
  listContracts,
  listContractDrafts,
  listContractVersions,
  publishContractDraft,
  releaseContractLock,
  refreshContractLock,
  saveContractDraft,
  saveContractTemplateSameVersion,
  uploadContract,
  type AdminContract,
  type ContractVersionSummary,
  type ContractVersionTemplate,
  type ContractVersionsComparison,
  type ContractDraftResponse,
  type PlaceholderCatalog,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import Link from "next/link";

type ViewMode = "catalogo" | "tabla";
type StatusFilter = "Todas" | "Activa";
type EditorMode = "same_version" | "new_version";
type EditorView = "visual" | "html";

const PAGE_SIZE = 9;

const EMPTY_FORM = {
  title: "",
  position: "",
  area: "General",
};

const FALLBACK_PLACEHOLDER_GROUPS = [
  {
    label: "Cliente",
    items: [
      ["employee.name", "Nombre"],
      ["employee.email", "Email"],
      ["employee.rfc", "RFC"],
      ["employee.curp", "CURP"],
      ["employee.phone", "Teléfono"],
      ["employee.address_line1", "Dirección"],
      ["employee.address_line2", "Dirección complementaria"],
      ["employee.address_city", "Ciudad"],
      ["employee.address_state", "Estado"],
      ["employee.address_zip", "C.P."],
      ["employee.address_country", "País"],
    ],
  },
  {
    label: "Contrato",
    items: [
      ["company.title", "Título"],
      ["company.area", "Área"],
      ["company.position", "Puesto"],
      ["company.duration", "Duración"],
      ["company.legal_representative_name", "Representante"],
      ["company.start_date", "Inicio"],
      ["company.end_date", "Fin"],
      ["company.salary", "Salario"],
      ["company.work_schedule", "Horario"],
    ],
  },
];

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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(contract: AdminContract) {
  return contract.status === "ACTIVE" ? "Activa" : contract.status;
}

function isLockValid(lock?: AdminContract["edit_lock"]) {
  if (!lock?.expires_at) return false;
  return new Date(lock.expires_at).getTime() > Date.now();
}

function lockLabel(contract?: AdminContract | null) {
  if (!contract?.edit_lock) return "Disponible";
  if (!isLockValid(contract.edit_lock)) return "Disponible";

  const me = getUser();
  if (me?.id === contract.edit_lock.locked_by) return "Bloqueada por ti";
  return `Bloqueada por ${contract.edit_lock.locked_by_name || "otro admin"}`;
}

function lockBadgeClass(contract?: AdminContract | null) {
  if (!contract?.edit_lock || !isLockValid(contract.edit_lock)) return "badge badge--done";
  const me = getUser();
  return me?.id === contract.edit_lock.locked_by ? "badge badge--sign" : "badge badge--draft text-danger";
}

function versionTitle(version?: ContractVersionSummary | null) {
  if (!version) return "-";
  return version.is_base ? "Base v1" : `Versión v${version.version}`;
}

export default function PlantillasPage() {
  const visualEditorRef = useRef<HTMLDivElement | null>(null);
  const editorHtmlRef = useRef("");

  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [selected, setSelected] = useState<AdminContract | null>(null);
  const [versions, setVersions] = useState<ContractVersionSummary[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [placeholderCatalog, setPlaceholderCatalog] = useState<PlaceholderCatalog | null>(null);
  const [comparison, setComparison] = useState<ContractVersionsComparison | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [recentDraft, setRecentDraft] = useState<ContractDraftResponse | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [cloning, setCloning] = useState(false);

  const [view, setView] = useState<ViewMode>("catalogo");
  const [q, setQ] = useState("");
  const [filterArea, setFilterArea] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("Todas");
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("same_version");
  const [editorVersion, setEditorVersion] = useState<ContractVersionTemplate | null>(null);
  const [editorHtml, setEditorHtml] = useState("");
  const [editorView, setEditorView] = useState<EditorView>("visual");
  const [commitMessage, setCommitMessage] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [lockOwner, setLockOwner] = useState(false);

  async function loadContracts() {
    setError("");
    setIsLoading(true);

    try {
      const [rows, catalog] = await Promise.all([listContracts(), getPlaceholderCatalog()]);
      setContracts(rows);
      setPlaceholderCatalog(catalog);
      setSelected((current) => {
        if (current && rows.some((contract) => contract.id === current.id)) {
          return rows.find((contract) => contract.id === current.id) || current;
        }
        return rows[0] || null;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadContracts();
  }, []);

  async function loadSelectedDetails(contractId: string) {
    setVersionsLoading(true);

    try {
      const [freshContract, versionRows] = await Promise.all([getContract(contractId), listContractVersions(contractId)]);
      setSelected(freshContract);
      setContracts((current) => current.map((contract) => (contract.id === freshContract.id ? freshContract : contract)));
      setVersions(versionRows.versions);
    } catch (err) {
      setError(getErrorMessage(err));
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }

  useEffect(() => {
    if (!selected?.id) {
      setVersions([]);
      return;
    }

    void loadSelectedDetails(selected.id);
  }, [selected?.id]);

  useEffect(() => {
    if (!editorOpen || !selected?.id || !lockOwner) return;

    const id = window.setInterval(() => {
      void refreshContractLock(selected.id).catch((err) => {
        setError(getErrorMessage(err));
        setLockOwner(false);
      });
    }, 5 * 60 * 1000);

    return () => window.clearInterval(id);
  }, [editorOpen, lockOwner, selected?.id]);

  useEffect(() => {
    if (!editorOpen || !selected?.id || !lockOwner) return;

    const onBeforeUnload = () => {
      void releaseContractLock(selected.id);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editorOpen, lockOwner, selected?.id]);

  useEffect(() => {
    editorHtmlRef.current = editorHtml;
  }, [editorHtml]);

  useEffect(() => {
    if (!editorOpen || editorView !== "visual" || !visualEditorRef.current) return;
    visualEditorRef.current.innerHTML = editorHtmlRef.current || "<p><br></p>";
  }, [editorOpen, editorView, editorVersion?.version]);

  const areas = useMemo(() => {
    const unique = new Set(contracts.map((contract) => contract.area).filter(Boolean));
    return ["Todas", ...Array.from(unique).sort()];
  }, [contracts]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return contracts.filter((contract) => {
      const matchesQuery =
        !query ||
        contract.title.toLowerCase().includes(query) ||
        contract.position.toLowerCase().includes(query) ||
        contract.area.toLowerCase().includes(query);

      const matchesArea = filterArea === "Todas" ? true : contract.area === filterArea;
      const matchesStatus = filterStatus === "Todas" ? true : contract.status === "ACTIVE";

      return matchesQuery && matchesArea && matchesStatus;
    });
  }, [contracts, filterArea, filterStatus, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [filterArea, filterStatus, q, view]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const currentVersion = selected?.current_version || 1;
  const baseVersion = versions.find((version) => version.version === 1) || null;
  const latestVersion =
    versions.find((version) => version.version === currentVersion) ||
    versions[versions.length - 1] ||
    baseVersion ||
    null;

  const usedPlaceholders = useMemo(() => {
    const found = new Set<string>();
    const fromHtml = editorHtml.match(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g) || [];
    fromHtml.forEach((token) => {
      const clean = token.replace(/[{}]/g, "").trim();
      if (clean) found.add(clean);
    });
    editorVersion?.placeholders_used?.forEach((item) => found.add(item));
    selected?.base_placeholders_used?.forEach((item) => found.add(item));
    return Array.from(found).sort();
  }, [editorHtml, editorVersion?.placeholders_used, selected?.base_placeholders_used]);

  const placeholderGroups = useMemo(() => {
    if (!placeholderCatalog) return FALLBACK_PLACEHOLDER_GROUPS;
    return [
      { label: "Cliente", items: placeholderCatalog.employee.map((item) => [item.key, item.label]) },
      { label: "Contrato", items: placeholderCatalog.company.map((item) => [item.key, item.label]) },
    ];
  }, [placeholderCatalog]);

  function openCreateModal() {
    setError("");
    setNotice("");
    setForm(EMPTY_FORM);
    setFile(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
  }

  function syncVisualHtml() {
    setEditorHtml(visualEditorRef.current?.innerHTML || "");
  }

  function runEditorCommand(command: string, value?: string) {
    if (editorView !== "visual") return;
    visualEditorRef.current?.focus();
    document.execCommand(command, false, value);
    syncVisualHtml();
  }

  function setEditorBlock(block: string) {
    runEditorCommand("formatBlock", block);
  }

  function insertPlaceholder(key: string) {
    if (!key) return;
    if (editorView !== "visual") {
      setEditorHtml((current) => `${current} {{ ${key} }}`);
      return;
    }
    visualEditorRef.current?.focus();
    document.execCommand("insertText", false, `{{ ${key} }}`);
    syncVisualHtml();
  }

  function switchEditorView(next: EditorView) {
    if (next === "html") syncVisualHtml();
    setEditorView(next);
  }

  async function openEditor(mode: EditorMode) {
    if (!selected) return;

    setError("");
    setNotice("");
    setEditorLoading(true);
    setEditorMode(mode);
    setCommitMessage("");
    setRecentDraft(null);

    try {
      await acquireContractLock(selected.id);
      setLockOwner(true);

      const versionNumber = selected.current_version || 1;
      const [template, drafts] = await Promise.all([
        getContractVersionTemplate(selected.id, versionNumber),
        listContractDrafts(selected.id),
      ]);
      setEditorVersion(template);
      setEditorHtml(template.template_html || "");
      setEditorView("visual");
      const latestDraft = drafts[0];
      setRecentDraft(latestDraft?.id ? { draft_id: latestDraft.id, draft: latestDraft } : null);
      setEditorOpen(true);
      await loadSelectedDetails(selected.id);
    } catch (err) {
      setLockOwner(false);
      setError(getErrorMessage(err));
    } finally {
      setEditorLoading(false);
    }
  }

  async function closeEditor() {
    if (editorSaving) return;

    const contractId = selected?.id;
    setEditorOpen(false);
    setEditorVersion(null);
    setEditorHtml("");
    setEditorView("visual");
    setCommitMessage("");

    if (contractId && lockOwner) {
      setLockOwner(false);
      try {
        await releaseContractLock(contractId);
        await loadSelectedDetails(contractId);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    }
  }

  async function saveEditor(e: FormEvent) {
    e.preventDefault();
    if (!selected || !editorVersion) return;

    const commit = commitMessage.trim();
    if (commit.length < 5) {
      setError("Escribe un mensaje de cambio de al menos 5 caracteres.");
      return;
    }

    setError("");
    setNotice("");
    setEditorSaving(true);

    try {
      const version = selected.current_version || 1;
      const shouldCreateVersion = editorMode === "new_version" || version === 1;

      if (shouldCreateVersion) {
        await createContractVersion(selected.id, {
          from_version: version,
          template_html: editorHtml,
          commit,
          note: version === 1 ? "Nueva versión creada desde base v1" : "Nueva versión creada desde editor",
        });
        setNotice("Nueva versión publicada correctamente.");
      } else {
        await saveContractTemplateSameVersion(selected.id, version, {
          template_html: editorHtml,
          commit,
        });
        setNotice("Plantilla actualizada correctamente.");
      }

      await releaseContractLock(selected.id);
      setLockOwner(false);
      setEditorOpen(false);
      setEditorVersion(null);
      setEditorHtml("");
      setEditorView("visual");
      setCommitMessage("");
      await loadContracts();
      await loadSelectedDetails(selected.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEditorSaving(false);
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!file) {
      setError("Selecciona un archivo .docx para crear la plantilla.");
      return;
    }

    setSaving(true);

    try {
      const result = await uploadContract({
        title: form.title.trim(),
        area: form.area.trim(),
        position: form.position.trim(),
        file,
      });

      setNotice("Plantilla subida correctamente.");
      setIsModalOpen(false);
      await loadContracts();
      setSelected(result.contract);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onCloneContract() {
    if (!selected || cloning) return;
    const title = window.prompt("Nombre de la copia:", `${selected.title} (copia)`);
    if (title === null) return;
    if (title.trim().length < 3) {
      setError("El nombre de la copia debe tener al menos 3 caracteres.");
      return;
    }

    setCloning(true);
    setError("");
    setNotice("");
    try {
      const { contract } = await cloneContract(selected.id, {
        title: title.trim(),
        area: selected.area,
        position: selected.position,
      });
      await loadContracts();
      setSelected(contract);
      setNotice(`Se creó la plantilla "${contract.title}" a partir de la versión más reciente.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCloning(false);
    }
  }

  async function openComparison() {
    if (!selected || versions.length < 2) {
      setError("Se necesitan al menos dos versiones para comparar.");
      return;
    }
    const latest = selected.current_version || versions[versions.length - 1]?.version || 1;
    const previous = versions.filter((item) => item.version < latest).at(-1)?.version || 1;

    setComparisonLoading(true);
    setError("");
    try {
      const data = await compareContractVersions(selected.id, [previous, latest]);
      setComparison(data);
      setComparisonOpen(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setComparisonLoading(false);
    }
  }

  function currentEditorHtml() {
    if (editorView === "visual") return visualEditorRef.current?.innerHTML || editorHtml;
    return editorHtml;
  }

  async function onSaveDraft() {
    if (!selected || !editorVersion || draftBusy) return;
    const html = currentEditorHtml();
    if (!html.trim()) {
      setError("El borrador no puede estar vacío.");
      return;
    }

    setDraftBusy(true);
    setError("");
    setNotice("");
    try {
      setEditorHtml(html);
      const saved = await saveContractDraft(selected.id, {
        based_on_version: selected.current_version || editorVersion.version,
        template_html: html,
      });
      setRecentDraft(saved);
      setNotice(`Borrador guardado. Expira ${formatDate(saved.draft.expires_at)}.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDraftBusy(false);
    }
  }

  async function onReloadDraft() {
    if (!selected || !recentDraft || draftBusy) return;
    setDraftBusy(true);
    setError("");
    try {
      const loaded = await getContractDraft(selected.id, recentDraft.draft_id);
      setRecentDraft(loaded);
      setEditorHtml(loaded.draft.template_html);
      editorHtmlRef.current = loaded.draft.template_html;
      if (editorView === "visual" && visualEditorRef.current) {
        visualEditorRef.current.innerHTML = loaded.draft.template_html;
      }
      setNotice("Borrador recuperado en el editor.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDraftBusy(false);
    }
  }

  async function onPublishDraft() {
    if (!selected || !recentDraft || draftBusy) return;
    const commit = commitMessage.trim();
    if (commit.length < 5) {
      setError("Escribe un mensaje de cambio de al menos 5 caracteres para publicar.");
      return;
    }

    setDraftBusy(true);
    setError("");
    try {
      const current = selected.current_version || 1;
      const mode = editorMode === "same_version" && current > 1 ? "same_version" : "new_version";
      await publishContractDraft(selected.id, recentDraft.draft_id, { mode, commit });
      await releaseContractLock(selected.id);
      setLockOwner(false);
      setRecentDraft(null);
      setEditorOpen(false);
      setEditorVersion(null);
      setEditorHtml("");
      setCommitMessage("");
      await loadContracts();
      await loadSelectedDetails(selected.id);
      setNotice("Borrador publicado correctamente.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDraftBusy(false);
    }
  }

  return (
    <div className="templates-screen">
      <header className="topbar templates-topbar">
        <div className="topbar__left">
          <div className="eyebrow">Biblioteca legal</div>
          <h1 className="title">Plantillas</h1>
        </div>

        <div className="topbar__right" style={{ gap: 10, display: "flex", alignItems: "center" }}>
          <div className="seg">
            <button
              className={`seg__btn ${view === "catalogo" ? "is-active" : ""}`}
              type="button"
              onClick={() => setView("catalogo")}
            >
              Catálogo
            </button>
            <button
              className={`seg__btn ${view === "tabla" ? "is-active" : ""}`}
              type="button"
              onClick={() => setView("tabla")}
            >
              Tabla
            </button>
          </div>

          <Link className="btn btn--soft" href="/plantillas/ia">
            Generar con IA
          </Link>

          <button className="btn btn--primary" onClick={openCreateModal}>
            + Subir plantilla
          </button>
        </div>
      </header>

      {(error || notice) && (
        <section className="card" style={{ padding: 12 }}>
          {error && <div className="muted small text-danger">{error}</div>}
          {notice && <div className="muted small">{notice}</div>}
        </section>
      )}

      <section className="card card--toolbar templates-toolbar" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <div className="search" style={{ flex: 1 }}>
          <span className="search__icon">⌕</span>
          <input
            className="search__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="text"
            placeholder="Buscar por nombre, puesto o área..."
          />
        </div>

        <label className="templates-filter">
          <span>Área</span>
          <select
            className="control"
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
          >
            {areas.map((area) => (
              <option key={area} value={area}>
                {area === "Todas" ? "Todas las áreas" : area}
              </option>
            ))}
          </select>
        </label>

        <label className="templates-filter">
          <span>Estado</span>
          <select
            className="control"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
          >
            <option value="Todas">Cualquier estado</option>
            <option value="Activa">Activas</option>
          </select>
        </label>
      </section>

      <section className="grid templates-grid">
        <article className="card templates-catalog" style={{ gridColumn: "1 / span 8" }}>
          <div className="card__title-row">
            <h2 className="card__title">Catálogo de plantillas</h2>
            <div className="muted small">
              {isLoading ? "Cargando..." : `${filtered.length} de ${contracts.length}`}
            </div>
          </div>

          {isLoading ? (
            <div className="muted small">Cargando plantillas...</div>
          ) : filtered.length === 0 ? (
            <div className="note">
              <div className="note__title">Sin plantillas</div>
              <div className="note__text">Sube un archivo DOCX para crear la primera plantilla.</div>
            </div>
          ) : view === "catalogo" ? (
            <>
              <div className="templates-tiles">
                {paginated.map((contract) => (
                  <button
                    key={contract.id}
                    type="button"
                    className="tile template-tile"
                    onClick={() => setSelected(contract)}
                    style={{
                      textAlign: "left",
                      cursor: "pointer",
                      borderColor: selected?.id === contract.id ? "var(--goldGlow)" : "var(--stroke2)",
                    }}
                  >
                    <div className="tile__top">
                      <div className="tile__icon">DOC</div>
                      <span className="chip">v{contract.current_version || 1}</span>
                    </div>

                    <div className="strong">{contract.title}</div>
                    <div className="muted small">
                      {contract.position} · {contract.area}
                    </div>

                    <div className="template-tile__meta">
                      <span>{contract.base_placeholders_used?.length || 0} campos</span>
                      <span>{statusLabel(contract)}</span>
                      <span>{lockLabel(contract)}</span>
                    </div>

                    <div className="muted small" style={{ marginTop: 8 }}>
                      {formatDate(contract.updated_at || contract.created_at)}
                    </div>
                  </button>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="templates-pager">
                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </button>

                  <div className="templates-pager__pages">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                      <button
                        key={item}
                        className={`templates-pager__page ${page === item ? "is-active" : ""}`}
                        type="button"
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="templates-table-wrap">
              <div className="table">
                <div className="table__row table__head">
                  <div>Plantilla</div>
                  <div>Meta</div>
                  <div>Campos</div>
                  <div>Estado</div>
                  <div>Actualizado</div>
                  <div className="t-right">Acciones</div>
                </div>

                {filtered.map((contract) => (
                  <div
                    className="table__row"
                    key={contract.id}
                    onClick={() => setSelected(contract)}
                    style={{ cursor: "pointer" }}
                  >
                    <div>
                      <div className="strong">{contract.title}</div>
                      <div className="muted small">Puesto: {contract.position}</div>
                    </div>

                    <div className="muted">
                      {contract.area} · v{contract.current_version || 1}
                    </div>

                    <div className="muted">{contract.base_placeholders_used?.length || 0}</div>

                    <div>
                      <span className="badge badge--done">{statusLabel(contract)}</span>
                      <span className={lockBadgeClass(contract)} style={{ marginLeft: 6 }}>
                        {lockLabel(contract)}
                      </span>
                    </div>

                    <div className="muted">{formatDate(contract.updated_at || contract.created_at)}</div>

                    <div className="t-right" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn--ghost btn--sm" onClick={() => setSelected(contract)}>
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="card templates-detail" style={{ gridColumn: "9 / span 4" }}>
          <div className="card__title-row">
            <h2 className="card__title">Detalle</h2>
            <span className="chip">v{selected?.current_version || 1}</span>
          </div>

          {!selected ? (
            <div className="muted">Selecciona una plantilla para ver su información.</div>
          ) : (
            <>
              <div className="strong" style={{ fontSize: "1.05rem", marginBottom: 6 }}>
                {selected.title}
              </div>

              <div className="muted" style={{ marginBottom: 12 }}>
                Puesto: <span className="gold">{selected.position}</span>
              </div>

              <div className="note" style={{ marginBottom: 12 }}>
                <div className="note__title">Metadatos</div>
                <div className="note__text">
                  Área: {selected.area} · Estado: {statusLabel(selected)} · Versión actual: {selected.current_version || 1}
                </div>
              </div>

              <div className="note" style={{ marginBottom: 12 }}>
                <div className="note__title">Estado de edición</div>
                <div className="note__text">
                  <span className={lockBadgeClass(selected)}>{lockLabel(selected)}</span>
                  {selected.edit_lock && isLockValid(selected.edit_lock)
                    ? ` · Expira ${formatDate(selected.edit_lock.expires_at)}`
                    : " · Sin bloqueo activo"}
                </div>
              </div>

              <div className="note templates-version-card" style={{ marginBottom: 12 }}>
                <div className="note__title">Archivos de la plantilla</div>
                {versionsLoading ? (
                  <div className="note__text">Cargando versiones...</div>
                ) : (
                  <div className="templates-version-list">
                    <div className="templates-version-row">
                      <div>
                        <div className="strong">{versionTitle(baseVersion)}</div>
                        <div className="muted small">
                          {baseVersion?.last_commit_message || selected.base_last_commit_message || "Subida inicial"}
                        </div>
                      </div>
                      <span className="badge badge--draft">Protegida</span>
                    </div>

                    <div className="templates-version-row">
                      <div>
                        <div className="strong">{versionTitle(latestVersion)}</div>
                        <div className="muted small">
                          {latestVersion?.last_commit_message || "Sin cambios registrados"} ·{" "}
                          {formatDate(latestVersion?.last_commit_at || selected.updated_at || selected.created_at)}
                        </div>
                      </div>
                      <span className="badge badge--done">Actual</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="note templates-version-card" style={{ marginBottom: 12 }}>
                <div className="note__title">Historial de versiones</div>
                {versionsLoading ? (
                  <div className="note__text">Cargando historial...</div>
                ) : versions.length === 0 ? (
                  <div className="note__text">Sin versiones registradas.</div>
                ) : (
                  <div className="templates-version-list">
                    {versions.map((version) => (
                      <div className="templates-version-row" key={version.version}>
                        <div>
                          <div className="strong">
                            {versionTitle(version)} {version.version === currentVersion ? "· actual" : ""}
                          </div>
                          <div className="muted small">
                            {version.last_commit_message || "Sin mensaje"} · {version.last_commit_by_name || "Sistema"}
                          </div>
                          <div className="muted small">{formatDate(version.last_commit_at)}</div>
                        </div>
                        <span className={version.version === currentVersion ? "badge badge--done" : "badge badge--draft"}>
                          {version.is_base ? "Base" : `v${version.version}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="note" style={{ marginBottom: 12 }}>
                <div className="note__title">Placeholders detectados</div>
                <div className="note__text">
                  {(selected.base_placeholders_used || []).length > 0
                    ? selected.base_placeholders_used?.join(", ")
                    : "Sin placeholders detectados en la versión base."}
                </div>
              </div>

              <div className="note" style={{ marginBottom: 12 }}>
                <div className="note__title">Último cambio</div>
                <div className="note__text">
                  {latestVersion?.last_commit_message || selected.base_last_commit_message || "Subida inicial"} ·{" "}
                  {formatDate(latestVersion?.last_commit_at || selected.base_last_commit_at || selected.updated_at || selected.created_at)}
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <button
                  className="btn btn--primary"
                  type="button"
                  onClick={() => void openEditor("same_version")}
                  disabled={editorLoading || (selected.edit_lock ? isLockValid(selected.edit_lock) && getUser()?.id !== selected.edit_lock.locked_by : false)}
                >
                  {editorLoading ? "Preparando editor..." : currentVersion === 1 ? "Crear v2 desde base" : "Editar versión actual"}
                </button>
                <button
                  className="btn btn--soft"
                  type="button"
                  onClick={() => void openEditor("new_version")}
                  disabled={editorLoading || (selected.edit_lock ? isLockValid(selected.edit_lock) && getUser()?.id !== selected.edit_lock.locked_by : false)}
                >
                  Crear nueva versión
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => void openComparison()}
                  disabled={comparisonLoading || versions.length < 2}
                >
                  {comparisonLoading ? "Comparando..." : "Comparar versiones"}
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => void onCloneContract()}
                  disabled={cloning}
                >
                  {cloning ? "Duplicando..." : "Duplicar plantilla"}
                </button>
              </div>
            </>
          )}
        </article>

      </section>

      <div
        className={`modal-overlay ${isModalOpen ? "is-visible" : ""}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="modal card" style={{ maxWidth: 650 }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <h2 className="card__title">Subir plantilla</h2>
            <button className="icon-btn icon-btn--sm" onClick={closeModal} aria-label="Cerrar" disabled={saving}>
              X
            </button>
          </div>

          <div className="modal__body">
            <form className="form-grid" onSubmit={onSave}>
              <label className="field">
                <span className="field__label">Nombre de plantilla *</span>
                <input
                  className="control"
                  type="text"
                  placeholder="Ej. Supervisor temporal"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </label>

              <div className="grid-2">
                <label className="field">
                  <span className="field__label">Puesto *</span>
                  <input
                    className="control"
                    type="text"
                    placeholder="Ej. Supervisor de Planta"
                    value={form.position}
                    onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Área *</span>
                  <select
                    className="control"
                    value={form.area}
                    onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                  >
                    <option>General</option>
                    <option>Operaciones</option>
                    <option>Recursos Humanos</option>
                    <option>Tecnología</option>
                    <option>Ventas</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span className="field__label">Archivo DOCX *</span>
                <input
                  className="control"
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </label>

              <div className="modal__footer" style={{ padding: 0, borderTop: 0, background: "transparent" }}>
                <button type="button" className="btn btn--ghost" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? "Subiendo..." : "Subir plantilla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay ${editorOpen ? "is-visible" : ""}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) void closeEditor();
        }}
      >
        <div className="modal card templates-editor-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <div>
              <h2 className="card__title">
                {editorMode === "new_version" || (selected?.current_version || 1) === 1
                  ? "Crear nueva versión"
                  : "Editar versión actual"}
              </h2>
              <div className="muted small">
                {selected?.title || "Plantilla"} · v{editorVersion?.version || selected?.current_version || 1}
              </div>
            </div>
            <button className="icon-btn icon-btn--sm" onClick={() => void closeEditor()} aria-label="Cerrar" disabled={editorSaving}>
              X
            </button>
          </div>

          <form className="modal__body templates-editor templates-editor--word" onSubmit={saveEditor}>
            <div className="templates-editor__ribbon">
              <div className="templates-editor__tabs">
                <button
                  type="button"
                  className={`templates-editor__tab ${editorView === "visual" ? "is-active" : ""}`}
                  onClick={() => switchEditorView("visual")}
                >
                  Documento
                </button>
                <button
                  type="button"
                  className={`templates-editor__tab ${editorView === "html" ? "is-active" : ""}`}
                  onClick={() => switchEditorView("html")}
                >
                  HTML
                </button>
              </div>

              <div className="templates-editor__tools" aria-label="Herramientas de formato">
                <select
                  className="control templates-editor__select"
                  value=""
                  onChange={(e) => {
                    setEditorBlock(e.target.value);
                    e.currentTarget.value = "";
                  }}
                  disabled={editorSaving || editorView !== "visual"}
                  aria-label="Estilo de párrafo"
                >
                  <option value="" disabled>
                    Estilo
                  </option>
                  <option value="p">Párrafo</option>
                  <option value="h1">Título 1</option>
                  <option value="h2">Título 2</option>
                  <option value="h3">Título 3</option>
                </select>

                {[
                  ["bold", "B", "Negritas"],
                  ["italic", "I", "Cursivas"],
                  ["underline", "U", "Subrayado"],
                ].map(([command, label, title]) => (
                  <button
                    key={command}
                    type="button"
                    className="templates-editor__tool"
                    title={title}
                    disabled={editorSaving || editorView !== "visual"}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runEditorCommand(command)}
                  >
                    {label}
                  </button>
                ))}

                <button
                  type="button"
                  className="templates-editor__tool"
                  title="Lista con viñetas"
                  disabled={editorSaving || editorView !== "visual"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runEditorCommand("insertUnorderedList")}
                >
                  •
                </button>
                <button
                  type="button"
                  className="templates-editor__tool"
                  title="Lista numerada"
                  disabled={editorSaving || editorView !== "visual"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runEditorCommand("insertOrderedList")}
                >
                  1.
                </button>

                {[
                  ["justifyLeft", "Izquierda"],
                  ["justifyCenter", "Centro"],
                  ["justifyRight", "Derecha"],
                ].map(([command, title]) => (
                  <button
                    key={command}
                    type="button"
                    className="templates-editor__tool"
                    title={title}
                    disabled={editorSaving || editorView !== "visual"}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runEditorCommand(command)}
                  >
                    {title === "Izquierda" ? "L" : title === "Centro" ? "C" : "R"}
                  </button>
                ))}

                <select
                  className="control templates-editor__placeholder-select"
                  value=""
                  onChange={(e) => {
                    insertPlaceholder(e.target.value);
                    e.currentTarget.value = "";
                  }}
                  disabled={editorSaving}
                  aria-label="Insertar campo"
                >
                  <option value="" disabled>
                    Insertar campo
                  </option>
                  {placeholderGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="templates-editor__workbench templates-editor__workbench--word">
              <section className="templates-editor__canvas">
                {editorView === "visual" ? (
                  <div className="templates-editor__page-shell">
                    <div
                      ref={visualEditorRef}
                      className="templates-editor__page"
                      contentEditable={!editorSaving}
                      suppressContentEditableWarning
                      role="textbox"
                      aria-label="Editor visual de plantilla"
                      spellCheck
                      onInput={syncVisualHtml}
                      onBlur={syncVisualHtml}
                    />
                  </div>
                ) : (
                  <label className="field templates-editor__source">
                    <span className="field__label">HTML de la plantilla</span>
                    <textarea
                      className="control templates-editor__textarea"
                      value={editorHtml}
                      onChange={(e) => setEditorHtml(e.target.value)}
                      disabled={editorSaving}
                      spellCheck={false}
                    />
                  </label>
                )}
              </section>

              <aside className="templates-editor__side">
                <div className="templates-editor__panel">
                  <div className="note__title">Versión</div>
                  <div className="templates-editor__status">
                    <span className="badge badge--done">Lock activo</span>
                    <span className="chip">v{selected?.current_version || 1}</span>
                  </div>
                  <div className="muted small">
                    {(editorMode === "new_version" || (selected?.current_version || 1) === 1)
                      ? "Se publicará como una nueva versión."
                      : "Se guardará sobre la versión actual."}
                  </div>
                </div>

                <label className="field templates-editor__panel">
                  <span className="field__label">Mensaje de cambio *</span>
                  <textarea
                    className="control templates-editor__commit"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Ej. Ajusta cláusula de jornada y salario"
                    disabled={editorSaving}
                    required
                    minLength={5}
                  />
                </label>

                <div className="templates-editor__panel">
                  <div className="note__title">Campos usados</div>
                  {usedPlaceholders.length === 0 ? (
                    <div className="muted small">Aún no hay campos detectados.</div>
                  ) : (
                    <div className="templates-editor__chips">
                      {usedPlaceholders.map((item) => (
                        <button key={item} className="chip" type="button" onClick={() => insertPlaceholder(item)} disabled={editorSaving}>
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="templates-editor__panel templates-editor__panel--soft">
                  <div className="note__title">Guardado</div>
                  <div className="muted small">
                    {(editorMode === "new_version" || (selected?.current_version || 1) === 1)
                      ? "El cambio quedará registrado como nueva versión con tu commit."
                      : "El historial conservará el commit con fecha y usuario."}
                  </div>
                </div>

                {recentDraft && (
                  <div className="templates-editor__panel">
                    <div className="note__title">Borrador reciente</div>
                    <div className="muted small">
                      Guardado {formatDate(recentDraft.draft.updated_at || recentDraft.draft.created_at)} · expira {formatDate(recentDraft.draft.expires_at)}
                    </div>
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => void onReloadDraft()} disabled={draftBusy} style={{ marginTop: 8 }}>
                      Recuperar borrador
                    </button>
                  </div>
                )}
              </aside>
            </div>

            <div className="modal__footer templates-editor__footer">
              <button type="button" className="btn btn--ghost" onClick={() => void closeEditor()} disabled={editorSaving}>
                Cancelar
              </button>
              <button type="button" className="btn btn--soft" onClick={() => void onSaveDraft()} disabled={editorSaving || draftBusy || !editorHtml.trim()}>
                {draftBusy ? "Procesando..." : "Guardar borrador"}
              </button>
              {recentDraft && (
                <button type="button" className="btn btn--soft" onClick={() => void onPublishDraft()} disabled={editorSaving || draftBusy || commitMessage.trim().length < 5}>
                  Publicar borrador
                </button>
              )}
              <button type="submit" className="btn btn--primary" disabled={editorSaving || !editorHtml.trim() || commitMessage.trim().length < 5}>
                {editorSaving ? "Guardando..." : "Guardar con commit"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div
        className={`modal-overlay ${comparisonOpen ? "is-visible" : ""}`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setComparisonOpen(false);
        }}
      >
        <div className="modal card" style={{ maxWidth: 1100 }} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal__header">
            <div>
              <h2 className="card__title">Comparación de versiones</h2>
              <div className="muted small">{selected?.title || "Plantilla"}</div>
            </div>
            <button className="icon-btn icon-btn--sm" type="button" aria-label="Cerrar comparación" onClick={() => setComparisonOpen(false)}>X</button>
          </div>
          <div className="modal__body">
            <div className="grid-2" style={{ alignItems: "start" }}>
              {(comparison?.versions || []).map((version) => (
                <section className="note" key={version.version}>
                  <div className="note__title">Versión {version.display_version || version.version}</div>
                  <div className="muted small" style={{ marginBottom: 12 }}>
                    {(version.placeholders_used || []).length} campos · {(version.commits || []).length} cambios registrados
                  </div>
                  <div className="document-page" dangerouslySetInnerHTML={{ __html: version.template_html }} />
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

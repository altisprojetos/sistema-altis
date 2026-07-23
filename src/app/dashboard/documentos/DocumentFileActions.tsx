"use client";

import { useState, useTransition, useRef } from "react";
import {
  replaceDocument,
  updateDocumentDescription,
  updateDocumentClassification,
  addDocumentFromExplorer,
  addClientProperty,
} from "@/lib/actions/documentos";
import { PERSONAL_DOC_NUMBERS, PROPERTY_DOC_NUMBERS, DOCUMENT_NAMES } from "@/lib/services-catalog";

interface Doc {
  id: string;
  docNumber: number;
  docName: string;
  fileName: string;
  url: string;
  description: string | null;
  uploadedAt: Date | string;
  propertyIndex: number;
}

interface Property {
  id: string;
  index: number;
  farmName: string | null;
  municipality: string | null;
  areaHa: number | null;
}

function propertyLabel(p: Property) {
  if (p.farmName) return p.farmName;
  if (p.municipality) return `Imóvel ${p.index} — ${p.municipality}`;
  return `Imóvel ${p.index}`;
}

function FileIcon({ name }: { name: string }) {
  const e = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(e))
    return <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
  if (e === "pdf")
    return <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
  return <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

// Grupos do catálogo de documentos
const PERSONAL_NUMS = [2, 3, 4, 5, 6, 7];
const PROPERTY_NUMS = [9, 10, 11, 12, 20, 25];
const OTHER_NUMS    = [13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 26, 27];

type DocCategory = "pessoais" | "imovel" | "outros" | "personalizado";

/* ── Painel de classificação reutilizável ───────────────────────────────── */
function ClassifyPanel({
  category,
  docNum,
  propIdx,
  properties,
  onCategoryChange,
  onDocNumChange,
  onPropIdxChange,
  customName,
  onCustomNameChange,
  showCustomName,
}: {
  category: DocCategory;
  docNum: number;
  propIdx: number;
  properties: Property[];
  onCategoryChange: (c: DocCategory) => void;
  onDocNumChange: (n: number) => void;
  onPropIdxChange: (i: number) => void;
  customName?: string;
  onCustomNameChange?: (v: string) => void;
  showCustomName?: boolean;
}) {
  const cats: { key: DocCategory; label: string }[] = [
    { key: "pessoais", label: "Pessoais" },
    { key: "imovel",   label: "Imóvel" },
    { key: "outros",   label: "Outros" },
    { key: "personalizado", label: "Personalizado" },
  ];

  const numsForCat = category === "pessoais" ? PERSONAL_NUMS : category === "imovel" ? PROPERTY_NUMS : OTHER_NUMS;

  return (
    <div className="flex flex-col gap-3">
      {/* Categoria */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Categoria</label>
        <div className="grid grid-cols-4 gap-1">
          {cats.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onCategoryChange(key)}
              className={`text-xs py-1.5 rounded border transition-colors ${
                category === key
                  ? "bg-[var(--ink-900)] text-white border-[var(--ink-900)]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Personalizado: nome livre */}
      {category === "personalizado" && showCustomName && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Nome do documento</label>
          <input
            type="text"
            value={customName ?? ""}
            onChange={(e) => onCustomNameChange?.(e.target.value)}
            placeholder="Ex: Declaração de posse"
            className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[var(--signal-500)]"
          />
        </div>
      )}

      {/* Tipo de documento (exceto personalizado) */}
      {category !== "personalizado" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Tipo de documento</label>
          <select
            value={docNum}
            onChange={(e) => onDocNumChange(Number(e.target.value))}
            className="border border-gray-200 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-[var(--signal-500)]"
          >
            {numsForCat.map((n) => (
              <option key={n} value={n}>
                {n}. {DOCUMENT_NAMES[n] ?? "—"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Imóvel (só quando categoria = imovel) */}
      {category === "imovel" && properties.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Imóvel</label>
          <select
            value={propIdx}
            onChange={(e) => onPropIdxChange(Number(e.target.value))}
            className="border border-gray-200 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-[var(--signal-500)]"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.index}>
                {propertyLabel(p)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/* ── Card individual com hover actions ─────────────────────────────────── */
function DocCard({ doc, processId, properties }: { doc: Doc; processId: string; properties: Property[] }) {
  const [editDesc, setEditDesc]      = useState(false);
  const [reclass, setReclass]        = useState(false);
  const [desc, setDesc]              = useState(doc.description ?? "");
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reclassify state
  function detectCategory(n: number): DocCategory {
    if (PERSONAL_DOC_NUMBERS.has(n)) return "pessoais";
    if (PROPERTY_DOC_NUMBERS.has(n)) return "imovel";
    return "outros";
  }
  const [rCat, setRCat]     = useState<DocCategory>(() => detectCategory(doc.docNumber));
  const [rNum, setRNum]     = useState(doc.docNumber || OTHER_NUMS[0]);
  const [rProp, setRProp]   = useState(doc.propertyIndex || (properties[0]?.index ?? 0));

  function handleRCatChange(cat: DocCategory) {
    setRCat(cat);
    if (cat === "pessoais") setRNum(PERSONAL_NUMS[0]);
    else if (cat === "imovel") setRNum(PROPERTY_NUMS[0]);
    else setRNum(OTHER_NUMS[0]);
  }

  async function handleReplace(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("processId", processId);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { url, fileName } = await res.json();
    setUploading(false);
    startTransition(() => replaceDocument(doc.id, url, fileName));
  }

  function saveDesc() {
    startTransition(async () => {
      await updateDocumentDescription(doc.id, desc);
      setEditDesc(false);
    });
  }

  function saveReclass() {
    const docNumber = rCat === "personalizado" ? 0 : rNum;
    const docName   = DOCUMENT_NAMES[docNumber] ?? doc.docName;
    const propIdx   = rCat === "imovel" ? rProp : 0;
    startTransition(async () => {
      await updateDocumentClassification(doc.id, docNumber, docName, propIdx);
      setReclass(false);
    });
  }

  return (
    <div className="group relative flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-center">
      {/* Ações no hover */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || isPending}
          title="Substituir arquivo"
          className="text-[10px] px-2 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? "…" : "Substituir"}
        </button>
        <button
          onClick={() => setReclass(true)}
          className="text-[10px] px-2 py-0.5 border border-gray-300 rounded bg-white text-blue-600 hover:bg-gray-50"
        >
          Mover
        </button>
        <button
          onClick={() => setEditDesc(true)}
          className="text-[10px] px-2 py-0.5 border border-gray-300 rounded bg-white text-[var(--signal-500)] hover:bg-gray-50"
        >
          {doc.description ? "Desc." : "+ Desc."}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReplace(f); }}
        />
      </div>

      <a href={doc.url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 w-full">
        <FileIcon name={doc.fileName} />
        <span className="text-xs text-gray-700 break-all line-clamp-2 w-full">{doc.docName || doc.fileName}</span>
        {doc.description && (
          <span className="text-[10px] text-gray-400 italic line-clamp-1 w-full">{doc.description}</span>
        )}
        <span className="text-[10px] text-gray-400">{fmtDate(doc.uploadedAt)}</span>
      </a>

      {/* Modal — Descrição */}
      {editDesc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditDesc(false)}>
          <div className="bg-white rounded-lg p-5 w-80 shadow-lg flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-800">Descrição do documento</p>
            <p className="text-xs text-gray-500 truncate">{doc.docName}</p>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Ex: Versão atualizada em jun/2026, inclui folha 3…"
              className="border border-gray-200 rounded px-2 py-1.5 text-sm resize-none w-full"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditDesc(false)} className="text-xs text-gray-400 hover:underline">Cancelar</button>
              <button onClick={saveDesc} disabled={isPending} className="text-xs px-3 py-1.5 bg-[var(--ink-900)] text-white rounded hover:opacity-90 disabled:opacity-50">
                {isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Reclassificar */}
      {reclass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setReclass(false)}>
          <div className="bg-white rounded-lg p-5 w-96 shadow-lg flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-800">Mover documento</p>
            <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
            <ClassifyPanel
              category={rCat}
              docNum={rNum}
              propIdx={rProp}
              properties={properties}
              onCategoryChange={handleRCatChange}
              onDocNumChange={setRNum}
              onPropIdxChange={setRProp}
            />
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setReclass(false)} className="text-xs text-gray-400 hover:underline">Cancelar</button>
              <button onClick={saveReclass} disabled={isPending} className="text-xs px-3 py-1.5 bg-[var(--ink-900)] text-white rounded hover:opacity-90 disabled:opacity-50">
                {isPending ? "Salvando…" : "Mover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Adicionar documento (com classificação) ────────────────────────────── */
function AddDocForm({ processId, properties }: { processId: string; properties: Property[] }) {
  const [open, setOpen]              = useState(false);
  const [category, setCategory]      = useState<DocCategory>("pessoais");
  const [docNum, setDocNum]          = useState(PERSONAL_NUMS[0]);
  const [propIdx, setPropIdx]        = useState(properties[0]?.index ?? 0);
  const [customName, setCustomName]  = useState("");
  const [desc, setDesc]              = useState("");
  const [file, setFile]              = useState<File | null>(null);
  const [uploading, setUploading]    = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCategoryChange(cat: DocCategory) {
    setCategory(cat);
    if (cat === "pessoais") setDocNum(PERSONAL_NUMS[0]);
    else if (cat === "imovel") { setDocNum(PROPERTY_NUMS[0]); setPropIdx(properties[0]?.index ?? 0); }
    else if (cat === "outros") setDocNum(OTHER_NUMS[0]);
  }

  function reset() {
    setCategory("pessoais"); setDocNum(PERSONAL_NUMS[0]); setPropIdx(properties[0]?.index ?? 0);
    setCustomName(""); setDesc(""); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setOpen(false);
  }

  async function handleAdd() {
    if (!file) return;
    if (category === "personalizado" && !customName.trim()) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("processId", processId);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { url, fileName } = await res.json();
    setUploading(false);

    const finalDocNum  = category === "personalizado" ? 0 : docNum;
    const finalDocName = category === "personalizado" ? customName.trim() : (DOCUMENT_NAMES[docNum] ?? customName.trim());
    const finalPropIdx = category === "imovel" ? propIdx : 0;

    startTransition(async () => {
      await addDocumentFromExplorer({
        processId,
        docNumber:     finalDocNum,
        docName:       finalDocName,
        propertyIndex: finalPropIdx,
        description:   desc.trim() || undefined,
        fileName,
        url,
      });
      reset();
    });
  }

  const canSubmit = !!file && !uploading && !isPending &&
    (category !== "personalizado" || !!customName.trim());

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Adicionar documento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={reset}>
          <div className="bg-white rounded-lg p-5 w-[420px] shadow-lg flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-800">Adicionar documento</p>

            <ClassifyPanel
              category={category}
              docNum={docNum}
              propIdx={propIdx}
              properties={properties}
              onCategoryChange={handleCategoryChange}
              onDocNumChange={setDocNum}
              onPropIdxChange={setPropIdx}
              customName={customName}
              onCustomNameChange={setCustomName}
              showCustomName
            />

            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Descrição / observação (opcional)"
              className="border border-gray-200 rounded px-2 py-1.5 text-sm resize-none w-full focus:outline-none focus:ring-1 focus:ring-[var(--signal-500)]"
            />

            <label className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded p-3 cursor-pointer hover:bg-gray-50">
              <svg className="w-4 h-4 text-gray-400 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="truncate">{file ? file.name : "Selecionar arquivo"}</span>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>

            <div className="flex gap-2 justify-end">
              <button onClick={reset} className="text-xs text-gray-400 hover:underline">Cancelar</button>
              <button
                onClick={handleAdd}
                disabled={!canSubmit}
                className="text-xs px-3 py-1.5 bg-[var(--ink-900)] text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? "Enviando…" : isPending ? "Salvando…" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Adicionar novo imóvel inline ───────────────────────────────────────── */
function AddPropertyInline({ clientId }: { clientId: string }) {
  const [open, setOpen]              = useState(false);
  const [farmName, setFarmName]      = useState("");
  const [municipality, setMunicipality] = useState("");
  const [areaHa, setAreaHa]          = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() { setFarmName(""); setMunicipality(""); setAreaHa(""); setOpen(false); }

  function handleCreate() {
    if (!farmName.trim()) return;
    startTransition(async () => {
      await addClientProperty({
        clientId,
        farmName:     farmName.trim(),
        municipality: municipality.trim() || undefined,
        areaHa:       areaHa ? parseFloat(areaHa) : undefined,
      });
      reset();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-900 border border-dashed border-green-300 rounded px-3 py-1.5 w-fit hover:bg-green-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Novo Imóvel
      </button>
    );
  }

  return (
    <div className="border border-dashed border-green-300 rounded-lg p-4 bg-green-50 flex flex-col gap-3">
      <p className="text-xs font-semibold text-green-800">Cadastrar novo imóvel</p>
      <input
        type="text"
        value={farmName}
        onChange={(e) => setFarmName(e.target.value)}
        placeholder="Nome da fazenda (obrigatório)"
        autoFocus
        className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
          placeholder="Município"
          className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
        />
        <input
          type="number"
          value={areaHa}
          onChange={(e) => setAreaHa(e.target.value)}
          placeholder="Área (ha)"
          min={0}
          step={0.01}
          className="w-28 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={reset} className="text-xs text-gray-400 hover:underline">Cancelar</button>
        <button
          onClick={handleCreate}
          disabled={!farmName.trim() || isPending}
          className="text-xs px-3 py-1.5 bg-green-700 text-white rounded hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Criando…" : "Criar Imóvel"}
        </button>
      </div>
    </div>
  );
}

/* ── Subcomponentes de grid ─────────────────────────────────────────────── */
function DocGrid({ docs, processId, properties }: { docs: Doc[]; processId: string; properties: Property[] }) {
  if (docs.length === 0) return null;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
      {docs.map((doc) => (
        <DocCard key={doc.id} doc={doc} processId={processId} properties={properties} />
      ))}
    </div>
  );
}

function CategorySection({ title, docs, processId, properties, accent }: {
  title: string;
  docs: Doc[];
  processId: string;
  properties: Property[];
  accent?: string;
}) {
  if (docs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent ?? "text-gray-500"}`}>{title}</p>
      <DocGrid docs={docs} processId={processId} properties={properties} />
    </div>
  );
}

/* ── Export principal ───────────────────────────────────────────────────── */
export function DocumentFileGrid({
  docs,
  processId,
  properties = [],
  clientId,
}: {
  docs: Doc[];
  processId: string;
  properties?: Property[];
  clientId?: string;
}) {
  const personalDocs = docs.filter((d) => PERSONAL_DOC_NUMBERS.has(d.docNumber));
  const propertyDocs = docs.filter((d) => PROPERTY_DOC_NUMBERS.has(d.docNumber));
  const otherDocs    = docs.filter((d) => !PERSONAL_DOC_NUMBERS.has(d.docNumber) && !PROPERTY_DOC_NUMBERS.has(d.docNumber));

  const hasCategories = personalDocs.length > 0 || propertyDocs.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex justify-end">
        <AddDocForm processId={processId} properties={properties} />
      </div>

      {docs.length === 0 && properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
          <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Nenhum documento nesta pasta</p>
          {clientId && <AddPropertyInline clientId={clientId} />}
        </div>
      ) : hasCategories ? (
        <>
          <CategorySection
            title="Documentos Pessoais"
            docs={personalDocs}
            processId={processId}
            properties={properties}
            accent="text-blue-600"
          />

          {/* Seções por imóvel */}
          {properties.length > 0
            ? properties.map((prop) => (
                <CategorySection
                  key={prop.id}
                  title={`Imóvel — ${propertyLabel(prop)}${prop.areaHa ? ` · ${prop.areaHa} ha` : ""}`}
                  docs={propertyDocs.filter((d) => d.propertyIndex === prop.index)}
                  processId={processId}
                  properties={properties}
                  accent="text-green-700"
                />
              ))
            : <CategorySection
                title="Documentos do Imóvel"
                docs={propertyDocs}
                processId={processId}
                properties={properties}
                accent="text-green-700"
              />
          }

          {/* Botão para adicionar novo imóvel */}
          {clientId && <AddPropertyInline clientId={clientId} />}

          {otherDocs.length > 0 && (
            <CategorySection title="Outros Documentos" docs={otherDocs} processId={processId} properties={properties} />
          )}
        </>
      ) : (
        <>
          <DocGrid docs={docs} processId={processId} properties={properties} />
          {clientId && <AddPropertyInline clientId={clientId} />}
        </>
      )}
    </div>
  );
}

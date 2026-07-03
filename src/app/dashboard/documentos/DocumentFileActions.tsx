"use client";

import { useState, useTransition, useRef } from "react";
import { replaceDocument, updateDocumentDescription, addFreeDocument } from "@/lib/actions/documentos";

interface Doc {
  id: string;
  docName: string;
  fileName: string;
  url: string;
  description: string | null;
  uploadedAt: Date | string;
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

/* ── Card individual com hover actions ─────────────────────────────────── */
function DocCard({ doc, processId }: { doc: Doc; processId: string }) {
  const [editDesc, setEditDesc] = useState(false);
  const [desc, setDesc] = useState(doc.description ?? "");
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="group relative flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-center">
      {/* Overlay de ações ao hover */}
      <div className="absolute inset-0 rounded-lg bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 z-10">
        <a
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-3 py-1 bg-[var(--ink-900)] text-white rounded hover:opacity-90"
        >
          Abrir
        </a>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || isPending}
          className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? "Enviando…" : "Substituir"}
        </button>
        <button
          onClick={() => setEditDesc(true)}
          className="text-xs text-[var(--signal-500)] hover:underline"
        >
          {doc.description ? "Editar descrição" : "+ Descrição"}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReplace(f); }}
        />
      </div>

      <FileIcon name={doc.fileName} />
      <span className="text-xs text-gray-700 break-all line-clamp-2 w-full">{doc.docName || doc.fileName}</span>
      {doc.description && (
        <span className="text-[10px] text-gray-400 italic line-clamp-1 w-full">{doc.description}</span>
      )}
      <span className="text-[10px] text-gray-400">{fmtDate(doc.uploadedAt)}</span>

      {/* Modal de descrição */}
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
              <button
                onClick={saveDesc}
                disabled={isPending}
                className="text-xs px-3 py-1.5 bg-[var(--ink-900)] text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Botão e formulário "Adicionar documento" ──────────────────────────── */
function AddDocForm({ processId }: { processId: string }) {
  const [open, setOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setDocName(""); setDesc(""); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setOpen(false);
  }

  async function handleAdd() {
    if (!docName.trim() || !file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("processId", processId);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { url, fileName } = await res.json();
    setUploading(false);
    startTransition(async () => {
      await addFreeDocument({ processId, docName: docName.trim(), description: desc.trim() || undefined, fileName, url });
      reset();
    });
  }

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
          <div className="bg-white rounded-lg p-5 w-96 shadow-lg flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-800">Adicionar documento</p>

            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Nome do documento (ex: Matrícula atualizada)"
              className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full"
              autoFocus
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Descrição (opcional)"
              className="border border-gray-200 rounded px-2 py-1.5 text-sm resize-none w-full"
            />

            <label className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded p-3 cursor-pointer hover:bg-gray-50">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {file ? file.name : "Selecionar arquivo"}
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>

            <div className="flex gap-2 justify-end">
              <button onClick={reset} className="text-xs text-gray-400 hover:underline">Cancelar</button>
              <button
                onClick={handleAdd}
                disabled={!docName.trim() || !file || uploading || isPending}
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

/* ── Export principal: grade de documentos ─────────────────────────────── */
export function DocumentFileGrid({ docs, processId }: { docs: Doc[]; processId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddDocForm processId={processId} />
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
          <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Nenhum documento nesta pasta</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
          {docs.map((doc) => (
            <DocCard key={doc.id} doc={doc} processId={processId} />
          ))}
        </div>
      )}
    </div>
  );
}

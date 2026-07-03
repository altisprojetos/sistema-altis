"use client";

import { useState, useTransition, useRef } from "react";
import { addDocument, deleteDocument } from "@/lib/actions/documents";

type UploadedDoc = {
  id: string;
  docNumber: number;
  docName: string;
  fileName: string;
  url: string;
  propertyIndex: number;
};

type Props = {
  processId: string;
  docNums: number[];
  docNames: Record<number, string>;
  uploadedDocs: UploadedDoc[];
  editable: boolean;
};

// Documentos que podem ser serviços da ALTIS
const ALTIS_SERVICE_DOCS = new Set([9, 10, 11, 14, 16, 17, 21]);

function UploadRow({
  processId,
  docNumber,
  docName,
}: {
  processId: string;
  docNumber: number;
  docName: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("processId", processId);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Erro ao enviar arquivo.");
        return;
      }

      startTransition(async () => {
        await addDocument({
          processId,
          docNumber,
          docName,
          fileName: data.fileName,
          url: data.url,
        });
      });
    } catch {
      setError("Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mt-1">
      <label className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--signal-500)] text-white rounded text-xs font-medium cursor-pointer hover:opacity-90">
        <span>{uploading ? "Enviando…" : "Adicionar arquivo"}</span>
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          onChange={handleFile}
          disabled={uploading}
        />
      </label>
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}

function CustomDocRow({ processId }: { processId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !name.trim()) {
      setError("Informe o nome do documento antes de selecionar o arquivo.");
      return;
    }
    setUploading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("processId", processId);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Erro ao enviar arquivo.");
        return;
      }

      startTransition(async () => {
        await addDocument({
          processId,
          docNumber: 0,
          docName: name.trim(),
          fileName: data.fileName,
          url: data.url,
        });
      });

      setName("");
      setOpen(false);
    } catch {
      setError("Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-xs text-[var(--signal-500)] hover:underline"
      >
        + Adicionar documento personalizado
      </button>
    );
  }

  return (
    <div className="mt-3 border border-dashed border-gray-300 rounded p-3 flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-600">Documento personalizado</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do documento (ex: Declaração de posse)"
        className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[var(--signal-500)]"
      />
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--signal-500)] text-white rounded text-xs font-medium cursor-pointer hover:opacity-90">
          {uploading ? "Enviando…" : "Selecionar arquivo"}
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            onChange={handleFile}
            disabled={uploading || !name.trim()}
          />
        </label>
        <button
          onClick={() => { setOpen(false); setName(""); setError(""); }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function DocumentChecklist({
  processId,
  docNums,
  docNames,
  uploadedDocs,
  editable,
}: Props) {
  const [, startTransition] = useTransition();

  // Agrupa uploaded por docNumber
  const uploadedByNum = uploadedDocs.reduce<Record<number, UploadedDoc[]>>((acc, d) => {
    const key = d.docNumber;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  // Documentos personalizados (docNumber === 0)
  const customDocs = uploadedDocs.filter((d) => d.docNumber === 0);

  const [expandedDoc, setExpandedDoc] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-1">
      {docNums.map((n) => {
        const uploaded = uploadedByNum[n] ?? [];
        const hasFile = uploaded.length > 0;
        const isAltis = ALTIS_SERVICE_DOCS.has(n);
        const isExpanded = expandedDoc === n;

        return (
          <div key={n} className={`rounded border ${hasFile ? "border-green-200 bg-green-50" : "border-gray-100 bg-white"}`}>
            {/* Linha principal — clicável */}
            <button
              type="button"
              onClick={() => editable && setExpandedDoc(isExpanded ? null : n)}
              className={`w-full flex items-start gap-2 px-3 py-2 text-left ${editable ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"}`}
            >
              {/* Ícone de status */}
              <span className={`mt-0.5 flex-none text-sm ${hasFile ? "text-green-500" : "text-gray-300"}`}>
                {hasFile ? "✓" : "○"}
              </span>

              <div className="flex-1 min-w-0">
                <span className={`text-sm ${hasFile ? "text-green-800 font-medium" : ""} ${n === 26 ? "font-semibold text-[var(--signal-500)]" : ""}`}>
                  <span className="text-gray-400 text-xs mr-1">{n}.</span>
                  {docNames[n]}
                  {n === 26 && (
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      — responsabilidade do vendedor
                    </span>
                  )}
                  {isAltis && !hasFile && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      Pode ser serviço ALTIS
                    </span>
                  )}
                </span>

                {/* Arquivos enviados */}
                {uploaded.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {uploaded.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-600 hover:underline truncate max-w-[220px]"
                        >
                          📎 {doc.fileName}
                        </a>
                        {editable && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startTransition(() => deleteDocument(doc.id, processId));
                            }}
                            className="text-xs text-red-400 hover:text-red-600 flex-none"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {editable && (
                <span className="text-gray-300 text-xs flex-none mt-0.5">
                  {isExpanded ? "▲" : "▼"}
                </span>
              )}
            </button>

            {/* Área de upload expandida */}
            {editable && isExpanded && (
              <div className="px-3 pb-3 border-t border-gray-100">
                <UploadRow
                  processId={processId}
                  docNumber={n}
                  docName={docNames[n]}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Documentos personalizados já enviados */}
      {customDocs.length > 0 && (
        <div className="mt-2 border-t border-gray-100 pt-2">
          <p className="text-xs font-semibold text-gray-500 mb-1">Documentos adicionais</p>
          {customDocs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 py-1">
              <span className="text-green-500 text-sm">✓</span>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                📎 {doc.docName} — {doc.fileName}
              </a>
              {editable && (
                <button
                  type="button"
                  onClick={() => startTransition(() => deleteDocument(doc.id, processId))}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Adicionar documento personalizado */}
      {editable && <CustomDocRow processId={processId} />}

      {/* Totalizador */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>
          {Object.values(uploadedByNum).filter((d) => d.length > 0).length + customDocs.length} de{" "}
          {docNums.length} documento(s) entregues
        </span>
        {docNums.length > 0 && (
          <div className="w-32 bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all"
              style={{
                width: `${Math.round(
                  ((Object.values(uploadedByNum).filter((d) => d.length > 0).length + customDocs.length) /
                    docNums.length) *
                    100
                )}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

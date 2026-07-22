"use client";

import { useState, useTransition, useRef } from "react";
import { addDocument, deleteDocument } from "@/lib/actions/documents";
import { PERSONAL_DOC_NUMBERS, PROPERTY_DOC_NUMBERS } from "@/lib/services-catalog";

type UploadedDoc = {
  id: string;
  docNumber: number;
  docName: string;
  fileName: string;
  url: string;
  propertyIndex: number;
};

type Property = {
  id: string;
  index: number;
  farmName: string | null;
  municipality: string | null;
  areaHa: number | null;
};

type Props = {
  processId: string;
  docNums: number[];
  docNames: Record<number, string>;
  uploadedDocs: UploadedDoc[];
  editable: boolean;
  properties?: Property[];
};

// Documentos que podem ser serviços da ALTIS
const ALTIS_SERVICE_DOCS = new Set([9, 10, 11, 14, 16, 17, 21]);

function propertyLabel(p: Property) {
  if (p.farmName) return p.farmName;
  if (p.municipality) return `Imóvel ${p.index} — ${p.municipality}`;
  return `Imóvel ${p.index}`;
}

function UploadRow({
  processId,
  docNumber,
  docName,
  propertyIndex,
  subfolder,
}: {
  processId: string;
  docNumber: number;
  docName: string;
  propertyIndex?: number;
  subfolder?: string;
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
      if (subfolder) form.append("subfolder", subfolder);

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
          propertyIndex,
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
      form.append("subfolder", "outros");

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

function DocRow({
  n,
  docNames,
  uploaded,
  editable,
  processId,
  propertyIndex,
  subfolder,
  expandedDoc,
  setExpandedDoc,
  deleteDoc,
}: {
  n: number;
  docNames: Record<number, string>;
  uploaded: UploadedDoc[];
  editable: boolean;
  processId: string;
  propertyIndex?: number;
  subfolder?: string;
  expandedDoc: string | null;
  setExpandedDoc: (k: string | null) => void;
  deleteDoc: (docId: string) => void;
}) {
  const rowKey = propertyIndex !== undefined ? `${n}-${propertyIndex}` : `${n}`;
  const hasFile = uploaded.length > 0;
  const isAltis = ALTIS_SERVICE_DOCS.has(n);
  const isExpanded = expandedDoc === rowKey;

  return (
    <div className={`rounded border ${hasFile ? "border-green-200 bg-green-50" : "border-gray-100 bg-white"}`}>
      <button
        type="button"
        onClick={() => editable && setExpandedDoc(isExpanded ? null : rowKey)}
        className={`w-full flex items-start gap-2 px-3 py-2 text-left ${editable ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"}`}
      >
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
                      onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }}
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

      {editable && isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <UploadRow
            processId={processId}
            docNumber={n}
            docName={docNames[n]}
            propertyIndex={propertyIndex}
            subfolder={subfolder}
          />
        </div>
      )}
    </div>
  );
}

export default function DocumentChecklist({
  processId,
  docNums,
  docNames,
  uploadedDocs,
  editable,
  properties = [],
}: Props) {
  const [, startTransition] = useTransition();
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  function deleteDoc(docId: string) {
    startTransition(() => deleteDocument(docId, processId));
  }

  // Separa docs por categoria
  const personalNums = docNums.filter((n) => PERSONAL_DOC_NUMBERS.has(n));
  const propertyNums = docNums.filter((n) => PROPERTY_DOC_NUMBERS.has(n));
  const otherNums = docNums.filter((n) => !PERSONAL_DOC_NUMBERS.has(n) && !PROPERTY_DOC_NUMBERS.has(n));

  // Documentos personalizados (docNumber === 0)
  const customDocs = uploadedDocs.filter((d) => d.docNumber === 0);

  // Conta total de docs preenchidos (para progress bar)
  const hasPropertySection = propertyNums.length > 0 && properties.length > 0;
  let totalSlots = personalNums.length + otherNums.length + customDocs.length;
  let totalFilled = 0;

  // Conta pessoais preenchidos
  personalNums.forEach((n) => {
    const filled = uploadedDocs.some((d) => d.docNumber === n);
    if (filled) totalFilled++;
  });

  // Conta outros preenchidos
  otherNums.forEach((n) => {
    const filled = uploadedDocs.some((d) => d.docNumber === n);
    if (filled) totalFilled++;
  });

  totalFilled += customDocs.length;

  // Por imóvel
  if (hasPropertySection) {
    totalSlots += propertyNums.length * properties.length;
    properties.forEach((prop) => {
      propertyNums.forEach((n) => {
        const filled = uploadedDocs.some(
          (d) => d.docNumber === n && d.propertyIndex === prop.index
        );
        if (filled) totalFilled++;
      });
    });
  } else {
    // sem propriedades vinculadas — mostra docs de imóvel como "outros"
    propertyNums.forEach((n) => {
      const filled = uploadedDocs.some((d) => d.docNumber === n);
      if (filled) totalFilled++;
    });
    totalSlots += propertyNums.length;
  }

  const baseRowProps = { editable, processId, expandedDoc, setExpandedDoc, deleteDoc, docNames };

  return (
    <div className="flex flex-col gap-4">
      {/* Documentos Pessoais → pasta "pessoais/" */}
      {personalNums.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Documentos Pessoais
          </p>
          <div className="flex flex-col gap-1">
            {personalNums.map((n) => (
              <DocRow
                key={n}
                n={n}
                uploaded={uploadedDocs.filter((d) => d.docNumber === n)}
                subfolder="pessoais"
                {...baseRowProps}
              />
            ))}
          </div>
        </div>
      )}

      {/* Documentos por Imóvel → pasta com nome da fazenda */}
      {hasPropertySection && (
        <div className="flex flex-col gap-4">
          {properties.map((prop) => {
            const folderName = propertyLabel(prop);
            return (
              <div key={prop.id}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <span>🏡</span>
                  {folderName}
                  {prop.areaHa && <span className="font-normal text-gray-400">· {prop.areaHa} ha</span>}
                </p>
                <div className="flex flex-col gap-1">
                  {propertyNums.map((n) => (
                    <DocRow
                      key={`${n}-${prop.index}`}
                      n={n}
                      uploaded={uploadedDocs.filter(
                        (d) => d.docNumber === n && d.propertyIndex === prop.index
                      )}
                      propertyIndex={prop.index}
                      subfolder={folderName}
                      {...baseRowProps}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Docs de imóvel quando não há propriedades cadastradas → pasta "imovel/" */}
      {propertyNums.length > 0 && !hasPropertySection && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Documentos do Imóvel
          </p>
          <div className="flex flex-col gap-1">
            {propertyNums.map((n) => (
              <DocRow
                key={n}
                n={n}
                uploaded={uploadedDocs.filter((d) => d.docNumber === n)}
                subfolder="imovel"
                {...baseRowProps}
              />
            ))}
          </div>
        </div>
      )}

      {/* Outros Documentos → pasta "outros/" */}
      {otherNums.length > 0 && (
        <div>
          {(personalNums.length > 0 || hasPropertySection || propertyNums.length > 0) && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Outros Documentos
            </p>
          )}
          <div className="flex flex-col gap-1">
            {otherNums.map((n) => (
              <DocRow
                key={n}
                n={n}
                subfolder="outros"
                uploaded={uploadedDocs.filter((d) => d.docNumber === n)}
                {...baseRowProps}
              />
            ))}
          </div>
        </div>
      )}

      {/* Documentos personalizados já enviados */}
      {customDocs.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
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
                  onClick={() => deleteDoc(doc.id)}
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
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>
          {totalFilled} de {totalSlots} documento(s) entregues
        </span>
        {totalSlots > 0 && (
          <div className="w-32 bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.round((totalFilled / totalSlots) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition, useRef } from "react";
import { addProcessCost, deleteProcessCost } from "@/lib/actions/processes";

interface ProcessCost {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  date: Date | string;
  userId: string | null;
  owner: "EMPRESA" | "CLIENTE";
  approvalStatus: "PENDENTE" | "APROVADO" | "REJEITADO";
  receiptUrl: string | null;
  rejectionReason: string | null;
  user?: { name: string } | null;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_STYLES: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700",
  APROVADO: "bg-green-100 text-green-700",
  REJEITADO: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

export function ProcessCostPanel({
  processId,
  costs,
  currentUserId,
  isAdmin,
}: {
  processId: string;
  costs: ProcessCost[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [owner, setOwner] = useState<"EMPRESA" | "CLIENTE">("EMPRESA");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setDescription(""); setAmount(""); setCategory("");
    setDate(new Date().toISOString().split("T")[0]);
    setOwner("EMPRESA"); setReceiptFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setShowForm(false);
  }

  async function handleAdd() {
    const val = parseFloat(amount.replace(",", "."));
    if (!description.trim() || isNaN(val) || val <= 0) return;

    let receiptUrl: string | undefined;
    if (receiptFile) {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", receiptFile);
      fd.append("processId", processId);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      receiptUrl = json.url;
      setUploading(false);
    }

    startTransition(async () => {
      await addProcessCost({
        processId, description, amount: val,
        category: category || undefined, date, owner, receiptUrl,
      });
      reset();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remover este custo?")) return;
    startTransition(() => deleteProcessCost(id, processId));
  }

  const approvedTotal = costs
    .filter((c) => c.approvalStatus === "APROVADO" && c.owner === "EMPRESA")
    .reduce((s, c) => s + c.amount, 0);
  const pendingTotal = costs
    .filter((c) => c.approvalStatus === "PENDENTE")
    .reduce((s, c) => s + c.amount, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-[var(--ink-900)]">
          Custos Operacionais
          {approvedTotal > 0 && (
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
              {BRL.format(approvedTotal)} aprovado
            </span>
          )}
          {pendingTotal > 0 && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
              {BRL.format(pendingTotal)} pendente
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-[var(--signal-500)] hover:underline"
        >
          + Lançar
        </button>
      </div>

      {showForm && (
        <div className="mb-4 border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col gap-2">
          {/* Quem arca */}
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="owner"
                value="EMPRESA"
                checked={owner === "EMPRESA"}
                onChange={() => setOwner("EMPRESA")}
                className="accent-[var(--ink-900)]"
              />
              Empresa
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="owner"
                value="CLIENTE"
                checked={owner === "CLIENTE"}
                onChange={() => setOwner("CLIENTE")}
                className="accent-[var(--ink-900)]"
              />
              Cliente
            </label>
            {owner === "CLIENTE" && (
              <span className="text-xs text-blue-600 self-center">
                Será repassado ao cliente como custo do processo
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição (ex: Cartório, Deslocamento...)"
              className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria (opcional)"
              className="border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Valor (R$)"
              className="border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer border border-gray-200 rounded px-2 py-1.5 bg-white hover:bg-gray-50">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {receiptFile ? receiptFile.name : "Anexar recibo"}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Este custo será enviado para aprovação do administrador.
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isPending || uploading || !description.trim() || !amount}
              className="px-3 py-1.5 bg-[var(--ink-900)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? "Enviando..." : isPending ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={reset} className="text-xs text-gray-400 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {costs.length === 0 && !showForm && (
        <p className="text-xs text-gray-400">Nenhum custo lançado.</p>
      )}

      {costs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {costs.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-sm border border-gray-100 rounded p-2 bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-medium text-[var(--ink-900)] truncate">{c.description}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.approvalStatus]}`}>
                    {STATUS_LABELS[c.approvalStatus]}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
                    {c.owner === "EMPRESA" ? "Empresa" : "Cliente"}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {c.category && <span className="mr-1">{c.category} ·</span>}
                  {new Date(c.date).toLocaleDateString("pt-BR")}
                  {c.user && <span className="ml-1">· {c.user.name}</span>}
                </p>
                {c.approvalStatus === "REJEITADO" && c.rejectionReason && (
                  <p className="text-xs text-red-500 mt-0.5">Motivo: {c.rejectionReason}</p>
                )}
                {c.receiptUrl && (
                  <a
                    href={c.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--signal-500)] hover:underline mt-0.5 inline-block"
                  >
                    Ver recibo →
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 flex-none">
                <span className="font-semibold text-[var(--ink-900)] text-sm">{BRL.format(c.amount)}</span>
                {(isAdmin || c.userId === currentUserId) && c.approvalStatus !== "APROVADO" && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={isPending}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

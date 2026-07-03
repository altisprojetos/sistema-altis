"use client";

import { useState, useTransition } from "react";
import { createAccountEntry, deleteAccountEntry } from "@/lib/actions/financeiro";

export function AddEntryForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));

  function reset() {
    setDescription("");
    setAmount("");
    setCategory("");
    setDate(new Date().toISOString().substring(0, 10));
    setType("ENTRADA");
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(amount.replace(",", "."));
    if (!description.trim() || isNaN(val) || val <= 0) return;
    startTransition(async () => {
      await createAccountEntry({
        description,
        amount: val,
        type,
        category: category || undefined,
        date: new Date(date + "T12:00:00"),
      });
      reset();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-[var(--signal-500)] text-white rounded text-sm font-semibold hover:opacity-90"
      >
        + Lançar Movimentação
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-[var(--ink-900)] text-sm">Nova Movimentação</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Tipo */}
        <div className="flex gap-2">
          <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border cursor-pointer transition-all text-sm font-medium ${
            type === "ENTRADA" ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}>
            <input
              type="radio"
              name="type"
              value="ENTRADA"
              checked={type === "ENTRADA"}
              onChange={() => setType("ENTRADA")}
              className="sr-only"
            />
            ↑ Entrada
          </label>
          <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border cursor-pointer transition-all text-sm font-medium ${
            type === "SAIDA" ? "bg-red-600 text-white border-red-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}>
            <input
              type="radio"
              name="type"
              value="SAIDA"
              checked={type === "SAIDA"}
              onChange={() => setType("SAIDA")}
              className="sr-only"
            />
            ↓ Saída
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Descrição *</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Recebimento cliente João"
            required
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Valor (R$) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            required
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 max-w-xs">
        <label className="text-xs font-semibold text-gray-500">Categoria (opcional)</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Ex: Serviços, Fornecedores…"
          className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
        />
      </div>

      <div className="flex gap-2 mt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-1.5 bg-[var(--signal-500)] text-white rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Lançar"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-1.5 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (!confirm("Remover este lançamento?")) return;
        startTransition(() => deleteAccountEntry(id));
      }}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {isPending ? "…" : "Remover"}
    </button>
  );
}

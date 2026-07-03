"use client";

import { useState, useTransition } from "react";
import { createCost, deleteCost } from "@/lib/actions/financeiro";

export function AddCostForm({ month, year }: { month: number; year: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"FIXO" | "VARIAVEL">("FIXO");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  function reset() {
    setDescription("");
    setAmount("");
    setCategory("");
    setType("FIXO");
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(amount.replace(",", "."));
    if (!description.trim() || isNaN(val) || val <= 0) return;
    startTransition(async () => {
      await createCost({
        description,
        amount: val,
        type,
        category: category || undefined,
        month,
        year,
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
        + Adicionar Custo
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-[var(--ink-900)] text-sm">Novo Custo</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "FIXO" | "VARIAVEL")}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
          >
            <option value="FIXO">Fixo</option>
            <option value="VARIAVEL">Variável</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Categoria (opcional)</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex: Aluguel, Software…"
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
            placeholder="Ex: Aluguel do escritório"
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

      <div className="flex gap-2 mt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-1.5 bg-[var(--signal-500)] text-white rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Salvar"}
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

export function DeleteCostButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (!confirm("Remover este custo?")) return;
        startTransition(() => deleteCost(id));
      }}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {isPending ? "…" : "Remover"}
    </button>
  );
}

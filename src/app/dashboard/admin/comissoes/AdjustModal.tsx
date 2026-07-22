"use client";

import { useState } from "react";
import { adjustCommission } from "@/lib/actions/admin";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function AdjustButton({
  commissionId,
  currentAmount,
  clientName,
}: {
  commissionId: string;
  currentAmount: number;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentAmount.toFixed(2).replace(".", ","));
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function parseValue(s: string) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }

  async function handleSave() {
    const parsed = parseValue(value);
    if (isNaN(parsed) || parsed < 0) { setError("Valor inválido."); return; }
    if (!note.trim()) { setError("Informe o motivo do ajuste."); return; }
    setLoading(true); setError("");
    try {
      const res = await adjustCommission(commissionId, parsed, note.trim());
      if (res && "error" in res) { setError(res.error ?? "Erro ao ajustar."); return; }
      setOpen(false);
    } catch {
      setError("Erro ao salvar ajuste.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setValue(currentAmount.toFixed(2).replace(".", ",")); setNote(""); setError(""); setOpen(true); }}
        className="text-xs px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100"
        title="Ajustar valor da comissão"
      >
        Ajustar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && !loading && setOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-[var(--ink-900)] text-base mb-1">Ajustar Comissão</h3>
            <p className="text-xs text-gray-500 mb-4">{clientName} · atual: {BRL.format(currentAmount)}</p>

            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Novo valor (R$)</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--signal-500)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Motivo do ajuste</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Descreva o motivo..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--signal-500)] placeholder:text-gray-300"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

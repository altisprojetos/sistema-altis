"use client";

import { useState } from "react";
import { savePaymentLabel } from "@/lib/actions/processes";

const PAYMENT_OPTIONS = [
  "À combinar com o cliente",
  "À vista",
  "Parcelado em 2 (duas) parcelas",
  "Parcelado em 3 (três) parcelas",
  "50% na assinatura do contrato e 50% na conclusão do serviço",
  "Na aprovação do financiamento",
  "Outro (descrever)",
];

export function ContratoButton({ processId }: { processId: string }) {
  const [open, setOpen] = useState(false);
  const [pagamento, setPagamento] = useState(PAYMENT_OPTIONS[0]);
  const [customPagamento, setCustomPagamento] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isCustom = pagamento === "Outro (descrever)";
  const valorFinal = isCustom ? customPagamento.trim() : pagamento;

  async function generate() {
    if (isCustom && !customPagamento.trim()) {
      setError("Descreva a forma de pagamento.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await savePaymentLabel(processId, valorFinal);
      if (res && "error" in res) {
        setError(res.error ?? "Erro ao salvar.");
        return;
      }
    } catch {
      setError("Erro ao salvar forma de pagamento.");
      return;
    } finally {
      setLoading(false);
    }
    window.open(`/api/contrato/${processId}`, "_blank");
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(""); }}
        className="inline-flex items-center gap-2 bg-[var(--signal-500)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Gerar Contrato
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && !loading && setOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-[var(--ink-900)] text-base mb-1">Forma de Pagamento</h3>
            <p className="text-xs text-gray-500 mb-4">
              Selecione a condição que será inserida no contrato.
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {PAYMENT_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    pagamento === opt
                      ? "border-[var(--signal-500)] bg-[var(--signal-500)] text-white"
                      : "border-gray-200 hover:border-gray-400 text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="pagamento-contrato"
                    value={opt}
                    checked={pagamento === opt}
                    onChange={() => setPagamento(opt)}
                    className="sr-only"
                  />
                  {opt}
                </label>
              ))}
            </div>

            {isCustom && (
              <div className="mb-4">
                <textarea
                  value={customPagamento}
                  onChange={(e) => setCustomPagamento(e.target.value)}
                  placeholder="Descreva a forma de pagamento..."
                  rows={3}
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:border-[var(--signal-500)] placeholder:text-gray-300"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 mb-3">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={generate}
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-[var(--signal-500)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Gerar Contrato"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";

const PAYMENT_OPTIONS = [
  "À vista",
  "Parcelado em 2 (duas) parcelas",
  "Parcelado em 3 (três) parcelas",
  "50% na assinatura do contrato e 50% na conclusão do serviço",
  "Na aprovação do financiamento",
  "À combinar com o cliente",
];

export function OrcamentoButton({ processId }: { processId: string }) {
  const [open, setOpen] = useState(false);
  const [pagamento, setPagamento] = useState(PAYMENT_OPTIONS[0]);
  const [observacoes, setObservacoes] = useState("");

  function generate() {
    const params = new URLSearchParams({ pagamento });
    if (observacoes.trim()) params.set("obs", observacoes.trim());
    window.open(`/api/orcamento/${processId}?${params}`, "_blank");
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-[var(--ink-900)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--ink-700)] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Gerar Orçamento (PDF)
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-[var(--ink-900)] text-base mb-1">Forma de Pagamento</h3>
            <p className="text-xs text-gray-500 mb-4">
              Selecione a condição que será exibida no orçamento.
            </p>

            <div className="flex flex-col gap-2 mb-6">
              {PAYMENT_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    pagamento === opt
                      ? "border-[var(--ink-900)] bg-[var(--ink-900)] text-white"
                      : "border-gray-200 hover:border-gray-400 text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="pagamento"
                    value={opt}
                    checked={pagamento === opt}
                    onChange={() => setPagamento(opt)}
                    className="sr-only"
                  />
                  {opt}
                </label>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Observações <span className="font-normal normal-case text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Valores sujeitos a alteração após vistoria técnica..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:border-[var(--ink-900)] placeholder:text-gray-300"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={generate}
                className="flex-1 py-2 rounded-lg bg-[var(--signal-500)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

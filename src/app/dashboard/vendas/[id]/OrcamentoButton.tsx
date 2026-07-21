"use client";

import { useState } from "react";
import { savePaymentLabel } from "@/lib/actions/processes";

const PAGAMENTO = "À combinar com o cliente";

export function OrcamentoButton({ processId }: { processId: string }) {
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      await savePaymentLabel(processId, PAGAMENTO);
    } finally {
      setLoading(false);
    }
    const params = new URLSearchParams({ pagamento: PAGAMENTO });
    window.open(`/api/orcamento/${processId}?${params}`, "_blank");
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-[var(--ink-900)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--ink-700)] transition-colors disabled:opacity-60"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      {loading ? "Gerando..." : "Gerar Orçamento (PDF)"}
    </button>
  );
}

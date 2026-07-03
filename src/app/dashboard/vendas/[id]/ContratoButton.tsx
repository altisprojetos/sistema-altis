"use client";

export function ContratoButton({ processId }: { processId: string }) {
  return (
    <button
      onClick={() => window.open(`/api/contrato/${processId}`, "_blank")}
      className="inline-flex items-center gap-2 bg-[var(--signal-500)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Gerar Contrato
    </button>
  );
}

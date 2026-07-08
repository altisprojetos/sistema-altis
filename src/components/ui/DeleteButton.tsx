"use client";

import { useState, useTransition } from "react";

export function DeleteButton({
  action,
  label = "Apagar",
  confirmMessage,
}: {
  action: () => Promise<unknown>;
  label?: string;
  confirmMessage: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isPending) {
    return (
      <span className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--steel-400)" }}>
        Apagando...
      </span>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded" style={{ borderColor: "#fca5a5", background: "#fff5f5" }}>
        <span className="text-xs" style={{ color: "#991b1b" }}>{confirmMessage}</span>
        <button
          onClick={() => startTransition(() => action())}
          className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
          style={{ background: "#dc2626", color: "white" }}
        >
          Sim, apagar
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded cursor-pointer"
          style={{ background: "transparent", color: "var(--steel-400)", border: "1px solid var(--steel-200)" }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-4 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors hover:bg-red-50"
      style={{ borderColor: "#fca5a5", color: "#dc2626" }}
    >
      {label}
    </button>
  );
}

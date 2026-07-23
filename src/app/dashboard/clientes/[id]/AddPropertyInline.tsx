"use client";

import { useState, useTransition } from "react";
import { addClientProperty } from "@/lib/actions/documentos";

export function AddPropertyInline({ clientId }: { clientId: string }) {
  const [open, setOpen]                 = useState(false);
  const [farmName, setFarmName]         = useState("");
  const [municipality, setMunicipality] = useState("");
  const [areaHa, setAreaHa]            = useState("");
  const [isPending, startTransition]    = useTransition();

  function reset() {
    setFarmName(""); setMunicipality(""); setAreaHa(""); setOpen(false);
  }

  function handleCreate() {
    if (!farmName.trim()) return;
    startTransition(async () => {
      await addClientProperty({
        clientId,
        farmName:     farmName.trim(),
        municipality: municipality.trim() || undefined,
        areaHa:       areaHa ? parseFloat(areaHa) : undefined,
      });
      reset();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-2 border border-dashed transition-colors hover:opacity-80"
        style={{ borderColor: "var(--signal-500)", color: "var(--signal-500)" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Adicionar Imóvel
      </button>
    );
  }

  return (
    <div
      className="mt-4 p-4 flex flex-col gap-3 border border-dashed"
      style={{ borderColor: "var(--signal-500)", background: "var(--paper-50)" }}
    >
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--signal-500)" }}>
        Novo Imóvel
      </p>

      <input
        type="text"
        value={farmName}
        onChange={(e) => setFarmName(e.target.value)}
        placeholder="Nome da fazenda / imóvel (obrigatório)"
        autoFocus
        className="w-full px-3 py-2 text-sm border outline-none"
        style={{ borderColor: "var(--steel-200)", background: "white", color: "var(--ink-900)" }}
      />

      <div className="flex gap-2">
        <input
          type="text"
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
          placeholder="Município"
          className="flex-1 px-3 py-2 text-sm border outline-none"
          style={{ borderColor: "var(--steel-200)", background: "white", color: "var(--ink-900)" }}
        />
        <input
          type="number"
          value={areaHa}
          onChange={(e) => setAreaHa(e.target.value)}
          placeholder="Área (ha)"
          min={0}
          step={0.01}
          className="w-28 px-3 py-2 text-sm border outline-none"
          style={{ borderColor: "var(--steel-200)", background: "white", color: "var(--ink-900)" }}
        />
      </div>

      <p className="text-[10px]" style={{ color: "var(--steel-400)" }}>
        Uma pasta para este imóvel será criada automaticamente em Documentos.
      </p>

      <div className="flex gap-2 justify-end">
        <button
          onClick={reset}
          className="text-xs hover:underline"
          style={{ color: "var(--steel-400)" }}
        >
          Cancelar
        </button>
        <button
          onClick={handleCreate}
          disabled={!farmName.trim() || isPending}
          className="text-xs px-4 py-2 font-bold uppercase tracking-wider disabled:opacity-40"
          style={{ background: "var(--ink-900)", color: "white" }}
        >
          {isPending ? "Criando…" : "Criar Imóvel"}
        </button>
      </div>
    </div>
  );
}

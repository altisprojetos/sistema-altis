"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissProspection, acceptProspection } from "@/lib/actions/prospeccoes";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Prospection = {
  id: string;
  nextContactDate: Date | null;
  createdAt: Date;
  process: {
    client: { id: string; name: string; type: string; phone: string | null };
    services: { serviceName: string; serviceGroup: string; negotiatedValue: number | null }[];
    seller: { name: string };
  };
};

function ProspeccaoCard({ p }: { p: Prospection }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "dismiss">("idle");
  const [contactDate, setContactDate] = useState("");

  const totalValue = p.process.services.reduce((s, sv) => s + (sv.negotiatedValue ?? 0), 0);

  const serviceGroups = [...new Set(p.process.services.map((s) => s.serviceGroup))];

  function handleAccept() {
    startTransition(async () => {
      const newId = await acceptProspection(p.id);
      router.push(`/dashboard/vendas/${newId}`);
    });
  }

  function handleDismiss(e: React.FormEvent) {
    e.preventDefault();
    const date = contactDate ? new Date(contactDate + "T12:00:00") : undefined;
    startTransition(async () => {
      await dismissProspection(p.id, date);
      setMode("idle");
    });
  }

  return (
    <div className="bg-white rounded-lg border border-amber-200 p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[var(--ink-900)]">{p.process.client.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {p.process.client.type === "RURAL" ? "Rural" : "Urbano"}
            {p.process.client.phone && ` · ${p.process.client.phone}`}
          </p>
        </div>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
          Oportunidade
        </span>
      </div>

      {/* Histórico de serviços */}
      <div className="bg-gray-50 rounded p-3 text-xs text-gray-600">
        <p className="font-semibold text-gray-500 uppercase tracking-wider mb-1">Serviços anteriores</p>
        {p.process.services.slice(0, 3).map((s, i) => (
          <p key={i} className="truncate">{s.serviceName}</p>
        ))}
        {p.process.services.length > 3 && (
          <p className="text-gray-400">+{p.process.services.length - 3} serviço(s)…</p>
        )}
        {totalValue > 0 && (
          <p className="font-semibold text-[var(--ink-900)] mt-1.5">{BRL.format(totalValue)}</p>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Áreas: {serviceGroups.join(", ")} · Vendedor: {p.process.seller.name}
      </p>

      {/* Ações */}
      {mode === "idle" ? (
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={handleAccept}
            className="flex-1 py-2 bg-[var(--signal-500)] text-white rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Abrindo…" : "Iniciar Novo Processo"}
          </button>
          <button
            disabled={isPending}
            onClick={() => setMode("dismiss")}
            className="px-3 py-2 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Adiar
          </button>
        </div>
      ) : (
        <form onSubmit={handleDismiss} className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-500">Lembrar em (opcional)</label>
          <input
            type="date"
            value={contactDate}
            onChange={(e) => setContactDate(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-1.5 bg-gray-700 text-white rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Salvando…" : contactDate ? "Adiar com lembrete" : "Dispensar"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ProspeccaoCards({ prospections }: { prospections: Prospection[] }) {
  if (prospections.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Nenhuma oportunidade de reengajamento pendente.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {prospections.map((p) => (
        <ProspeccaoCard key={p.id} p={p} />
      ))}
    </div>
  );
}

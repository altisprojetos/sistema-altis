"use client";

import { useState } from "react";
import Link from "next/link";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

function fmt(v: number) { return BRL.format(v); }
function fmtDate(d: Date | string | null | undefined) { return d ? DATE.format(new Date(d)) : "—"; }

type Process = {
  id: string;
  completedAt: Date | null;
  client: { name: string; type: string };
  analyst: { name: string } | null;
  seller: { name: string } | null;
  services: { serviceName: string; negotiatedValue: number | null }[];
};

export function OpsFinalizadosSection({ processes }: { processes: Process[] }) {
  const [visible, setVisible] = useState(false);

  if (processes.length === 0) return null;

  const total = processes.reduce(
    (s, p) => s + p.services.reduce((ss, sv) => ss + (sv.negotiatedValue ?? 0), 0),
    0
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setVisible((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
      >
        <div className="flex items-center gap-3">
          <span className="text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <span className="font-semibold text-gray-700">Finalizados</span>
          <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
            {processes.length}
          </span>
          <span className="text-xs text-gray-400">{fmt(total)}</span>
        </div>
        <span className="text-gray-400 text-xs">
          {visible ? "▲ Ocultar" : "▼ Mostrar"}
        </span>
      </button>

      {visible && (
        <div className="divide-y divide-gray-100">
          {processes.map((p) => {
            const valorTotal = p.services.reduce((s, sv) => s + (sv.negotiatedValue ?? 0), 0);
            return (
              <Link
                key={p.id}
                href={`/dashboard/operacao/${p.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-[var(--ink-900)] truncate">{p.client.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {p.services.map((sv) => sv.serviceName).join(", ") || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0 ml-4 text-right text-xs text-gray-500">
                  {p.analyst && <span className="hidden sm:block">{p.analyst.name}</span>}
                  <span>{fmtDate(p.completedAt)}</span>
                  <span className="font-semibold text-sm text-green-700">{fmt(valorTotal)}</span>
                  <span className="text-gray-300">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function ExtratoButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [status, setStatus] = useState<"" | "PENDENTE" | "PAGA">("");

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  function generate() {
    const params = new URLSearchParams();
    params.set("month", String(month));
    params.set("year", String(year));
    if (status) params.set("status", status);
    window.open(`/api/extrato-comissao/${userId}?${params}`, "_blank");
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 bg-[var(--ink-900)] text-white rounded hover:opacity-80"
        title={`Gerar extrato de ${userName}`}
      >
        Extrato
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs mx-4">
            <h3 className="font-bold text-[var(--ink-900)] text-base mb-1">Gerar Extrato</h3>
            <p className="text-xs text-gray-500 mb-4">{userName}</p>

            <div className="flex flex-col gap-3 mb-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Mês</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--signal-500)]"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Ano</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--signal-500)]"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "" | "PENDENTE" | "PAGA")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--signal-500)]"
                >
                  <option value="">Todos</option>
                  <option value="PENDENTE">Pendentes</option>
                  <option value="PAGA">Pagas</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={generate}
                className="flex-1 py-2 rounded-lg bg-[var(--ink-900)] text-white text-sm font-semibold hover:opacity-90"
              >
                Gerar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { getAccountEntries } from "@/lib/actions/financeiro";
import PageHeader from "@/components/ui/PageHeader";
import Link from "next/link";
import { AddEntryForm, DeleteEntryButton } from "./SaldoActions";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function SaldoPage() {
  const entries = await getAccountEntries();

  const totalEntradas = entries.filter((e) => e.type === "ENTRADA").reduce((s, e) => s + e.amount, 0);
  const totalSaidas = entries.filter((e) => e.type === "SAIDA").reduce((s, e) => s + e.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Saldo em Conta"
        subtitle="Movimentações financeiras da empresa"
      />

      <div className="flex gap-2 text-sm">
        {[
          { href: "/dashboard/financeiro", label: "Visão Geral" },
          { href: "/dashboard/financeiro/previsao", label: "Previsão" },
          { href: "/dashboard/financeiro/custos", label: "Custos" },
          { href: "/dashboard/financeiro/saldo", label: "Saldo em Conta" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 rounded border border-[var(--ink-900)] bg-[var(--ink-900)] text-white font-medium"
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total de Entradas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{BRL.format(totalEntradas)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total de Saídas</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{BRL.format(totalSaidas)}</p>
        </div>
        <div className={`rounded-lg border p-5 ${saldo >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Saldo Atual</p>
          <p className={`text-2xl font-bold mt-1 ${saldo >= 0 ? "text-green-700" : "text-red-700"}`}>
            {BRL.format(saldo)}
          </p>
        </div>
      </div>

      <AddEntryForm />

      {/* Extrato */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Nenhuma movimentação registrada.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Data</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Descrição</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Categoria</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Tipo</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Valor</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Saldo</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(() => {
                // Calculate running balance from oldest to newest, then reverse for display
                const sorted = [...entries].sort(
                  (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                );
                let running = 0;
                const withBalance = sorted.map((e) => {
                  running += e.type === "ENTRADA" ? e.amount : -e.amount;
                  return { ...e, runningBalance: running };
                });
                // Display newest first
                return withBalance.reverse().map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-500">{DATE.format(new Date(e.date))}</td>
                    <td className="px-5 py-3 font-medium text-[var(--ink-900)]">{e.description}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{e.category ?? "—"}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.type === "ENTRADA"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {e.type === "ENTRADA" ? "↑ Entrada" : "↓ Saída"}
                      </span>
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${
                      e.type === "ENTRADA" ? "text-green-600" : "text-red-600"
                    }`}>
                      {e.type === "ENTRADA" ? "+" : "−"}{BRL.format(e.amount)}
                    </td>
                    <td className={`px-5 py-3 text-right text-xs ${
                      e.runningBalance >= 0 ? "text-gray-500" : "text-red-500 font-semibold"
                    }`}>
                      {BRL.format(e.runningBalance)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DeleteEntryButton id={e.id} />
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

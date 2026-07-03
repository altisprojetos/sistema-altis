import { getCosts } from "@/lib/actions/financeiro";
import PageHeader from "@/components/ui/PageHeader";
import Link from "next/link";
import { AddCostForm, DeleteCostButton } from "./CostActions";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function CustosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { mes, ano } = await searchParams;
  const now = new Date();
  const month = mes ? parseInt(mes) : now.getMonth() + 1;
  const year = ano ? parseInt(ano) : now.getFullYear();

  const costs = await getCosts(month, year);

  const totalFixo = costs.filter((c) => c.type === "FIXO").reduce((s, c) => s + c.amount, 0);
  const totalVariavel = costs.filter((c) => c.type === "VARIAVEL").reduce((s, c) => s + c.amount, 0);
  const total = totalFixo + totalVariavel;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Custos e Despesas"
          subtitle={`${MONTHS[month - 1]}/${year}`}
        />
        <form className="flex gap-2 items-center">
          <select
            name="mes"
            defaultValue={month}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            name="ano"
            defaultValue={year}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 bg-[var(--ink-900)] text-white rounded text-sm hover:opacity-90"
          >
            Filtrar
          </button>
        </form>
      </div>

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

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Custos Fixos</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{BRL.format(totalFixo)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Custos Variáveis</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{BRL.format(totalVariavel)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total</p>
          <p className="text-xl font-bold text-red-700 mt-1">{BRL.format(total)}</p>
        </div>
      </div>

      {/* Formulário de adição */}
      <AddCostForm month={month} year={year} />

      {/* Tabela */}
      {costs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Nenhum custo registrado em {MONTHS[month - 1]}/{year}.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Fixos */}
          {costs.filter((c) => c.type === "FIXO").length > 0 && (
            <>
              <div className="px-5 py-2 bg-blue-50 border-b border-gray-100">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Fixos</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {costs
                    .filter((c) => c.type === "FIXO")
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-[var(--ink-900)]">{c.description}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{c.category ?? "—"}</td>
                        <td className="px-5 py-3 text-right font-semibold text-red-600">
                          {BRL.format(c.amount)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <DeleteCostButton id={c.id} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}

          {/* Variáveis */}
          {costs.filter((c) => c.type === "VARIAVEL").length > 0 && (
            <>
              <div className="px-5 py-2 bg-orange-50 border-b border-gray-100 border-t border-t-gray-200">
                <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Variáveis</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {costs
                    .filter((c) => c.type === "VARIAVEL")
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-[var(--ink-900)]">{c.description}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{c.category ?? "—"}</td>
                        <td className="px-5 py-3 text-right font-semibold text-red-600">
                          {BRL.format(c.amount)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <DeleteCostButton id={c.id} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}

          {/* Total */}
          <div className="px-5 py-3 border-t-2 border-gray-200 bg-gray-50 flex justify-between">
            <span className="font-bold text-gray-700 text-sm">Total do mês</span>
            <span className="font-bold text-red-700">{BRL.format(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

import { getFinanceiroDashboard, getMonthlyChartData, getServiceBreakdown } from "@/lib/actions/financeiro";
import PageHeader from "@/components/ui/PageHeader";
import Link from "next/link";
import { MonthlyBarChart, ServicePieChart } from "./FinanceiroCharts";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function fmt(v: number) { return BRL.format(v); }

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { mes, ano } = await searchParams;
  const now = new Date();
  const month = mes ? parseInt(mes) : now.getMonth() + 1;
  const year = ano ? parseInt(ano) : now.getFullYear();

  const [dashboard, chartData, serviceBreakdown] = await Promise.all([
    getFinanceiroDashboard(month, year),
    getMonthlyChartData(),
    getServiceBreakdown(),
  ]);

  const resultado = dashboard.totalReal - dashboard.totalCustos;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Financeiro"
          subtitle="Visão geral do desempenho financeiro"
        />
        {/* Seletor de mês/ano */}
        <form className="flex gap-2 items-center text-sm">
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

      {/* Nav links */}
      <div className="flex gap-2 text-sm flex-wrap">
        {[
          { href: "/dashboard/financeiro", label: "Visão Geral" },
          { href: "/dashboard/financeiro/previsao", label: "Previsão" },
          { href: "/dashboard/financeiro/custos", label: "Custos" },
          { href: "/dashboard/financeiro/saldo", label: "Saldo em Conta" },
          { href: "/dashboard/financeiro/desempenho", label: "Desempenho" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 border border-[var(--ink-900)] bg-[var(--ink-900)] text-white font-medium"
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Previsão de Faturamento"
          value={fmt(dashboard.totalPrevisao)}
          sub={`${dashboard.previsao.length} processo(s) previstos`}
          color="text-blue-600"
        />
        <SummaryCard
          label="Faturamento Real"
          value={fmt(dashboard.totalReal)}
          sub={`${dashboard.faturadoReal.length} processo(s) finalizados`}
          color="text-[var(--ink-900)]"
        />
        <SummaryCard
          label="Total de Custos"
          value={fmt(dashboard.totalCustos)}
          sub={`${dashboard.costs.length} lançamento(s)`}
          color="text-red-600"
        />
        <SummaryCard
          label={resultado >= 0 ? "Resultado Líquido" : "Prejuízo"}
          value={fmt(resultado)}
          sub={`Saldo em conta: ${fmt(dashboard.saldo)}`}
          color={resultado >= 0 ? "text-green-600" : "text-red-600"}
        />
      </div>

      {/* Comissões pendentes */}
      {dashboard.comissoesPendentes > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-5 py-3 flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-yellow-800">Comissões a pagar: </span>
            <span className="text-yellow-700">{fmt(dashboard.comissoesPendentes)}</span>
          </div>
          <Link href="/dashboard/admin/comissoes" className="text-xs text-yellow-700 underline">
            Ver comissões →
          </Link>
        </div>
      )}

      {/* Gráfico mensal */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-[var(--ink-900)] mb-4">Faturamento — Últimos 12 meses</h2>
        <MonthlyBarChart data={chartData} />
      </div>

      {/* Linha inferior: Previsão vs Real do mês + Serviços */}
      <div className="grid grid-cols-2 gap-4">
        {/* Processos previstos */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-[var(--ink-900)] mb-3">
            Previsão — {MONTHS[month - 1]}/{year}
          </h2>
          {dashboard.previsao.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma previsão para este mês.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {dashboard.previsao.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 text-[var(--ink-900)] font-medium">{p.client.name}</td>
                    <td className="py-2 text-right font-semibold text-blue-600">
                      {fmt(p.negotiatedValue ?? p.totalValue ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Serviços por grupo */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-[var(--ink-900)] mb-3">Serviços por Área</h2>
          <ServicePieChart data={serviceBreakdown} />
        </div>
      </div>

      {/* Processos finalizados no mês */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-[var(--ink-900)] mb-3">
          Faturamentos Realizados — {MONTHS[month - 1]}/{year}
        </h2>
        {dashboard.faturadoReal.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum processo finalizado neste mês.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left py-2 font-semibold text-gray-500 text-xs uppercase">Cliente</th>
                <th className="text-left py-2 font-semibold text-gray-500 text-xs uppercase">Serviço(s)</th>
                <th className="text-right py-2 font-semibold text-gray-500 text-xs uppercase">Valor</th>
                <th className="text-right py-2 font-semibold text-gray-500 text-xs uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dashboard.faturadoReal.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 font-medium text-[var(--ink-900)]">{p.client.name}</td>
                  <td className="py-2.5 text-gray-500 text-xs max-w-[220px] truncate">
                    {p.services.map((s) => s.serviceName).join(", ")}
                  </td>
                  <td className="py-2.5 text-right font-semibold">
                    {fmt(p.negotiatedValue ?? p.totalValue ?? 0)}
                  </td>
                  <td className="py-2.5 text-right text-gray-500">
                    {p.completedAt
                      ? new Date(p.completedAt).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Custos do mês */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--ink-900)]">
            Custos — {MONTHS[month - 1]}/{year}
          </h2>
          <Link
            href="/dashboard/financeiro/custos"
            className="text-xs text-[var(--signal-500)] hover:underline"
          >
            Gerenciar custos →
          </Link>
        </div>
        {dashboard.costs.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum custo registrado neste mês.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {dashboard.costs.map((c) => (
                <tr key={c.id}>
                  <td className="py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium mr-2 ${
                      c.type === "FIXO"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-orange-50 text-orange-700"
                    }`}>
                      {c.type === "FIXO" ? "Fixo" : "Variável"}
                    </span>
                    <span className="text-[var(--ink-900)]">{c.description}</span>
                    {c.category && <span className="text-gray-400 text-xs ml-2">{c.category}</span>}
                  </td>
                  <td className="py-2 text-right font-semibold text-red-600">{fmt(c.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200">
                <td className="py-2 font-semibold text-gray-700">Total</td>
                <td className="py-2 text-right font-bold text-red-700">{fmt(dashboard.totalCustos)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

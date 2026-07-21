import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Link from "next/link";
import { getDesempenhoVendedores, getDesempenhoOperadores } from "@/lib/actions/financeiro";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v: number) => BRL.format(v);

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function DesempenhoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string; tipo?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const roles = session.user.roles;
  if (!roles.includes("ADMIN") && !roles.includes("FINANCEIRO")) redirect("/dashboard");

  const { mes, ano, tipo } = await searchParams;
  const now = new Date();
  const month = mes ? parseInt(mes) : now.getMonth() + 1;
  const year = ano ? parseInt(ano) : now.getFullYear();
  const view = tipo === "operador" ? "operador" : "vendedor";

  const [vendedores, operadores] = await Promise.all([
    view === "vendedor" ? getDesempenhoVendedores(month, year) : Promise.resolve([]),
    view === "operador" ? getDesempenhoOperadores(month, year) : Promise.resolve([]),
  ]);

  const dados = view === "vendedor" ? vendedores : operadores;

  // Totais
  const totalProcessos = dados.reduce((s, d) => s + d.totalProcessos, 0);
  const totalFinalizadosMes = dados.reduce((s, d) => s + d.finalizadosMes, 0);
  const totalValorMes = view === "vendedor"
    ? vendedores.reduce((s, d) => s + d.valorRealizado, 0)
    : operadores.reduce((s, d) => s + d.valorFinalizadoMes, 0);
  const totalValorGeral = dados.reduce((s, d) => s + d.valorTotal, 0);
  const totalComPendentes = dados.reduce((s, d) => s + d.comissoesPendentes, 0);
  const totalComPagas = dados.reduce((s, d) => s + d.comissoesPagas, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Desempenho"
          subtitle="Análise individual por vendedor e operador"
        />
        <form className="flex gap-2 items-center text-sm">
          <select
            name="mes"
            defaultValue={month}
            className="border border-gray-200 px-2 py-1.5 text-sm focus:outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            name="ano"
            defaultValue={year}
            className="border border-gray-200 px-2 py-1.5 text-sm focus:outline-none"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <input type="hidden" name="tipo" value={view} />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm font-semibold text-white"
            style={{ background: "var(--ink-900)" }}
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Nav do financeiro */}
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
            className="px-3 py-1.5 border font-medium"
            style={{
              borderColor: l.href === "/dashboard/financeiro/desempenho" ? "var(--signal-500)" : "var(--ink-900)",
              background: l.href === "/dashboard/financeiro/desempenho" ? "var(--signal-500)" : "var(--ink-900)",
              color: "white",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Toggle Vendedor / Operador */}
      <div className="flex gap-0 text-sm w-fit border" style={{ borderColor: "var(--steel-200)" }}>
        {[
          { label: "Vendedores", value: "vendedor" },
          { label: "Operadores", value: "operador" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard/financeiro/desempenho?mes=${month}&ano=${year}&tipo=${tab.value}`}
            className="px-5 py-2 font-semibold text-sm transition-colors"
            style={{
              background: view === tab.value ? "var(--ink-900)" : "white",
              color: view === tab.value ? "white" : "var(--ink-900)",
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Processos Ativos" value={String(totalProcessos)} color="var(--ink-900)" />
        <Card label={`Fechados — ${MONTHS[month - 1]}/${year}`} value={String(totalFinalizadosMes)} color="#16a34a" />
        <Card label={`Valor Realizado — ${MONTHS[month - 1]}/${year}`} value={fmt(totalValorMes)} color="var(--ink-900)" />
        <Card label="Valor Total Histórico" value={fmt(totalValorGeral)} color="var(--signal-500)" />
      </div>

      {/* Tabela individual */}
      <div className="bg-white border" style={{ borderColor: "var(--steel-200)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--steel-200)" }}>
          <h2 className="font-bold text-base" style={{ color: "var(--ink-900)" }}>
            {view === "vendedor" ? "Desempenho por Vendedor" : "Desempenho por Operador"}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--steel-400)" }}>
            Referência: {MONTHS[month - 1]}/{year}
          </p>
        </div>

        <div className="overflow-x-auto">
          {view === "vendedor" ? (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--paper-50)", borderBottom: "1px solid var(--steel-200)" }}>
                  <Th left>Vendedor</Th>
                  <Th>Processos</Th>
                  <Th>Fechados no Mês</Th>
                  <Th>Previsões no Mês</Th>
                  <Th>Valor Realizado (Mês)</Th>
                  <Th>Valor Previsto (Mês)</Th>
                  <Th>Valor Total Histórico</Th>
                  <Th>Comissão Pendente</Th>
                  <Th>Comissão Paga</Th>
                </tr>
              </thead>
              <tbody>
                {vendedores.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-sm" style={{ color: "var(--steel-400)" }}>
                      Nenhum vendedor cadastrado.
                    </td>
                  </tr>
                ) : (
                  vendedores.map((v, i) => (
                    <tr
                      key={v.id}
                      style={{ background: i % 2 === 0 ? "white" : "var(--paper-50)", borderBottom: "1px solid var(--steel-100)" }}
                    >
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--ink-900)" }}>
                        {v.name}
                        <span className="ml-2 text-xs font-normal" style={{ color: "var(--steel-400)" }}>
                          {v.commissionRate}% comissão
                        </span>
                      </td>
                      <Td>{v.totalProcessos}</Td>
                      <Td highlight={v.finalizadosMes > 0} color="#16a34a">{v.finalizadosMes}</Td>
                      <Td>{v.previsaoMes}</Td>
                      <Td>{fmt(v.valorRealizado)}</Td>
                      <Td color="#2563eb">{fmt(v.valorPrevisto)}</Td>
                      <Td>{fmt(v.valorTotal)}</Td>
                      <Td color={v.comissoesPendentes > 0 ? "#d97706" : undefined}>{fmt(v.comissoesPendentes)}</Td>
                      <Td color="#16a34a">{fmt(v.comissoesPagas)}</Td>
                    </tr>
                  ))
                )}
              </tbody>
              {vendedores.length > 0 && (
                <tfoot>
                  <tr style={{ background: "var(--ink-900)", color: "white" }}>
                    <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider">TOTAL</td>
                    <Tdf>{totalProcessos}</Tdf>
                    <Tdf>{totalFinalizadosMes}</Tdf>
                    <Tdf>{vendedores.reduce((s, v) => s + v.previsaoMes, 0)}</Tdf>
                    <Tdf>{fmt(totalValorMes)}</Tdf>
                    <Tdf>{fmt(vendedores.reduce((s, v) => s + v.valorPrevisto, 0))}</Tdf>
                    <Tdf>{fmt(totalValorGeral)}</Tdf>
                    <Tdf>{fmt(totalComPendentes)}</Tdf>
                    <Tdf>{fmt(totalComPagas)}</Tdf>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--paper-50)", borderBottom: "1px solid var(--steel-200)" }}>
                  <Th left>Operador</Th>
                  <Th>Processos</Th>
                  <Th>Em Andamento</Th>
                  <Th>Finalizados no Mês</Th>
                  <Th>Valor Realizado (Mês)</Th>
                  <Th>Valor Total Histórico</Th>
                  <Th>Comissão Pendente</Th>
                  <Th>Comissão Paga</Th>
                </tr>
              </thead>
              <tbody>
                {operadores.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-sm" style={{ color: "var(--steel-400)" }}>
                      Nenhum operador cadastrado.
                    </td>
                  </tr>
                ) : (
                  operadores.map((op, i) => (
                    <tr
                      key={op.id}
                      style={{ background: i % 2 === 0 ? "white" : "var(--paper-50)", borderBottom: "1px solid var(--steel-100)" }}
                    >
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--ink-900)" }}>
                        {op.name}
                        <span className="ml-2 text-xs font-normal" style={{ color: "var(--steel-400)" }}>
                          {op.commissionRate}% comissão
                        </span>
                      </td>
                      <Td>{op.totalProcessos}</Td>
                      <Td color={op.emAndamento > 0 ? "#2563eb" : undefined}>{op.emAndamento}</Td>
                      <Td highlight={op.finalizadosMes > 0} color="#16a34a">{op.finalizadosMes}</Td>
                      <Td>{fmt(op.valorFinalizadoMes)}</Td>
                      <Td>{fmt(op.valorTotal)}</Td>
                      <Td color={op.comissoesPendentes > 0 ? "#d97706" : undefined}>{fmt(op.comissoesPendentes)}</Td>
                      <Td color="#16a34a">{fmt(op.comissoesPagas)}</Td>
                    </tr>
                  ))
                )}
              </tbody>
              {operadores.length > 0 && (
                <tfoot>
                  <tr style={{ background: "var(--ink-900)", color: "white" }}>
                    <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider">TOTAL</td>
                    <Tdf>{totalProcessos}</Tdf>
                    <Tdf>{operadores.reduce((s, op) => s + op.emAndamento, 0)}</Tdf>
                    <Tdf>{totalFinalizadosMes}</Tdf>
                    <Tdf>{fmt(totalValorMes)}</Tdf>
                    <Tdf>{fmt(totalValorGeral)}</Tdf>
                    <Tdf>{fmt(totalComPendentes)}</Tdf>
                    <Tdf>{fmt(totalComPagas)}</Tdf>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border p-5" style={{ borderColor: "var(--steel-200)" }}>
      <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--steel-400)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function Th({ children, left }: { children: React.ReactNode; left?: boolean }) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider ${left ? "text-left" : "text-right"}`}
      style={{ color: "var(--steel-400)" }}
    >
      {children}
    </th>
  );
}

function Td({ children, color, highlight }: { children: React.ReactNode; color?: string; highlight?: boolean }) {
  return (
    <td
      className="px-4 py-3 text-right text-sm"
      style={{ color: color ?? "var(--ink-900)", fontWeight: highlight ? 700 : undefined }}
    >
      {children}
    </td>
  );
}

function Tdf({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 text-right text-sm font-bold">{children}</td>
  );
}

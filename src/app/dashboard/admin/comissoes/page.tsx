import { getCommissions } from "@/lib/actions/admin";
import { getPendingProcessCosts } from "@/lib/actions/processes";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { PayButton, PayAllButton, PayAllGlobalButton } from "./PayActions";
import { CostApproveButton, CostRejectButton } from "./CostApprovalActions";
import { AdjustButton } from "./AdjustModal";
import { ExtratoButton } from "./ExtratoButton";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

function fmt(v: number) { return BRL.format(v); }
function fmtDate(d: Date | null | undefined) { return d ? DATE.format(new Date(d)) : "—"; }

type Commission = Awaited<ReturnType<typeof getCommissions>>[number];

function groupByUser(commissions: Commission[]) {
  const map = new Map<string, { userName: string; roles: string[]; items: Commission[] }>();
  for (const c of commissions) {
    const key = c.userId;
    if (!map.has(key)) {
      map.set(key, { userName: c.user.name, roles: c.user.roles, items: [] });
    }
    map.get(key)!.items.push(c);
  }
  return Array.from(map.entries()).map(([userId, g]) => ({ userId, ...g }));
}

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status === "PAGA" ? "PAGA" : status === "PENDENTE" ? "PENDENTE" : undefined;

  const [commissions, pendingCosts] = await Promise.all([
    getCommissions(filter ? { status: filter } : undefined),
    getPendingProcessCosts(),
  ]);
  const groups = groupByUser(commissions);

  const pendingAll = commissions.filter((c) => c.status === "PENDENTE");
  const totalPendente = pendingAll.reduce((s, c) => s + c.amount, 0);
  const totalCustosPendentes = pendingCosts.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aprovações"
        subtitle="Comissões, custos operacionais e despesas de processos"
      />

      {/* Sumário */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total pendente</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{fmt(totalPendente)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Comissões pendentes</p>
          <p className="text-2xl font-bold text-[var(--ink-900)] mt-1">{pendingAll.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Usuários com comissão</p>
          <p className="text-2xl font-bold text-[var(--ink-900)] mt-1">{groups.length}</p>
        </div>
      </div>

      {/* Custos pendentes de aprovação */}
      {pendingCosts.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--ink-900)]">
              Custos Aguardando Aprovação
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                {pendingCosts.length} · {fmt(totalCustosPendentes)}
              </span>
            </h2>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Processo / Cliente</th>
                  <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Descrição</th>
                  <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Lançado por</th>
                  <th className="text-center px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Tipo</th>
                  <th className="text-right px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Valor</th>
                  <th className="text-right px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Data</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingCosts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/operacao/${c.processId}`}
                        className="font-medium text-[var(--ink-900)] hover:underline"
                      >
                        {c.process?.client.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      <p>{c.description}</p>
                      {c.category && <p className="text-xs text-gray-400">{c.category}</p>}
                      {c.receiptUrl && (
                        <a
                          href={c.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[var(--signal-500)] hover:underline"
                        >
                          Ver recibo →
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      <p>{c.user?.name ?? "—"}</p>
                      {c.user && <Badge value={c.user.roles.join(" / ")} />}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.owner === "EMPRESA"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {c.owner === "EMPRESA" ? "Empresa" : "Cliente"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{fmt(c.amount)}</td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">
                      {fmtDate(c.date)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end items-center">
                        <CostApproveButton costId={c.id} />
                        <CostRejectButton costId={c.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 text-sm items-center">
        <Link
          href="/dashboard/admin/comissoes"
          className={`px-3 py-1.5 rounded border transition-colors ${
            !filter ? "bg-[var(--ink-900)] text-white border-[var(--ink-900)]" : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Todas
        </Link>
        <Link
          href="/dashboard/admin/comissoes?status=PENDENTE"
          className={`px-3 py-1.5 rounded border transition-colors ${
            filter === "PENDENTE" ? "bg-[var(--ink-900)] text-white border-[var(--ink-900)]" : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Pendentes
        </Link>
        <Link
          href="/dashboard/admin/comissoes?status=PAGA"
          className={`px-3 py-1.5 rounded border transition-colors ${
            filter === "PAGA" ? "bg-[var(--ink-900)] text-white border-[var(--ink-900)]" : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Pagas
        </Link>

        {pendingAll.length > 0 && (
          <PayAllGlobalButton count={pendingAll.length} total={totalPendente} />
        )}
      </div>

      {/* Grupos por usuário */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Nenhuma comissão encontrada.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const pending = group.items.filter((c) => c.status === "PENDENTE");
            const totalGrupo = group.items.reduce((s, c) => s + c.amount, 0);
            const totalPendenteGrupo = pending.reduce((s, c) => s + c.amount, 0);

            return (
              <div key={group.userId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Cabeçalho do grupo */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--ink-900)] text-white flex items-center justify-center text-sm font-bold">
                      {group.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--ink-900)]">{group.userName}</p>
                      <Badge value={group.roles.join(" / ")} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <ExtratoButton userId={group.userId} userName={group.userName} />
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">Total</p>
                      <p className="font-semibold">{fmt(totalGrupo)}</p>
                    </div>
                    {totalPendenteGrupo > 0 && (
                      <>
                        <div className="text-right">
                          <p className="text-gray-500 text-xs">Pendente</p>
                          <p className="font-semibold text-yellow-600">{fmt(totalPendenteGrupo)}</p>
                        </div>
                        <PayAllButton
                          userId={group.userId}
                          count={pending.length}
                          total={totalPendenteGrupo}
                          label={`Pagar todas as comissões de ${group.userName}`}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Tabela */}
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Cliente</th>
                      <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Serviço</th>
                      <th className="text-right px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Comissão</th>
                      <th className="text-center px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Status</th>
                      <th className="text-right px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Finalizado</th>
                      <th className="text-right px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase">Pago em</th>
                      <th className="px-5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.items.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-[var(--ink-900)]">
                          <Link href={`/dashboard/operacao/${c.process.id}`} className="hover:underline">
                            {c.process.client.name}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs max-w-[200px]">
                          <span className="truncate block">
                            {c.process.services.map((s) => s.serviceName).join(", ") || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <p className="font-semibold">{fmt(c.amount)}</p>
                          {c.originalAmount && (
                            <p className="text-xs text-gray-400 line-through">{fmt(c.originalAmount)}</p>
                          )}
                          {c.adjustmentNote && (
                            <p className="text-xs text-amber-600 italic mt-0.5">{c.adjustmentNote}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Badge value={c.status} />
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          {fmtDate(c.process.completedAt)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          {fmtDate(c.paidAt)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {c.status === "PENDENTE" && (
                              <AdjustButton
                                commissionId={c.id}
                                currentAmount={c.amount}
                                clientName={c.process.client.name}
                              />
                            )}
                            {c.status === "PENDENTE" && <PayButton commissionId={c.id} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

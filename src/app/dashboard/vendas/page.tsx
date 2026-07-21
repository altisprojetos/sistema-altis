import { auth } from "@/lib/auth";
import { getProcesses } from "@/lib/actions/processes";
import { getPendingProspectionsCount } from "@/lib/actions/prospeccoes";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { SalesStage } from "@prisma/client";

const STAGES: { key: SalesStage; label: string; color: string }[] = [
  { key: "PROSPECCAO", label: "Prospecção", color: "bg-gray-100 border-gray-300" },
  { key: "SERVICO_FECHADO", label: "Serviço Fechado", color: "bg-blue-50 border-blue-300" },
  { key: "DOCUMENTACAO_COLETADA", label: "Coletando Docs.", color: "bg-yellow-50 border-yellow-300" },
  { key: "ENVIADO_OPERACAO", label: "Enviado p/ Op.", color: "bg-green-50 border-green-300" },
  { key: "DEVOLVIDO_PENDENCIAS", label: "Devolvido", color: "bg-red-50 border-red-300" },
];

function formatCurrency(v: number | null) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; vendedor?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  const { search, vendedor } = await searchParams;

  const isAdmin = session.user.roles.some(r => ["ADMIN", "COORDENADOR"].includes(r));

  const [processes, prospectionsCount, vendedores] = await Promise.all([
    getProcesses({ search, sellerId: vendedor }),
    getPendingProspectionsCount(),
    isAdmin
      ? prisma.user.findMany({
          where: { roles: { hasSome: ["VENDEDOR", "ADMIN"] } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const byStage = Object.fromEntries(
    STAGES.map((s) => [s.key, processes.filter((p) => p.salesStage === s.key)])
  ) as Record<SalesStage, typeof processes>;

  const canCreate = session.user.roles.some(r => ["ADMIN", "VENDEDOR"].includes(r));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vendas"
        subtitle="Pipeline de processos comerciais"
        action={canCreate ? { label: "+ Novo Processo", href: "/dashboard/vendas/novo" } : undefined}
      />

      {/* Banner de oportunidades */}
      {prospectionsCount > 0 && (
        <Link
          href="/dashboard/vendas/prospeccoes"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 hover:bg-amber-100 transition-colors"
        >
          <div className="text-sm text-amber-800">
            <span className="font-semibold">🔔 {prospectionsCount} oportunidade(s)</span> de reengajamento —
            clientes com processos finalizados prontos para novos serviços
          </div>
          <span className="text-xs text-amber-600 font-semibold whitespace-nowrap ml-4">Ver →</span>
        </Link>
      )}

      {/* Busca + Filtro de vendedor */}
      <form method="GET" className="flex gap-2 flex-wrap items-center">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar cliente..."
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)] w-56"
        />
        {isAdmin && vendedores.length > 0 && (
          <select
            name="vendedor"
            defaultValue={vendedor ?? ""}
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Todos os vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--ink-900)] text-white rounded text-sm hover:opacity-90"
        >
          Filtrar
        </button>
        {(search || vendedor) && (
          <a href="/dashboard/vendas" className="text-sm text-gray-500 hover:underline">
            Limpar
          </a>
        )}
      </form>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const cards = byStage[stage.key] ?? [];
          return (
            <div
              key={stage.key}
              className={`flex-none w-72 border rounded-lg p-3 ${stage.color}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-700">{stage.label}</h3>
                <span className="text-xs bg-white border rounded-full px-2 py-0.5 text-gray-500">
                  {cards.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {cards.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Nenhum processo</p>
                )}
                {cards.map((p) => {
                  const total = p.services.reduce(
                    (s: number, sv: { negotiatedValue: number | null }) => s + (sv.negotiatedValue ?? 0),
                    0
                  );
                  return (
                    <Link
                      key={p.id}
                      href={`/dashboard/vendas/${p.id}`}
                      className="block bg-white rounded border border-gray-200 p-3 hover:border-[var(--signal-500)] hover:shadow-sm transition-all"
                    >
                      <p className="font-medium text-sm text-[var(--ink-900)] truncate">
                        {p.client.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {p.services.map((sv: { serviceName: string }) => sv.serviceName).join(", ")}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-semibold text-[var(--signal-500)]">
                          {formatCurrency(total)}
                        </span>
                        <Badge value={p.client.type} />
                      </div>
                      {stage.key === "DEVOLVIDO_PENDENCIAS" && p.devolutions?.[0] && (
                        <p className="text-xs text-red-600 mt-1 truncate">
                          ⚠ {p.devolutions[0].pendencies}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{p.seller?.name}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Totais */}
      <div className="flex gap-4 flex-wrap text-sm text-gray-600">
        <span>Total de processos: <strong>{processes.length}</strong></span>
        <span>
          Valor total:{" "}
          <strong>
            {formatCurrency(
              processes.reduce(
                (s, p) =>
                  s + p.services.reduce(
                    (ss: number, sv: { negotiatedValue: number | null }) => ss + (sv.negotiatedValue ?? 0),
                    0
                  ),
                0
              )
            )}
          </strong>
        </span>
      </div>
    </div>
  );
}

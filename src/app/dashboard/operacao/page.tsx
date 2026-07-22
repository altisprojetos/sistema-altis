import { auth } from "@/lib/auth";
import { getOperacaoProcesses } from "@/lib/actions/processes";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { OpsStage } from "@prisma/client";
import { OpsFinalizadosSection } from "./FinalizadosSection";

const STAGES: { key: OpsStage; label: string; color: string }[] = [
  { key: "A_INICIAR",  label: "A Iniciar",  color: "bg-gray-50  border-gray-300"  },
  { key: "ELABORAR",   label: "Elaborar",   color: "bg-blue-50  border-blue-300"  },
  { key: "ANALISE",    label: "Análise",    color: "bg-yellow-50 border-yellow-300" },
  { key: "DEVOLVIDO",  label: "Devolvido",  color: "bg-red-50   border-red-300"   },
  { key: "PARALISADO", label: "Paralisado", color: "bg-purple-50 border-purple-300"},
];

function fmt(v: number | null) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR");
}

export default async function OperacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; search?: string; analista?: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const { stage, search, analista } = await searchParams;
  const opsStage = (STAGES.find((s) => s.key === stage)?.key) as OpsStage | undefined;

  const isAdmin = session.user.roles.some(r => ["ADMIN", "COORDENADOR"].includes(r));

  const [processes, operadores] = await Promise.all([
    getOperacaoProcesses({ opsStage, search, analystId: analista }),
    isAdmin
      ? prisma.user.findMany({
          where: { roles: { hasSome: ["OPERADOR", "ADMIN"] } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const finalizados = processes.filter((p) => p.opsStage === "FINALIZADO");
  const ativos = processes.filter((p) => p.opsStage !== "FINALIZADO");

  const byStage = Object.fromEntries(
    STAGES.map((s) => [s.key, ativos.filter((p) => p.opsStage === s.key)])
  ) as Record<OpsStage, typeof processes>;

  const totalPending = ativos.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Operação"
        subtitle={`${totalPending} processo${totalPending !== 1 ? "s" : ""} em andamento`}
      />

      {/* Filtros */}
      <form method="GET" className="flex gap-2 flex-wrap items-center">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar cliente..."
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)] w-56"
        />
        <select
          name="stage"
          defaultValue={stage ?? ""}
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todas as etapas</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        {isAdmin && operadores.length > 0 && (
          <select
            name="analista"
            defaultValue={analista ?? ""}
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Todos os analistas</option>
            {operadores.map((op) => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--ink-900)] text-white rounded text-sm hover:opacity-90"
        >
          Filtrar
        </button>
        {(stage || search || analista) && (
          <a href="/dashboard/operacao" className="text-sm text-gray-500 hover:underline">
            Limpar
          </a>
        )}
      </form>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const cards = byStage[s.key] ?? [];
          if (opsStage && opsStage !== s.key && cards.length === 0) return null;
          return (
            <div
              key={s.key}
              className={`flex-none w-72 border rounded-lg p-3 ${s.color}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-700">{s.label}</h3>
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
                    (acc: number, sv: { negotiatedValue: number | null }) =>
                      acc + (sv.negotiatedValue ?? 0),
                    0
                  );
                  const overdue = p.reminders.filter(
                    (r: { dueDate: Date }) => new Date(r.dueDate) < new Date()
                  ).length;

                  return (
                    <Link
                      key={p.id}
                      href={`/dashboard/operacao/${p.id}`}
                      className="block bg-white rounded border border-gray-200 p-3 hover:border-[var(--signal-500)] hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-medium text-sm text-[var(--ink-900)] truncate">
                          {p.client.name}
                        </p>
                        <Badge value={p.client.type} />
                      </div>

                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {p.services.map((sv: { serviceName: string }) => sv.serviceName).join(", ")}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-semibold text-[var(--signal-500)]">
                          {fmt(total)}
                        </span>
                        {p.analyst ? (
                          <span className="text-xs text-gray-500">{p.analyst.name}</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Sem analista</span>
                        )}
                      </div>

                      {s.key === "DEVOLVIDO" && p.devolutions?.[0] && (
                        <p className="text-xs text-red-600 mt-1 truncate">
                          ⚠ {p.devolutions[0].pendencies}
                        </p>
                      )}

                      {overdue > 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          🔔 {overdue} lembrete{overdue > 1 ? "s" : ""} vencido{overdue > 1 ? "s" : ""}
                        </p>
                      )}

                      {p.sentToOpsAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Recebido em {fmtDate(p.sentToOpsAt)}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Finalizados — colapsável */}
      <OpsFinalizadosSection processes={finalizados} />
    </div>
  );
}

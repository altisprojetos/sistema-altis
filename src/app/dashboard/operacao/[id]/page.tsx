import { auth } from "@/lib/auth";
import { getProcessById } from "@/lib/actions/processes";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { DOCUMENT_NAMES, SERVICES } from "@/lib/services-catalog";
import { OpsActions } from "./OpsActions";
import { ReminderPanel } from "./ReminderPanel";
import { ProcessCostPanel } from "@/components/ProcessCostPanel";
import { EditDeadlineForm } from "./EditDeadlineForm";

const OPS_LABELS: Record<string, string> = {
  A_INICIAR: "A Iniciar", ELABORAR: "Elaborar", ANALISE: "Análise",
  DEVOLVIDO: "Devolvido", PARALISADO: "Paralisado", FINALIZADO: "Finalizado",
};
const OPS_ORDER = ["A_INICIAR","ELABORAR","ANALISE","FINALIZADO"];

function fmt(v: number | null | undefined) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function OperacaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.roles.some(r => ["ADMIN", "OPERADOR"].includes(r))) redirect("/dashboard");

  const { id } = await params;
  const process = await getProcessById(id).catch(() => null);
  if (!process) notFound();

  // Busca analistas disponíveis
  const analysts = await prisma.user.findMany({
    where: { roles: { hasSome: ["OPERADOR", "ADMIN"] }, active: true },
    select: { id: true, name: true, commissionRate: true },
    orderBy: { name: "asc" },
  });

  const docNums = Array.from(
    new Set(
      process.services
        .map((s: { serviceKey: string }) => s.serviceKey)
        .flatMap((key: string) => SERVICES.find((s) => s.key === key)?.docNumbers ?? [])
    )
  ).sort((a: number, b: number) => a - b) as number[];

  const totalValue = process.services.reduce(
    (s: number, sv: { negotiatedValue: number | null }) => s + (sv.negotiatedValue ?? 0), 0
  );

  const opsStageIndex = OPS_ORDER.indexOf(process.opsStage ?? "");

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/operacao" className="hover:text-[var(--signal-500)]">Operação</Link>
        <span>/</span>
        <span className="text-gray-700">{process.client.name}</span>
      </div>

      <PageHeader
        title={process.client.name}
        subtitle={`Enviado em ${fmtDate(process.sentToOpsAt)} · Vendedor: ${process.seller?.name}`}
      />

      {/* Progresso ops */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-[var(--ink-900)] mb-4">Etapa em Operação</h2>
        <div className="flex items-center gap-1 flex-wrap">
          {OPS_ORDER.map((key, i) => {
            const active = process.opsStage === key;
            const done = opsStageIndex > i;
            return (
              <div key={key} className="flex items-center gap-1">
                <div className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                  active ? "bg-[var(--signal-500)] text-white border-[var(--signal-500)]"
                        : done ? "bg-green-100 text-green-700 border-green-300"
                               : "bg-gray-100 text-gray-400 border-gray-200"
                }`}>
                  {OPS_LABELS[key]}
                </div>
                {i < OPS_ORDER.length - 1 && <span className="text-gray-300">›</span>}
              </div>
            );
          })}
          {(process.opsStage === "DEVOLVIDO" || process.opsStage === "PARALISADO") && (
            <Badge value={process.opsStage} />
          )}
        </div>

        {/* Devolução ativa */}
        {process.opsStage === "DEVOLVIDO" && process.devolutions?.[0] && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm font-semibold text-red-700">Devolvido ao vendedor</p>
            <p className="text-sm text-red-600 mt-1">{process.devolutions[0].pendencies}</p>
            <p className="text-xs text-red-400 mt-1">
              {fmtDate(process.devolutions[0].createdAt)}
            </p>
          </div>
        )}

        {/* Ações */}
        <OpsActions
          processId={process.id}
          currentStage={process.opsStage ?? "A_INICIAR"}
          analysts={analysts}
          currentAnalystId={process.analystId}
          totalValue={totalValue}
          pendingRemindersCount={process.reminders?.filter((r: { done: boolean }) => !r.done).length ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Serviços */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-[var(--ink-900)] mb-3">Serviços</h2>
            <div className="flex flex-col gap-2">
              {process.services.map((sv: {
                id: string; serviceName: string; serviceGroup: string;
                negotiatedValue: number | null; calculatedValue: number | null;
                hectares: number | null; squareMeters: number | null; financedValue: number | null;
              }) => (
                <div key={sv.id} className="border border-gray-100 rounded p-3 bg-gray-50 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{sv.serviceName}</p>
                    <p className="text-xs text-gray-500">{sv.serviceGroup}</p>
                    <div className="flex gap-3 text-xs text-gray-400 mt-1">
                      {sv.hectares && <span>{sv.hectares} ha</span>}
                      {sv.squareMeters && <span>{sv.squareMeters} m²</span>}
                      {sv.financedValue && <span>Fin: {fmt(sv.financedValue)}</span>}
                    </div>
                  </div>
                  <p className="font-bold text-[var(--signal-500)] text-sm">{fmt(sv.negotiatedValue)}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <div className="bg-[var(--ink-900)] text-white rounded px-4 py-2 text-right">
                <p className="text-xs opacity-60">Total</p>
                <p className="text-lg font-bold">{fmt(totalValue)}</p>
              </div>
            </div>
          </div>

          {/* Documentos */}
          {docNums.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-[var(--ink-900)] mb-3">Checklist de Documentos</h2>
              <ul className="flex flex-col gap-1">
                {docNums.map((n: number) => (
                  <li key={n} className="flex gap-2 items-start text-sm">
                    <span className="text-gray-400 min-w-6 text-right">{n}.</span>
                    <span className={n === 26 ? "font-semibold text-[var(--signal-500)]" : ""}>
                      {DOCUMENT_NAMES[n]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-[var(--ink-900)] mb-3">Histórico</h2>
            {process.timeline?.length === 0 ? (
              <p className="text-xs text-gray-400">Sem registros ainda.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {process.timeline.map((e: {
                  id: string; content: string; createdAt: Date; user: { name: string }
                }) => (
                  <div key={e.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-[var(--signal-500)] mt-1.5 flex-none" />
                    <div>
                      <p className="text-gray-700">{e.content}</p>
                      <p className="text-xs text-gray-400">{fmtDateTime(e.createdAt)} — {e.user.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Devoluções anteriores */}
          {process.devolutions?.length > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-[var(--ink-900)] mb-3">
                Histórico de Devoluções ({process.devolutions.length})
              </h2>
              <div className="flex flex-col gap-3">
                {process.devolutions.map((d: {
                  id: string; pendencies: string; createdAt: Date
                }, i: number) => (
                  <div key={d.id} className="border-l-2 border-red-300 pl-3 text-sm">
                    <p className="text-xs text-gray-400 mb-1">Devolução #{i + 1} · {fmtDate(d.createdAt)}</p>
                    <p className="text-gray-700">{d.pendencies}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Informações</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="font-medium">{process.client.name}</p>
                <Badge value={process.client.type} />
              </div>
              {process.client.farmName && (
                <div>
                  <p className="text-xs text-gray-400">Fazenda</p>
                  <p>{process.client.farmName}</p>
                  {process.client.areaHa && <p className="text-xs text-gray-500">{process.client.areaHa} ha</p>}
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Vendedor</p>
                <p>{process.seller?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Analista</p>
                <p>{process.analyst?.name ?? <span className="text-amber-600">Não atribuído</span>}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Previsão de conclusão</p>
                <EditDeadlineForm
                  processId={process.id}
                  currentDate={process.expectedCompletionDate}
                />
              </div>
              {process.completedAt && (
                <div>
                  <p className="text-xs text-gray-400">Finalizado em</p>
                  <p>{fmtDate(process.completedAt)}</p>
                </div>
              )}
            </div>
            <Link
              href={`/dashboard/clientes/${process.clientId}`}
              className="text-xs text-[var(--signal-500)] hover:underline mt-3 block"
            >
              Ver ficha do cliente →
            </Link>
          </div>

          {/* Comissões */}
          {process.commissions?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Comissões</h3>
              <div className="flex flex-col gap-2">
                {process.commissions.map((c: {
                  id: string; user: { name: string }; amount: number; status: string
                }) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{c.user.name}</p>
                      <p className="text-xs text-gray-500">{fmt(c.amount)}</p>
                    </div>
                    <Badge value={c.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lembretes */}
          <ReminderPanel processId={process.id} reminders={process.reminders ?? []} />

          {/* Custos Operacionais */}
          <ProcessCostPanel
            processId={process.id}
            costs={process.costs ?? []}
            currentUserId={session.user.id}
            isAdmin={session.user.roles.includes("ADMIN")}
          />

          {/* Banco de pagamento */}
          {process.bankPaymentStartDate && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Pagamento ao Banco
              </h3>
              <div className="flex flex-col gap-1 text-sm">
                <div>
                  <p className="text-xs text-gray-400">1ª parcela</p>
                  <p>{fmtDate(process.bankPaymentStartDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Parcelas</p>
                  <p>{process.bankPaymentCount} × {process.bankPaymentInterval}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

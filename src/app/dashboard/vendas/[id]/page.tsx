import { auth } from "@/lib/auth";
import { getProcessById } from "@/lib/actions/processes";
import { notFound, redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { DOCUMENT_NAMES } from "@/lib/services-catalog";
import { SalesStageActions } from "./SalesStageActions";
import DocumentChecklist from "./DocumentChecklist";
import { OrcamentoButton } from "./OrcamentoButton";
import { ContratoButton } from "./ContratoButton";
import { EditServicesModal } from "./EditServicesModal";
import { ReminderPanel } from "@/app/dashboard/operacao/[id]/ReminderPanel";
import { ProcessCostPanel } from "@/components/ProcessCostPanel";

function formatCurrency(v: number | null | undefined) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const STAGE_LABELS: Record<string, string> = {
  PROSPECCAO: "Prospecção",
  SERVICO_FECHADO: "Serviço Fechado",
  DOCUMENTACAO_COLETADA: "Coletando Documentação",
  ENVIADO_OPERACAO: "Enviado para Operação",
  DEVOLVIDO_PENDENCIAS: "Devolvido com Pendências",
};

const OPS_LABELS: Record<string, string> = {
  A_INICIAR: "A Iniciar",
  ELABORAR: "Elaborar",
  ANALISE: "Análise",
  DEVOLVIDO: "Devolvido",
  PARALISADO: "Paralisado",
  FINALIZADO: "Finalizado",
};

export default async function ProcessoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const process = await getProcessById(id).catch(() => null);
  if (!process) notFound();

  const roles = session.user.roles;
  const canEditSales = roles.some(r => ["ADMIN", "VENDEDOR"].includes(r));

  // Documentos únicos de todos os serviços
  const { SERVICES } = await import("@/lib/services-catalog");
  const serviceKeys = process.services.map((s: { serviceKey: string }) => s.serviceKey);
  const docNums = Array.from(
    new Set(
      serviceKeys.flatMap(
        (key: string) => SERVICES.find((s) => s.key === key)?.docNumbers ?? []
      )
    )
  ).sort((a: number, b: number) => a - b) as number[];

  const totalValue = process.services.reduce(
    (s: number, sv: { negotiatedValue: number | null }) => s + (sv.negotiatedValue ?? 0),
    0
  );

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/vendas" className="hover:text-[var(--signal-500)]">
          Vendas
        </Link>
        <span>/</span>
        <span className="text-gray-700">{process.client.name}</span>
      </div>

      <PageHeader
        title={process.client.name}
        subtitle={`Processo criado em ${formatDate(process.createdAt)}`}
      />

      {/* Progresso de etapas */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-[var(--ink-900)] mb-4 text-sm">Etapa Atual (Vendas)</h2>
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(STAGE_LABELS).map(([key, label], i, arr) => {
            const active = process.salesStage === key;
            const done =
              Object.keys(STAGE_LABELS).indexOf(process.salesStage) > i;
            return (
              <div key={key} className="flex items-center gap-1">
                <div
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                    active
                      ? "bg-[var(--signal-500)] text-white border-[var(--signal-500)]"
                      : done
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-gray-100 text-gray-500 border-gray-300"
                  }`}
                >
                  {label}
                </div>
                {i < arr.length - 1 && <span className="text-gray-300">›</span>}
              </div>
            );
          })}
        </div>

        {process.salesStage === "ENVIADO_OPERACAO" && process.opsStage && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Etapa em Operação:</p>
            <span className={`text-xs px-3 py-1 rounded-full border font-medium ${
              process.opsStage === "FINALIZADO"
                ? "bg-green-100 text-green-700 border-green-300"
                : process.opsStage === "DEVOLVIDO" || process.opsStage === "PARALISADO"
                ? "bg-red-100 text-red-700 border-red-300"
                : "bg-blue-100 text-blue-700 border-blue-300"
            }`}>
              {OPS_LABELS[process.opsStage] ?? process.opsStage}
            </span>
          </div>
        )}

        {/* Devoluções recentes */}
        {process.devolutions?.length > 0 &&
          process.salesStage === "DEVOLVIDO_PENDENCIAS" && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm font-semibold text-red-700 mb-1">
                Pendências da Operação:
              </p>
              <p className="text-sm text-red-600">
                {process.devolutions[0].pendencies}
              </p>
            </div>
          )}

        {/* Ações de mudança de etapa */}
        {canEditSales && (
          <SalesStageActions
            processId={process.id}
            currentStage={process.salesStage}
            contractStatus={process.contractStatus}
            pendingRemindersCount={process.reminders?.filter((r: { done: boolean }) => !r.done).length ?? 0}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Orçamento PDF + Contrato + Editar Serviços */}
          {(process.services.length > 0 || process.salesStage === "PROSPECCAO") && (
            <div className="flex justify-end gap-2">
              {canEditSales && process.salesStage === "PROSPECCAO" && (
                <EditServicesModal
                  processId={process.id}
                  existingServices={process.services}
                  clientProperties={process.client.properties ?? []}
                />
              )}
              {process.services.length > 0 && (
                <>
                  <OrcamentoButton processId={process.id} />
                  {process.salesStage !== "PROSPECCAO" && (
                    <ContratoButton processId={process.id} />
                  )}
                </>
              )}
            </div>
          )}

          {/* Dados do cliente */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-[var(--ink-900)] mb-3 text-sm">Cliente</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Nome</p>
                <p className="font-medium">{process.client.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <Badge value={process.client.type} />
              </div>
              {process.client.document && (
                <div>
                  <p className="text-xs text-gray-500">CPF/CNPJ</p>
                  <p>{process.client.document}</p>
                </div>
              )}
              {process.client.phone && (
                <div>
                  <p className="text-xs text-gray-500">Telefone</p>
                  <p>{process.client.phone}</p>
                </div>
              )}
              {process.client.farmName && (
                <div>
                  <p className="text-xs text-gray-500">Fazenda</p>
                  <p>{process.client.farmName}</p>
                </div>
              )}
              {process.client.areaHa && (
                <div>
                  <p className="text-xs text-gray-500">Área</p>
                  <p>{process.client.areaHa} ha</p>
                </div>
              )}
            </div>
            <Link
              href={`/dashboard/clientes/${process.clientId}`}
              className="text-xs text-[var(--signal-500)] hover:underline mt-3 block"
            >
              Ver ficha completa do cliente →
            </Link>
          </div>

          {/* Serviços e orçamento */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-[var(--ink-900)] mb-3 text-sm">
              Serviços / Orçamento
            </h2>
            <div className="flex flex-col gap-3">
              {process.services.map((sv: {
                id: string;
                serviceName: string;
                serviceGroup: string;
                calculatedValue: number | null;
                negotiatedValue: number | null;
                negotiationReason: string | null;
                hectares: number | null;
                squareMeters: number | null;
                financedValue: number | null;
              }) => (
                <div key={sv.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{sv.serviceName}</p>
                      <p className="text-xs text-gray-500">{sv.serviceGroup}</p>
                    </div>
                    <div className="text-right">
                      {sv.calculatedValue && sv.calculatedValue !== sv.negotiatedValue && (
                        <p className="text-xs text-gray-400 line-through">
                          {formatCurrency(sv.calculatedValue)}
                        </p>
                      )}
                      <p className="font-bold text-[var(--signal-500)]">
                        {formatCurrency(sv.negotiatedValue)}
                      </p>
                    </div>
                  </div>
                  {sv.negotiationReason && (
                    <p className="text-xs text-amber-700 mt-1 italic">
                      Negociação: {sv.negotiationReason}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                    {sv.hectares && <span>{sv.hectares} ha</span>}
                    {sv.squareMeters && <span>{sv.squareMeters} m²</span>}
                    {sv.financedValue && <span>Financiamento: {formatCurrency(sv.financedValue)}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <div className="bg-[var(--ink-900)] text-white rounded-lg px-6 py-3 text-right">
                <p className="text-xs opacity-70">Total</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>

          {/* Checklist de documentos */}
          {docNums.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-[var(--ink-900)] text-sm">
                  Documentos Necessários
                </h2>
                {process.salesStage === "DOCUMENTACAO_COLETADA" && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    Clique no documento para anexar
                  </span>
                )}
              </div>
              <DocumentChecklist
                processId={process.id}
                docNums={docNums}
                docNames={DOCUMENT_NAMES}
                uploadedDocs={process.documents ?? []}
                editable={canEditSales && process.salesStage === "DOCUMENTACAO_COLETADA"}
              />
            </div>
          )}

          {/* Timeline */}
          {process.timeline?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold text-[var(--ink-900)] mb-3 text-sm">
                Histórico
              </h2>
              <div className="flex flex-col gap-3">
                {process.timeline.map((entry: {
                  id: string;
                  stage: string;
                  content: string;
                  createdAt: Date;
                  user: { name: string };
                }) => (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-[var(--signal-500)] mt-1.5 flex-none" />
                    <div>
                      <p className="text-gray-700">{entry.content}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(entry.createdAt)} — {entry.user.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Informações */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">
              Informações
            </h3>
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Vendedor</p>
                <p className="font-medium">{process.seller?.name ?? "—"}</p>
              </div>
              {process.analyst && (
                <div>
                  <p className="text-xs text-gray-400">Analista</p>
                  <p className="font-medium">{process.analyst.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Previsão de conclusão</p>
                <p>{formatDate(process.expectedCompletionDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Contrato</p>
                <Badge value={process.contractStatus} />
                {process.contractMethod && (
                  <p className="text-xs text-gray-500 mt-0.5">{process.contractMethod}</p>
                )}
              </div>
              {process.sentToOpsAt && (
                <div>
                  <p className="text-xs text-gray-400">Enviado à Operação em</p>
                  <p>{formatDate(process.sentToOpsAt)}</p>
                </div>
              )}
              {process.completedAt && (
                <div>
                  <p className="text-xs text-gray-400">Finalizado em</p>
                  <p>{formatDate(process.completedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notas do cliente */}
          {process.client.notes && process.client.notes.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">
                Observações do Cliente
              </h3>
              <div className="flex flex-col gap-2">
                {process.client.notes.slice(0, 3).map((note: {
                  id: string;
                  content: string;
                  createdAt: Date;
                  user: { name: string };
                }) => (
                  <div key={note.id} className="text-sm border-l-2 border-gray-200 pl-2">
                    <p className="text-gray-700">{note.content}</p>
                    <p className="text-xs text-gray-400">
                      {note.user.name} · {formatDate(note.createdAt)}
                    </p>
                  </div>
                ))}
                <Link
                  href={`/dashboard/clientes/${process.clientId}`}
                  className="text-xs text-[var(--signal-500)] hover:underline"
                >
                  Ver todas as observações →
                </Link>
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
            isAdmin={roles.includes("ADMIN")}
          />
        </div>
      </div>
    </div>
  );
}

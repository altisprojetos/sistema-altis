import { getClientById, deleteClient } from "@/lib/actions/clients";
import { addClientNote } from "@/lib/actions/clients";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardLabel } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wider font-semibold mb-0.5" style={{ color: "var(--steel-400)" }}>
        {label}
      </div>
      <div className="text-sm" style={{ color: "var(--ink-900)" }}>{value}</div>
    </div>
  );
}

async function NoteForm({ clientId }: { clientId: string }) {
  async function submit(formData: FormData) {
    "use server";
    await addClientNote(clientId, formData.get("content") as string);
  }

  return (
    <form action={submit} className="mt-4">
      <textarea
        name="content"
        rows={3}
        required
        placeholder="Adicionar observação sobre este cliente..."
        className="w-full px-3 py-2.5 text-sm border outline-none resize-none"
        style={{
          borderColor: "var(--steel-200)",
          background: "var(--paper-50)",
          color: "var(--ink-900)",
        }}
      />
      <button
        type="submit"
        className="mt-2 px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer facet-br"
        style={{ background: "var(--ink-900)", color: "white" }}
      >
        Salvar Observação
      </button>
    </form>
  );
}

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const canSeeAllNotes = session.user.roles.includes("ADMIN");

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href="/dashboard/clientes"
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--steel-400)" }}
        >
          ← Clientes
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6 gap-4">
        <PageHeader
          title={client.name}
          subtitle={`Cadastrado em ${format(client.createdAt, "dd/MM/yyyy", { locale: ptBR })} · Vendedor: ${client.seller.name}`}
        />
        {!session.user.roles.includes("FINANCEIRO") && (
          <div className="flex gap-2 flex-shrink-0 mt-1">
            {session.user.roles.includes("ADMIN") && (
              <DeleteButton
                action={deleteClient.bind(null, client.id)}
                label="Apagar"
                confirmMessage={`Apagar o cliente "${client.name}" e todos os seus processos? Esta ação não pode ser desfeita.`}
              />
            )}
            <Link
              href={`/dashboard/clientes/${client.id}/editar`}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider border"
              style={{ borderColor: "var(--steel-200)", color: "var(--ink-900)" }}
            >
              Editar
            </Link>
            <Link
              href={`/dashboard/vendas/novo?clientId=${client.id}`}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider facet-br"
              style={{ background: "var(--signal-500)", color: "white" }}
            >
              + Novo Processo
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Coluna esquerda — dados */}
        <div className="col-span-2 space-y-6">
          {/* Dados pessoais */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardLabel>Dados do Cliente</CardLabel>
              <Badge value={client.type} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="CPF / CNPJ" value={client.document} />
              <InfoRow label="Telefone" value={client.phone} />
              <InfoRow label="E-mail" value={client.email} />
              <InfoRow label="Endereço" value={client.address} />
            </div>
          </Card>

          {/* Imóveis */}
          {(client.properties && client.properties.length > 0) ? (
            <Card>
              <CardLabel>
                {client.type === "RURAL"
                  ? `Propriedades Rurais (${client.properties.length})`
                  : `Imóveis Urbanos (${client.properties.length})`}
              </CardLabel>
              <div className="space-y-4">
                {client.properties.map((prop, i) => (
                  <div
                    key={prop.id}
                    className="pt-4 border-t first:border-t-0 first:pt-0"
                    style={{ borderColor: "var(--paper-100)" }}
                  >
                    {client.properties.length > 1 && (
                      <p
                        className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                        style={{ color: "var(--signal-500)" }}
                      >
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px]"
                          style={{ background: "var(--signal-500)" }}
                        >
                          {i + 1}
                        </span>
                        {client.type === "RURAL" ? `Propriedade ${i + 1}` : `Imóvel ${i + 1}`}
                      </p>
                    )}
                    {client.type === "RURAL" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <InfoRow label="Nome da Fazenda" value={prop.farmName} />
                        <InfoRow label="Município" value={prop.municipality} />
                        <InfoRow
                          label="Área"
                          value={prop.areaHa ? `${prop.areaHa} hectares` : undefined}
                        />
                        {(prop.latitude || prop.longitude) && (
                          <div>
                            <div
                              className="text-xs uppercase tracking-wider font-semibold mb-0.5"
                              style={{ color: "var(--steel-400)" }}
                            >
                              GPS
                            </div>
                            <div className="font-mono text-sm" style={{ color: "var(--ink-900)" }}>
                              {prop.latitude?.toFixed(6)}, {prop.longitude?.toFixed(6)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <InfoRow label="Endereço" value={prop.streetAddress} />
                        <InfoRow label="Bairro" value={prop.neighborhood} />
                        <InfoRow label="Cidade" value={prop.city} />
                        <InfoRow label="Estado" value={prop.state} />
                        <InfoRow label="CEP" value={prop.cep} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : client.type === "RURAL" && (client.farmName || client.municipality || client.areaHa) ? (
            // Backward compat: clientes sem ClientProperty mas com campos legados
            <Card>
              <CardLabel>Propriedade Rural</CardLabel>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Nome da Fazenda" value={client.farmName} />
                <InfoRow label="Município" value={client.municipality} />
                <InfoRow
                  label="Área Total"
                  value={client.areaHa ? `${client.areaHa} hectares` : undefined}
                />
                {(client.latitude || client.longitude) && (
                  <div>
                    <div className="text-xs uppercase tracking-wider font-semibold mb-0.5" style={{ color: "var(--steel-400)" }}>
                      Localização GPS
                    </div>
                    <div className="font-mono text-sm" style={{ color: "var(--ink-900)" }}>
                      {client.latitude?.toFixed(6)}, {client.longitude?.toFixed(6)}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : null}

          {/* Histórico de processos */}
          <Card>
            <CardLabel>Histórico de Processos ({client.processes.length})</CardLabel>
            {client.processes.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--steel-400)" }}>
                Nenhum processo iniciado para este cliente.
              </p>
            ) : (
              <div className="space-y-3">
                {client.processes.map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/vendas/${p.id}`}
                    className="flex items-center justify-between p-3 transition-colors"
                    style={{
                      background: "var(--paper-50)",
                      borderLeft: "3px solid var(--signal-500)",
                    }}
                  >
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--ink-900)" }}>
                        {p.services.map((s) => s.serviceName).join(" · ") || "Sem serviços"}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--steel-400)" }}>
                        {format(p.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge value={p.salesStage} />
                      {p.opsStage && <Badge value={p.opsStage} />}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Coluna direita — observações */}
        <div>
          <Card>
            <CardLabel>
              Observações {canSeeAllNotes ? "(Admin — todas)" : ""}
            </CardLabel>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {client.notes.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--steel-400)" }}>
                  Nenhuma observação registrada.
                </p>
              ) : (
                client.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 text-sm"
                    style={{
                      background: "var(--paper-50)",
                      borderLeft: "3px solid var(--ink-700)",
                    }}
                  >
                    <p style={{ color: "var(--ink-900)" }}>{note.content}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--steel-400)" }}>
                      {note.user.name} ·{" "}
                      {format(note.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))
              )}
            </div>

            {!session.user.roles.includes("FINANCEIRO") && (
              <NoteForm clientId={client.id} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

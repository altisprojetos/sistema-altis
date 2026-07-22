"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProcess } from "@/lib/actions/processes";
import {
  SERVICES,
  Service,
  calculatePrice,
  getServicesByGroup,
  DOCUMENT_NAMES,
} from "@/lib/services-catalog";
import PageHeader from "@/components/ui/PageHeader";

interface ClientProperty {
  id: string;
  index: number;
  farmName: string | null;
  municipality: string | null;
  streetAddress: string | null;
  city: string | null;
  areaHa: number | null;
}

interface Client {
  id: string;
  name: string;
  document: string | null;
  type: string;
  properties: ClientProperty[];
}

interface SelectedService {
  instanceId: string;
  service: Service;
  clientPropertyId: string | null;
  propertyIds: string[];
  params: {
    hectares?: number;
    squareMeters?: number;
    confrontantes?: number;
    financedValue?: number;
  };
  calculatedValue: number | null;
  negotiatedValue: number;
  negotiationReason: string;
  manualValue: boolean;
  collateral: string;
}

function formatCurrency(v: number | null) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPriceLabel(service: Service): string {
  switch (service.priceType) {
    case "suspenso": return "Serviço suspenso";
    case "enquadramento": return "Necessário enquadramento";
    case "consultar": return service.minValue
      ? `A partir de ${formatCurrency(service.minValue)}`
      : "Consultar responsável";
    case "fixed": return formatCurrency(service.baseValue ?? null);
    case "percent": return `3% do financiamento (mín. ${formatCurrency(service.minValue ?? null)})`;
    case "per_ha_env": return `R$${service.perUnitValue}/ha (mín. ${formatCurrency(service.minValue ?? null)})`;
    case "per_sqm": return `${formatCurrency(service.baseValue ?? null)} + R$${service.perUnitValue}/m²`;
    case "per_hectare": return service.confrontanteRanges
      ? `${formatCurrency(service.baseValue ?? null)} + por ha (varia por confrontantes)`
      : `${formatCurrency(service.baseValue ?? null)} + por ha`;
    default: return "Verificar";
  }
}

function getUniqueDocNumbers(services: SelectedService[]): number[] {
  const nums = new Set<number>();
  for (const s of services) {
    for (const d of s.service.docNumbers ?? []) nums.add(d);
  }
  return Array.from(nums).sort((a, b) => a - b);
}

function propertyLabel(prop: ClientProperty): string {
  if (prop.farmName) return prop.farmName;
  if (prop.streetAddress) return prop.streetAddress;
  if (prop.municipality) return prop.municipality;
  if (prop.city) return prop.city;
  return `Imóvel ${prop.index + 1}`;
}

export default function NewProcessForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientId, setClientId] = useState("");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [expectedDate, setExpectedDate] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Modal de seleção de imóveis ao adicionar serviço
  const [pendingService, setPendingService] = useState<Service | null>(null);
  const [checkedProps, setCheckedProps] = useState<Set<string>>(new Set());

  const byGroup = getServicesByGroup();
  const groupLabels = Object.fromEntries(SERVICES.map((s) => [s.group, s.groupLabel]));

  const selectedClient = clients.find((c) => c.id === clientId) ?? null;
  const clientProperties = selectedClient?.properties ?? [];
  const isMultiProperty = clientProperties.length > 1;

  // When client changes, reset services and set active property
  function handleClientChange(id: string) {
    setClientId(id);
    setSelectedServices([]);
    setActiveGroup(null);
    const client = clients.find((c) => c.id === id);
    if (client && client.properties.length > 0) {
      setActivePropertyId(client.properties[0].id);
    } else {
      setActivePropertyId(null);
    }
  }

  function makeInstanceId(serviceKey: string, propIds: string[]) {
    if (propIds.length === 0) return serviceKey;
    return `${serviceKey}__${[...propIds].sort().join("__")}`;
  }

  function addService(service: Service, propIds: string[] = []) {
    if (service.suspended || service.priceType === "suspenso") return;
    const effectivePropIds = isMultiProperty ? propIds : [];
    const instanceId = makeInstanceId(service.key, effectivePropIds);
    if (selectedServices.find((s) => s.instanceId === instanceId)) return;

    setSelectedServices((prev) => [
      ...prev,
      {
        instanceId,
        service,
        clientPropertyId: effectivePropIds.length === 1 ? effectivePropIds[0] : null,
        propertyIds: effectivePropIds,
        params: {},
        calculatedValue: service.priceType === "fixed" ? (service.baseValue ?? null) : null,
        negotiatedValue: service.priceType === "fixed" ? (service.baseValue ?? 0) : 0,
        negotiationReason: "",
        manualValue: ["enquadramento", "consultar"].includes(service.priceType),
        collateral: "",
      },
    ]);
  }

  function openPropertyModal(service: Service) {
    // Pre-fill with current properties of existing instance (for editing)
    const existing = selectedServices.find((s) => s.service.key === service.key);
    setCheckedProps(new Set(existing ? existing.propertyIds : []));
    setPendingService(service);
  }

  function confirmAddService() {
    if (!pendingService) return;
    const propIds = Array.from(checkedProps);
    // Remove existing instance of same service key (user is re-selecting properties)
    setSelectedServices((prev) => {
      const without = prev.filter((s) => s.service.key !== pendingService.key);
      if (propIds.length === 0) return without;
      const instanceId = makeInstanceId(pendingService.key, propIds);
      const existing = prev.find((s) => s.service.key === pendingService.key);
      return [
        ...without,
        {
          instanceId,
          service: pendingService,
          clientPropertyId: propIds.length === 1 ? propIds[0] : null,
          propertyIds: propIds,
          params: existing?.params ?? {},
          calculatedValue: existing?.calculatedValue ?? (pendingService.priceType === "fixed" ? (pendingService.baseValue ?? null) : null),
          negotiatedValue: existing?.negotiatedValue ?? (pendingService.priceType === "fixed" ? (pendingService.baseValue ?? 0) : 0),
          negotiationReason: existing?.negotiationReason ?? "",
          manualValue: existing?.manualValue ?? ["enquadramento", "consultar"].includes(pendingService.priceType),
          collateral: existing?.collateral ?? "",
        },
      ];
    });
    setPendingService(null);
  }

  function toggleProp(propId: string) {
    setCheckedProps((prev) => {
      const next = new Set(prev);
      if (next.has(propId)) next.delete(propId); else next.add(propId);
      return next;
    });
  }

  function removeService(instanceId: string) {
    setSelectedServices((prev) => prev.filter((s) => s.instanceId !== instanceId));
  }

  function updateParam(instanceId: string, field: string, value: number | undefined) {
    setSelectedServices((prev) =>
      prev.map((s) => {
        if (s.instanceId !== instanceId) return s;
        const params = { ...s.params, [field]: value };
        const calc = calculatePrice(s.service, params);
        return {
          ...s,
          params,
          calculatedValue: calc,
          negotiatedValue: s.manualValue ? s.negotiatedValue : (calc ?? s.negotiatedValue),
        };
      })
    );
  }

  function updateNegotiatedValue(instanceId: string, value: number) {
    setSelectedServices((prev) =>
      prev.map((s) => s.instanceId !== instanceId ? s : { ...s, negotiatedValue: value })
    );
  }

  function updateNegotiationReason(instanceId: string, reason: string) {
    setSelectedServices((prev) =>
      prev.map((s) => s.instanceId !== instanceId ? s : { ...s, negotiationReason: reason })
    );
  }

  function updateManualValue(instanceId: string, value: number) {
    setSelectedServices((prev) =>
      prev.map((s) => s.instanceId !== instanceId ? s : { ...s, negotiatedValue: value, calculatedValue: value })
    );
  }

  function updateCollateral(instanceId: string, value: string) {
    setSelectedServices((prev) =>
      prev.map((s) => s.instanceId !== instanceId ? s : { ...s, collateral: value })
    );
  }

  const totalValue = selectedServices.reduce((s, sv) => s + (sv.negotiatedValue || 0), 0);
  const docNumbers = getUniqueDocNumbers(selectedServices);

  // Set of service keys already added (for catalog "added" check)
  const addedServiceKeys = new Set(selectedServices.map((s) => s.service.key));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { setError("Selecione um cliente"); return; }
    if (selectedServices.length === 0) { setError("Adicione ao menos um serviço"); return; }

    for (const s of selectedServices) {
      if (!s.negotiatedValue) { setError(`Informe o valor para: ${s.service.name}`); return; }
      if (s.calculatedValue !== null && s.negotiatedValue !== s.calculatedValue && !s.negotiationReason) {
        setError(`Informe a justificativa para o valor negociado em: ${s.service.name}`);
        return;
      }
    }

    setError("");
    startTransition(async () => {
      const process = await createProcess({
        clientId,
        services: selectedServices.map((sv) => ({
          serviceKey: sv.service.key,
          serviceName: sv.service.name + (sv.service.subtype ? ` – ${sv.service.subtype}` : ""),
          serviceGroup: sv.service.groupLabel,
          calculatedValue: sv.calculatedValue,
          negotiatedValue: sv.negotiatedValue,
          negotiationReason: sv.negotiationReason || undefined,
          hectares: sv.params.hectares,
          squareMeters: sv.params.squareMeters,
          confrontantes: sv.params.confrontantes,
          financedValue: sv.params.financedValue,
          collateral: sv.collateral || undefined,
          clientPropertyId: sv.clientPropertyId,
          propertyIds: sv.propertyIds.length > 0 ? sv.propertyIds : undefined,
        })),
        expectedCompletionDate: expectedDate || undefined,
      });
      router.push(`/dashboard/vendas/${process.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeader title="Novo Processo" subtitle="Cadastre um novo processo comercial" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Cliente */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-[var(--ink-900)] mb-4">Cliente</h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600">Selecionar cliente *</label>
          <select
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
          >
            <option value="">— selecione —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.document ? ` — ${c.document}` : ""} ({c.type})
                {c.properties.length > 1 ? ` · ${c.properties.length} imóveis` : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Cliente não cadastrado?{" "}
            <a href="/dashboard/clientes/novo" className="text-[var(--signal-500)] underline">
              Cadastrar aqui
            </a>
          </p>
        </div>

        {/* Info das propriedades do cliente selecionado */}
        {selectedClient && clientProperties.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 font-semibold mb-1.5">
              {isMultiProperty
                ? `${clientProperties.length} imóveis cadastrados — selecione o imóvel antes de adicionar serviços`
                : "Imóvel do cliente:"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {clientProperties.map((prop) => (
                <span
                  key={prop.id}
                  className="text-xs px-2 py-0.5 rounded border"
                  style={{ borderColor: "var(--steel-200)", color: "var(--ink-900)" }}
                >
                  {propertyLabel(prop)}
                  {prop.areaHa ? ` · ${prop.areaHa} ha` : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Serviços */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-[var(--ink-900)] mb-4">Serviços</h2>

        {/* Tabs de propriedade (só quando multi-imóvel) */}
        {isMultiProperty && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Adicionar serviços para o imóvel:</p>
            <div className="flex gap-2 flex-wrap">
              {clientProperties.map((prop) => {
                const count = selectedServices.filter((s) => s.clientPropertyId === prop.id).length;
                const isActive = activePropertyId === prop.id;
                return (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => setActivePropertyId(prop.id)}
                    className="text-xs px-3 py-1.5 rounded-full border font-medium transition-all flex items-center gap-1.5"
                    style={{
                      background: isActive ? "var(--ink-900)" : "white",
                      color: isActive ? "white" : "var(--ink-900)",
                      borderColor: isActive ? "var(--ink-900)" : "var(--steel-200)",
                    }}
                  >
                    {propertyLabel(prop)}
                    {count > 0 && (
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                        style={{
                          background: isActive ? "white" : "var(--signal-500)",
                          color: isActive ? "var(--ink-900)" : "white",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {activePropertyId && (
              <p className="text-xs text-[var(--signal-500)] mt-2">
                ● Serviços adicionados irão para:{" "}
                <strong>{propertyLabel(clientProperties.find((p) => p.id === activePropertyId)!)}</strong>
              </p>
            )}
          </div>
        )}

        {/* Grupos */}
        <div className="flex gap-2 flex-wrap mb-4">
          {Object.keys(byGroup).map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setActiveGroup(activeGroup === group ? null : group)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                activeGroup === group
                  ? "bg-[var(--ink-900)] text-white border-[var(--ink-900)]"
                  : "border-gray-300 text-gray-600 hover:border-[var(--ink-900)]"
              }`}
            >
              {groupLabels[group]}
            </button>
          ))}
        </div>

        {/* Lista de serviços */}
        {activeGroup && (
          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Serviço</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Preço</th>
                  <th className="w-20 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byGroup[activeGroup].map((s) => {
                  const suspended = s.priceType === "suspenso";
                  const added = addedServiceKeys.has(s.key);
                  const existingInstance = selectedServices.find((ss) => ss.service.key === s.key);
                  return (
                    <tr key={s.key} className={suspended ? "opacity-40" : "hover:bg-gray-50"}>
                      <td className="px-3 py-2">
                        <span className="font-medium">{s.name}</span>
                        {s.subtype && <span className="text-gray-500"> — {s.subtype}</span>}
                        {suspended && (
                          <span className="ml-2 text-xs bg-gray-200 text-gray-500 rounded px-1">Suspenso</span>
                        )}
                        {added && existingInstance && existingInstance.propertyIds.length > 1 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
                            {existingInstance.propertyIds.length} imóveis
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{getPriceLabel(s)}</td>
                      <td className="px-3 py-2 text-right">
                        {!suspended && (
                          <div className="flex items-center gap-1 justify-end">
                            {added && isMultiProperty && (
                              <button
                                type="button"
                                onClick={() => openPropertyModal(s)}
                                className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
                              >
                                Editar imóveis
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (added) {
                                  removeService(existingInstance!.instanceId);
                                } else if (isMultiProperty) {
                                  openPropertyModal(s);
                                } else {
                                  addService(s);
                                }
                              }}
                              className={`text-xs px-3 py-1 rounded border transition-all ${
                                added
                                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                  : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                              }`}
                            >
                              {added ? "Remover" : "Adicionar"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Serviços selecionados */}
        {selectedServices.length > 0 && (
          <div className="flex flex-col gap-4 mt-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Serviços selecionados ({selectedServices.length})
            </h3>

            {selectedServices.map((sv) => (
              <ServiceCard
                key={sv.instanceId}
                sv={sv}
                propertyLabels={sv.propertyIds.map(
                  id => propertyLabel(clientProperties.find(p => p.id === id) ?? { id, index: 0, farmName: null, municipality: null, streetAddress: null, city: null, areaHa: null })
                )}
                onRemove={() => removeService(sv.instanceId)}
                onUpdateParam={(f, v) => updateParam(sv.instanceId, f, v)}
                onUpdateNegotiated={(v) => updateNegotiatedValue(sv.instanceId, v)}
                onUpdateReason={(r) => updateNegotiationReason(sv.instanceId, r)}
                onUpdateManual={(v) => updateManualValue(sv.instanceId, v)}
                onUpdateCollateral={(v) => updateCollateral(sv.instanceId, v)}
              />
            ))}

            {/* Total */}
            <div className="flex justify-end">
              <div className="bg-[var(--ink-900)] text-white rounded-lg px-6 py-3 text-right">
                <p className="text-xs opacity-70">Total do orçamento</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checklist de documentos */}
      {docNumbers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-[var(--ink-900)] mb-3">Documentos Necessários</h2>
          <p className="text-xs text-gray-500 mb-3">Lista unificada para todos os serviços selecionados:</p>
          <ul className="flex flex-col gap-1">
            {docNumbers.map((n) => (
              <li key={n} className="flex gap-2 items-start text-sm">
                <span className="text-gray-400 min-w-6 text-right">{n}.</span>
                <span className={n === 26 ? "font-semibold text-[var(--signal-500)]" : ""}>
                  {DOCUMENT_NAMES[n]}
                  {n === 26 && (
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      — não encaminhamento é responsabilidade do vendedor
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {(() => {
            const altisServices = [9, 10, 11, 14, 16, 17, 21];
            const present = docNumbers.filter((d) => altisServices.includes(d));
            if (present.length === 0) return null;
            return (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                <strong>Atenção:</strong> Os itens {present.join(", ")} podem ser serviços prestados
                pela ALTIS. Caso não estejam no orçamento, documente o motivo nas observações.
              </div>
            );
          })()}
        </div>
      )}

      {/* Data prevista */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-[var(--ink-900)] mb-4">Prazo</h2>
        <div className="flex flex-col gap-1 max-w-xs">
          <label className="text-sm text-gray-600">Previsão de conclusão</label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
          />
        </div>
      </div>

      {/* Modal de seleção de imóveis */}
      {pendingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-[var(--ink-900)] text-base mb-1">
              {pendingService.name}{pendingService.subtype ? ` — ${pendingService.subtype}` : ""}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Selecione o(s) imóvel(is) contemplados por este serviço:
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {clientProperties.map((prop) => {
                const label = propertyLabel(prop);
                const checked = checkedProps.has(prop.id);
                return (
                  <label
                    key={prop.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "border-[var(--signal-500)] bg-[var(--signal-500)] text-white"
                        : "border-gray-200 hover:border-gray-400 text-gray-700"
                    }`}
                    onClick={() => toggleProp(prop.id)}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-none ${
                      checked ? "bg-white border-white" : "border-current"
                    }`}>
                      {checked && <span className="text-[var(--signal-500)] text-xs font-bold">✓</span>}
                    </span>
                    <div className="text-sm">
                      <p className="font-medium">{label}</p>
                      {prop.areaHa && <p className={`text-xs ${checked ? "opacity-80" : "opacity-60"}`}>{prop.areaHa} ha</p>}
                    </div>
                  </label>
                );
              })}

              <button
                type="button"
                className="text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-700 hover:underline"
                onClick={() => setCheckedProps(new Set(clientProperties.map(p => p.id)))}
              >
                Selecionar todos
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingService(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAddService}
                disabled={checkedProps.size === 0}
                className="flex-1 py-2 rounded-lg bg-[var(--signal-500)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40"
              >
                {checkedProps.size > 0 ? `Confirmar (${checkedProps.size} imóvel${checkedProps.size > 1 ? "is" : ""})` : "Selecione ao menos 1"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-[var(--signal-500)] text-white rounded font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Criar Processo"}
        </button>
        <a href="/dashboard/vendas" className="px-6 py-2.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50">
          Cancelar
        </a>
      </div>
    </form>
  );
}

function ServiceCard({
  sv,
  propertyLabels = [],
  onRemove,
  onUpdateParam,
  onUpdateNegotiated,
  onUpdateReason,
  onUpdateManual,
  onUpdateCollateral,
}: {
  sv: SelectedService;
  propertyLabels?: string[];
  onRemove: () => void;
  onUpdateParam: (field: string, value: number | undefined) => void;
  onUpdateNegotiated: (value: number) => void;
  onUpdateReason: (reason: string) => void;
  onUpdateManual: (value: number) => void;
  onUpdateCollateral: (value: string) => void;
}) {
  const needsNegotiationReason =
    sv.calculatedValue !== null && sv.negotiatedValue !== sv.calculatedValue;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">
            {sv.service.name}
            {sv.service.subtype && <span className="text-gray-500"> — {sv.service.subtype}</span>}
          </p>
          <p className="text-xs text-gray-500">{sv.service.groupLabel}</p>
          {propertyLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {propertyLabels.map((label) => (
                <span key={label} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  🏡 {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">
          Remover
        </button>
      </div>

      {sv.service.questions && sv.service.questions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {sv.service.questions.map((q) => (
            <div key={q.field} className="flex flex-col gap-1 min-w-36">
              <label className="text-xs text-gray-600">{q.label}</label>
              {q.type === "number" ? (
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="border border-gray-200 rounded px-2 py-1 text-sm"
                  onChange={(e) => onUpdateParam(q.field, e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              ) : (
                <select
                  className="border border-gray-200 rounded px-2 py-1 text-sm"
                  onChange={(e) => onUpdateParam(q.field, e.target.value ? parseFloat(e.target.value) : undefined)}
                >
                  <option value="">— selecione —</option>
                  {q.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-4 items-end">
        {sv.calculatedValue !== null && !sv.manualValue && (
          <div>
            <p className="text-xs text-gray-500">Valor calculado</p>
            <p className="font-semibold text-[var(--ink-900)]">{formatCurrency(sv.calculatedValue)}</p>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">{sv.manualValue ? "Valor" : "Valor negociado"}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={sv.negotiatedValue || ""}
            onChange={(e) =>
              sv.manualValue
                ? onUpdateManual(parseFloat(e.target.value) || 0)
                : onUpdateNegotiated(parseFloat(e.target.value) || 0)
            }
            className="border border-gray-200 rounded px-2 py-1 text-sm w-40"
            placeholder="R$ 0,00"
          />
          {sv.manualValue && sv.service.priceType === "consultar" && (
            <p className="text-xs text-amber-600">Consultar responsável técnico antes de definir</p>
          )}
        </div>
        {needsNegotiationReason && (
          <div className="flex-1 min-w-48 flex flex-col gap-1">
            <label className="text-xs text-gray-600">Justificativa da negociação *</label>
            <input
              type="text"
              value={sv.negotiationReason}
              onChange={(e) => onUpdateReason(e.target.value)}
              className="border border-amber-300 rounded px-2 py-1 text-sm"
              placeholder="Motivo do desconto ou acréscimo"
            />
          </div>
        )}
      </div>

      {sv.service.priceType === "percent" && (
        <div className="mt-3 flex flex-col gap-1">
          <label className="text-xs text-gray-600 font-medium">
            Garantia do financiamento
            <span className="text-gray-400 font-normal ml-1">(descreva o bem dado em garantia)</span>
          </label>
          <input
            type="text"
            value={sv.collateral}
            onChange={(e) => onUpdateCollateral(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[var(--signal-500)]"
            placeholder="Ex: Hipoteca do Imóvel — Fazenda São João, matrícula 12345"
          />
        </div>
      )}
    </div>
  );
}

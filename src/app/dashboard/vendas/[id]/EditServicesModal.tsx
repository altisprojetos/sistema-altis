"use client";

import { useState, useTransition } from "react";
import { updateProcessServices } from "@/lib/actions/processes";
import {
  SERVICES,
  Service,
  calculatePrice,
  getServicesByGroup,
} from "@/lib/services-catalog";

interface ClientProperty {
  id: string;
  index: number;
  farmName: string | null;
  municipality: string | null;
  areaHa: number | null;
}

interface ExistingService {
  id: string;
  serviceKey: string;
  serviceName: string;
  serviceGroup: string;
  calculatedValue: number | null;
  negotiatedValue: number | null;
  negotiationReason: string | null;
  hectares: number | null;
  squareMeters: number | null;
  confrontantes: number | null;
  financedValue: number | null;
  collateral: string | null;
  clientPropertyId: string | null;
  propertyIds: string | null;
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

function propertyLabel(prop: ClientProperty): string {
  if (prop.farmName) return prop.farmName;
  if (prop.municipality) return prop.municipality;
  return `Imóvel ${prop.index + 1}`;
}

function makeInstanceId(serviceKey: string, propIds: string[]) {
  if (propIds.length === 0) return serviceKey;
  return `${serviceKey}__${[...propIds].sort().join("__")}`;
}

function existingToSelected(sv: ExistingService): SelectedService | null {
  const service = SERVICES.find((s) => s.key === sv.serviceKey);
  if (!service) return null;

  // Reconstruct propertyIds: prefer JSON field, fall back to single clientPropertyId
  let propIds: string[] = [];
  if (sv.propertyIds) {
    try { propIds = JSON.parse(sv.propertyIds) as string[]; } catch { /* ignore */ }
  } else if (sv.clientPropertyId) {
    propIds = [sv.clientPropertyId];
  }

  const params: SelectedService["params"] = {};
  if (sv.hectares) params.hectares = sv.hectares;
  if (sv.squareMeters) params.squareMeters = sv.squareMeters;
  if (sv.confrontantes) params.confrontantes = sv.confrontantes;
  if (sv.financedValue) params.financedValue = sv.financedValue;

  return {
    instanceId: makeInstanceId(sv.serviceKey, propIds),
    service,
    clientPropertyId: propIds.length === 1 ? propIds[0] : null,
    propertyIds: propIds,
    params,
    calculatedValue: sv.calculatedValue,
    negotiatedValue: sv.negotiatedValue ?? 0,
    negotiationReason: sv.negotiationReason ?? "",
    manualValue: ["enquadramento", "consultar"].includes(service.priceType),
    collateral: sv.collateral ?? "",
  };
}

export function EditServicesModal({
  processId,
  existingServices,
  clientProperties,
}: {
  processId: string;
  existingServices: ExistingService[];
  clientProperties: ClientProperty[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const isMultiProperty = clientProperties.length > 1;

  function initialServices(): SelectedService[] {
    return existingServices.flatMap((sv) => {
      const sel = existingToSelected(sv);
      return sel ? [sel] : [];
    });
  }

  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(initialServices);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [pendingService, setPendingService] = useState<Service | null>(null);
  const [checkedProps, setCheckedProps] = useState<Set<string>>(new Set());

  const byGroup = getServicesByGroup();
  const groupLabels = Object.fromEntries(SERVICES.map((s) => [s.group, s.groupLabel]));
  const addedServiceKeys = new Set(selectedServices.map((s) => s.service.key));

  function openModal() {
    setSelectedServices(initialServices());
    setActiveGroup(null);
    setError("");
    setOpen(true);
  }

  function addService(service: Service, propIds: string[] = []) {
    if (service.priceType === "suspenso") return;
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
    const existing = selectedServices.find((s) => s.service.key === service.key);
    setCheckedProps(new Set(existing ? existing.propertyIds : []));
    setPendingService(service);
  }

  function confirmAddService() {
    if (!pendingService) return;
    const propIds = Array.from(checkedProps);
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

  function handleSave() {
    if (selectedServices.length === 0) { setError("Adicione ao menos um serviço"); return; }
    for (const s of selectedServices) {
      if (!s.negotiatedValue) { setError(`Informe o valor para: ${s.service.name}`); return; }
      if (s.calculatedValue !== null && s.negotiatedValue !== s.calculatedValue && !s.negotiationReason) {
        setError(`Informe a justificativa de negociação em: ${s.service.name}`);
        return;
      }
    }
    setError("");
    startTransition(async () => {
      await updateProcessServices(
        processId,
        selectedServices.map((sv) => ({
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
        }))
      );
      setOpen(false);
    });
  }

  const totalValue = selectedServices.reduce((s, sv) => s + (sv.negotiatedValue || 0), 0);

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Editar Serviços
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-[var(--ink-900)] text-base">Editar Serviços</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-6 flex flex-col gap-5 overflow-y-auto">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-2 text-sm">{error}</div>
              )}

              {/* Catálogo de serviços */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Catálogo de Serviços</p>
                <div className="flex gap-2 flex-wrap mb-3">
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

                {activeGroup && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Serviço</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Preço</th>
                          <th className="w-32 px-3 py-2"></th>
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
                                {suspended && <span className="ml-2 text-xs bg-gray-200 text-gray-500 rounded px-1">Suspenso</span>}
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
              </div>

              {/* Serviços selecionados */}
              {selectedServices.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Serviços no orçamento ({selectedServices.length})
                  </p>
                  {selectedServices.map((sv) => (
                    <ServiceCard
                      key={sv.instanceId}
                      sv={sv}
                      propertyLabels={sv.propertyIds.map(
                        id => propertyLabel(clientProperties.find(p => p.id === id) ?? { id, index: 0, farmName: null, municipality: null, areaHa: null })
                      )}
                      onRemove={() => removeService(sv.instanceId)}
                      onUpdateParam={(f, v) => updateParam(sv.instanceId, f, v)}
                      onUpdateNegotiated={(v) => updateNegotiatedValue(sv.instanceId, v)}
                      onUpdateReason={(r) => updateNegotiationReason(sv.instanceId, r)}
                      onUpdateManual={(v) => updateManualValue(sv.instanceId, v)}
                      onUpdateCollateral={(v) => updateCollateral(sv.instanceId, v)}
                    />
                  ))}

                  <div className="flex justify-end mt-2">
                    <div className="bg-[var(--ink-900)] text-white rounded-lg px-5 py-2.5 text-right">
                      <p className="text-xs opacity-70">Total</p>
                      <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 py-2 rounded-lg bg-[var(--signal-500)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>

          {/* Modal de seleção de imóveis */}
          {pendingService && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
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
        </div>
      )}
    </>
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
        <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap">
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
                  defaultValue={sv.params[q.field as keyof typeof sv.params] || ""}
                  className="border border-gray-200 rounded px-2 py-1 text-sm"
                  onChange={(e) => onUpdateParam(q.field, e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              ) : (
                <select
                  className="border border-gray-200 rounded px-2 py-1 text-sm"
                  defaultValue={sv.params[q.field as keyof typeof sv.params] || ""}
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

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
  clientPropertyId: string | null;
}

interface SelectedService {
  instanceId: string;
  service: Service;
  clientPropertyId: string | null;
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

function makeInstanceId(serviceKey: string, propertyId: string | null) {
  return propertyId ? `${serviceKey}__${propertyId}` : serviceKey;
}

function existingToSelected(sv: ExistingService): SelectedService | null {
  const service = SERVICES.find((s) => s.key === sv.serviceKey);
  if (!service) return null;

  const params: SelectedService["params"] = {};
  if (sv.hectares) params.hectares = sv.hectares;
  if (sv.squareMeters) params.squareMeters = sv.squareMeters;
  if (sv.confrontantes) params.confrontantes = sv.confrontantes;
  if (sv.financedValue) params.financedValue = sv.financedValue;

  return {
    instanceId: makeInstanceId(sv.serviceKey, sv.clientPropertyId),
    service,
    clientPropertyId: sv.clientPropertyId,
    params,
    calculatedValue: sv.calculatedValue,
    negotiatedValue: sv.negotiatedValue ?? 0,
    negotiationReason: sv.negotiationReason ?? "",
    manualValue: ["enquadramento", "consultar"].includes(service.priceType),
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
  const [activePropertyId, setActivePropertyId] = useState<string | null>(
    clientProperties[0]?.id ?? null
  );

  const byGroup = getServicesByGroup();
  const groupLabels = Object.fromEntries(SERVICES.map((s) => [s.group, s.groupLabel]));

  function openModal() {
    setSelectedServices(initialServices());
    setActiveGroup(null);
    setError("");
    setOpen(true);
  }

  function addService(service: Service) {
    if (service.priceType === "suspenso") return;
    const propId = isMultiProperty ? activePropertyId : null;
    const instanceId = makeInstanceId(service.key, propId);
    if (selectedServices.find((s) => s.instanceId === instanceId)) return;

    setSelectedServices((prev) => [
      ...prev,
      {
        instanceId,
        service,
        clientPropertyId: propId,
        params: {},
        calculatedValue: service.priceType === "fixed" ? (service.baseValue ?? null) : null,
        negotiatedValue: service.priceType === "fixed" ? (service.baseValue ?? 0) : 0,
        negotiationReason: "",
        manualValue: ["enquadramento", "consultar"].includes(service.priceType),
      },
    ]);
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
          clientPropertyId: sv.clientPropertyId,
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

              {/* Tabs de imóvel (multi-propriedade) */}
              {isMultiProperty && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Adicionar para o imóvel:</p>
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
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                              style={{ background: isActive ? "white" : "var(--signal-500)", color: isActive ? "var(--ink-900)" : "white" }}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grupos do catálogo */}
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
                          <th className="w-20 px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {byGroup[activeGroup].map((s) => {
                          const suspended = s.priceType === "suspenso";
                          const propId = isMultiProperty ? activePropertyId : null;
                          const instanceId = makeInstanceId(s.key, propId);
                          const added = !!selectedServices.find((ss) => ss.instanceId === instanceId);
                          return (
                            <tr key={s.key} className={suspended ? "opacity-40" : "hover:bg-gray-50"}>
                              <td className="px-3 py-2">
                                <span className="font-medium">{s.name}</span>
                                {s.subtype && <span className="text-gray-500"> — {s.subtype}</span>}
                                {suspended && <span className="ml-2 text-xs bg-gray-200 text-gray-500 rounded px-1">Suspenso</span>}
                              </td>
                              <td className="px-3 py-2 text-gray-500">{getPriceLabel(s)}</td>
                              <td className="px-3 py-2 text-right">
                                {!suspended && (
                                  <button
                                    type="button"
                                    onClick={() => added ? removeService(instanceId) : addService(s)}
                                    className={`text-xs px-3 py-1 rounded border transition-all ${
                                      added
                                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                        : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                    }`}
                                  >
                                    {added ? "Remover" : "Adicionar"}
                                  </button>
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
                      propertyLabel={
                        isMultiProperty && sv.clientPropertyId
                          ? propertyLabel(clientProperties.find((p) => p.id === sv.clientPropertyId)!)
                          : null
                      }
                      onRemove={() => removeService(sv.instanceId)}
                      onUpdateParam={(f, v) => updateParam(sv.instanceId, f, v)}
                      onUpdateNegotiated={(v) => updateNegotiatedValue(sv.instanceId, v)}
                      onUpdateReason={(r) => updateNegotiationReason(sv.instanceId, r)}
                      onUpdateManual={(v) => updateManualValue(sv.instanceId, v)}
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
        </div>
      )}
    </>
  );
}

function ServiceCard({
  sv,
  propertyLabel: propLabel,
  onRemove,
  onUpdateParam,
  onUpdateNegotiated,
  onUpdateReason,
  onUpdateManual,
}: {
  sv: SelectedService;
  propertyLabel: string | null;
  onRemove: () => void;
  onUpdateParam: (field: string, value: number | undefined) => void;
  onUpdateNegotiated: (value: number) => void;
  onUpdateReason: (reason: string) => void;
  onUpdateManual: (value: number) => void;
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
          {propLabel && (
            <p className="text-xs text-[var(--signal-500)] mt-0.5">{propLabel}</p>
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
    </div>
  );
}

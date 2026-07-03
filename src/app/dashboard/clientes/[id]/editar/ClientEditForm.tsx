"use client";

import { useState, useTransition } from "react";
import { updateClient } from "@/lib/actions/clients";

type ClientType = "RURAL" | "URBANO";

interface PropState {
  id?: string;
  farmName: string;
  municipality: string;
  areaHa: string;
  latitude: string;
  longitude: string;
  streetAddress: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

interface ClientData {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: ClientType;
  properties: Array<{
    id: string;
    index: number;
    farmName: string | null;
    municipality: string | null;
    areaHa: number | null;
    latitude: number | null;
    longitude: number | null;
    streetAddress: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    cep: string | null;
  }>;
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  value,
  onChange,
}: {
  label: string;
  name?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const isControlled = onChange !== undefined;
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--steel-400)" }}>
        {label} {required && <span style={{ color: "var(--signal-500)" }}>*</span>}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        value={isControlled ? value : undefined}
        defaultValue={!isControlled ? value : undefined}
        onChange={isControlled ? (e) => onChange(e.target.value) : undefined}
        className="w-full px-3 py-2.5 text-sm border outline-none"
        style={{ borderColor: "var(--steel-200)", background: "var(--paper-50)", color: "var(--ink-900)" }}
      />
    </div>
  );
}

function emptyProp(): PropState {
  return { farmName: "", municipality: "", areaHa: "", latitude: "", longitude: "", streetAddress: "", neighborhood: "", city: "", state: "", cep: "" };
}

function RuralBlock({ prop, index, onChange }: { prop: PropState; index: number; onChange: (f: keyof PropState, v: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome da fazenda / propriedade" placeholder="Ex: Fazenda Santa Rita" value={prop.farmName} onChange={(v) => onChange("farmName", v)} />
        <Field label="Município" placeholder="Ex: Nanuque" value={prop.municipality} onChange={(v) => onChange("municipality", v)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Área (hectares)" type="number" placeholder="0.00" value={prop.areaHa} onChange={(v) => onChange("areaHa", v)} />
        <Field label="Latitude" type="number" placeholder="-17.8400" value={prop.latitude} onChange={(v) => onChange("latitude", v)} />
        <Field label="Longitude" type="number" placeholder="-40.3600" value={prop.longitude} onChange={(v) => onChange("longitude", v)} />
      </div>
      {/* Hidden inputs for FormData */}
      {prop.id && <input type="hidden" name={`prop_${index}_id`} value={prop.id} />}
      <input type="hidden" name={`prop_${index}_farmName`} value={prop.farmName} />
      <input type="hidden" name={`prop_${index}_municipality`} value={prop.municipality} />
      <input type="hidden" name={`prop_${index}_areaHa`} value={prop.areaHa} />
      <input type="hidden" name={`prop_${index}_latitude`} value={prop.latitude} />
      <input type="hidden" name={`prop_${index}_longitude`} value={prop.longitude} />
    </div>
  );
}

function UrbanBlock({ prop, index, onChange }: { prop: PropState; index: number; onChange: (f: keyof PropState, v: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Endereço / Logradouro" placeholder="Rua, número" value={prop.streetAddress} onChange={(v) => onChange("streetAddress", v)} />
      <div className="grid grid-cols-3 gap-4">
        <Field label="Bairro" placeholder="Ex: Centro" value={prop.neighborhood} onChange={(v) => onChange("neighborhood", v)} />
        <Field label="Cidade" placeholder="Ex: Nanuque" value={prop.city} onChange={(v) => onChange("city", v)} />
        <Field label="Estado" placeholder="MG" value={prop.state} onChange={(v) => onChange("state", v)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="CEP" placeholder="39520-000" value={prop.cep} onChange={(v) => onChange("cep", v)} />
      </div>
      {/* Hidden inputs for FormData */}
      {prop.id && <input type="hidden" name={`prop_${index}_id`} value={prop.id} />}
      <input type="hidden" name={`prop_${index}_streetAddress`} value={prop.streetAddress} />
      <input type="hidden" name={`prop_${index}_neighborhood`} value={prop.neighborhood} />
      <input type="hidden" name={`prop_${index}_city`} value={prop.city} />
      <input type="hidden" name={`prop_${index}_state`} value={prop.state} />
      <input type="hidden" name={`prop_${index}_cep`} value={prop.cep} />
    </div>
  );
}

export default function ClientEditForm({ client }: { client: ClientData }) {
  const [clientType, setClientType] = useState<ClientType>(client.type);
  const [properties, setProperties] = useState<PropState[]>(
    client.properties.length > 0
      ? client.properties.map((p) => ({
          id: p.id,
          farmName: p.farmName ?? "",
          municipality: p.municipality ?? "",
          areaHa: p.areaHa?.toString() ?? "",
          latitude: p.latitude?.toString() ?? "",
          longitude: p.longitude?.toString() ?? "",
          streetAddress: p.streetAddress ?? "",
          neighborhood: p.neighborhood ?? "",
          city: p.city ?? "",
          state: p.state ?? "",
          cep: p.cep ?? "",
        }))
      : [emptyProp()]
  );
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function addProperty() {
    setProperties((prev) => [...prev, emptyProp()]);
  }

  function removeProperty(index: number) {
    const prop = properties[index];
    if (prop.id) setDeletedIds((prev) => [...prev, prop.id!]);
    setProperties((prev) => prev.filter((_, i) => i !== index));
  }

  function updateProperty(index: number, field: keyof PropState, value: string) {
    setProperties((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function handleTypeChange(newType: ClientType) {
    setClientType(newType);
    // Reset property fields when type changes (keep IDs for deletion tracking)
    setProperties((prev) =>
      prev.map((p) => ({ ...emptyProp(), id: p.id }))
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateClient(client.id, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hidden fields */}
      <input type="hidden" name="propertyCount" value={properties.length} />
      <input type="hidden" name="deletedPropertyIds" value={deletedIds.join(",")} />

      {/* Dados pessoais */}
      <div className="p-6 border" style={{ borderColor: "var(--steel-200)", background: "white" }}>
        <h2 className="font-display text-lg font-bold mb-5" style={{ color: "var(--ink-900)" }}>
          Dados Pessoais
        </h2>
        <div className="flex flex-col gap-4">
          <Field label="Nome completo / Razão social" name="name" required placeholder="Ex: João da Silva" value={client.name} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="CPF / CNPJ" name="document" placeholder="000.000.000-00" value={client.document ?? ""} />
            <Field label="Telefone / WhatsApp" name="phone" placeholder="(38) 99999-9999" value={client.phone ?? ""} />
          </div>
          <Field label="E-mail" name="email" type="email" placeholder="email@exemplo.com" value={client.email ?? ""} />
          <Field label="Endereço principal" name="address" placeholder="Rua, número, bairro, cidade" value={client.address ?? ""} />
        </div>
      </div>

      {/* Tipo + Imóveis */}
      <div className="p-6 border" style={{ borderColor: "var(--steel-200)", background: "white" }}>
        <h2 className="font-display text-lg font-bold mb-5" style={{ color: "var(--ink-900)" }}>
          Tipo e Imóveis
        </h2>

        <div className="flex gap-6 mb-6">
          {[
            { value: "RURAL", label: "Rural", desc: "Produtor / propriedade rural" },
            { value: "URBANO", label: "Urbano", desc: "Empresa ou pessoa física urbana" },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 cursor-pointer flex-1 p-4 border transition-colors"
              style={{
                borderColor: clientType === opt.value ? "var(--signal-500)" : "var(--steel-200)",
                background: clientType === opt.value ? "rgba(242,72,10,0.04)" : "transparent",
              }}
            >
              <input
                type="radio"
                name="type"
                value={opt.value}
                checked={clientType === opt.value}
                onChange={() => handleTypeChange(opt.value as ClientType)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--ink-900)" }}>{opt.label}</div>
                <div className="text-xs" style={{ color: "var(--steel-400)" }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Blocos por imóvel */}
        <div className="flex flex-col gap-6">
          {properties.map((prop, i) => (
            <div key={i} className="border rounded-lg p-4" style={{ borderColor: "var(--steel-200)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--signal-500)" }}>
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px]"
                    style={{ background: "var(--signal-500)" }}
                  >
                    {i + 1}
                  </span>
                  {clientType === "RURAL"
                    ? `Propriedade Rural ${properties.length > 1 ? i + 1 : ""}`
                    : `Imóvel Urbano ${properties.length > 1 ? i + 1 : ""}`}
                </p>
                {properties.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProperty(i)}
                    className="text-xs px-2 py-1 border rounded hover:bg-red-50 transition-colors"
                    style={{ borderColor: "var(--steel-200)", color: "var(--steel-400)" }}
                  >
                    Remover
                  </button>
                )}
              </div>
              {clientType === "RURAL" ? (
                <RuralBlock prop={prop} index={i} onChange={(f, v) => updateProperty(i, f, v)} />
              ) : (
                <UrbanBlock prop={prop} index={i} onChange={(f, v) => updateProperty(i, f, v)} />
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addProperty}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 border border-dashed transition-colors w-full justify-center"
            style={{ borderColor: "var(--signal-500)", color: "var(--signal-500)" }}
          >
            + Adicionar {clientType === "RURAL" ? "Propriedade" : "Imóvel"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm px-4 py-3 border" style={{ color: "var(--signal-500)", borderColor: "var(--signal-500)", background: "rgba(242,72,10,0.05)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="facet-br px-6 py-3 text-sm font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
          style={{ background: "var(--signal-500)", color: "white" }}
        >
          {isPending ? "Salvando..." : "Salvar Alterações"}
        </button>
        <a
          href={`/dashboard/clientes/${client.id}`}
          className="px-6 py-3 text-sm font-semibold"
          style={{ color: "var(--steel-400)" }}
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}

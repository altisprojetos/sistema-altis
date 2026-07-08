"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/actions/clients";

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  hint,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  step?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-semibold uppercase tracking-wider mb-1"
        style={{ color: "var(--steel-400)" }}
      >
        {label} {required && <span style={{ color: "var(--signal-500)" }}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        step={step}
        className="w-full px-3 py-2.5 text-sm border outline-none"
        style={{
          borderColor: "var(--steel-200)",
          background: "var(--paper-50)",
          color: "var(--ink-900)",
        }}
      />
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--steel-400)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function RuralPropertyBlock({ index }: { index: number }) {
  const p = `prop_${index}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Nome da fazenda / propriedade"
          name={`${p}_farmName`}
          placeholder="Ex: Fazenda Santa Rita"
        />
        <Field
          label="Município"
          name={`${p}_municipality`}
          placeholder="Ex: Nanuque"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field
          label="Área (hectares)"
          name={`${p}_areaHa`}
          type="number"
          placeholder="0.00"
          hint="Total do imóvel"
          step="any"
        />
        <Field
          label="Latitude"
          name={`${p}_latitude`}
          type="number"
          placeholder="-17.8400"
          hint="Coordenada GPS"
          step="any"
        />
        <Field
          label="Longitude"
          name={`${p}_longitude`}
          type="number"
          placeholder="-40.3600"
          hint="Coordenada GPS"
          step="any"
        />
      </div>
    </div>
  );
}

function UrbanPropertyBlock({ index }: { index: number }) {
  const p = `prop_${index}`;
  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Endereço / Logradouro"
        name={`${p}_streetAddress`}
        placeholder="Ex: Rua das Acácias, 45"
      />
      <div className="grid grid-cols-3 gap-4">
        <Field
          label="Bairro"
          name={`${p}_neighborhood`}
          placeholder="Ex: Centro"
        />
        <Field
          label="Cidade"
          name={`${p}_city`}
          placeholder="Ex: Nanuque"
        />
        <Field
          label="Estado"
          name={`${p}_state`}
          placeholder="MG"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="CEP"
          name={`${p}_cep`}
          placeholder="39520-000"
        />
      </div>
    </div>
  );
}

export default function ClientForm() {
  const [clientType, setClientType] = useState<"RURAL" | "URBANO">("RURAL");
  const [propertyCount, setPropertyCount] = useState(1);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createClient(formData);
      if (result?.error) setError(result.error);
    });
  }

  const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dados pessoais */}
      <div
        className="p-6 border"
        style={{ borderColor: "var(--steel-200)", background: "white" }}
      >
        <h2
          className="font-display text-lg font-bold mb-5"
          style={{ color: "var(--ink-900)" }}
        >
          Dados Pessoais
        </h2>
        <div className="flex flex-col gap-4">
          <Field
            label="Nome completo / Razão social"
            name="name"
            required
            placeholder="Ex: João da Silva"
          />
          <div className="grid grid-cols-2 gap-4">
            <Field label="CPF / CNPJ" name="document" placeholder="000.000.000-00" />
            <Field label="Telefone / WhatsApp" name="phone" placeholder="(38) 99999-9999" />
          </div>
          <Field label="E-mail" name="email" type="email" placeholder="email@exemplo.com" />
          <Field label="Endereço principal" name="address" placeholder="Rua, número, bairro, cidade" />
        </div>
      </div>

      {/* Tipo + Quantidade de imóveis */}
      <div
        className="p-6 border"
        style={{ borderColor: "var(--steel-200)", background: "white" }}
      >
        <h2
          className="font-display text-lg font-bold mb-5"
          style={{ color: "var(--ink-900)" }}
        >
          Tipo de Cliente e Imóveis
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
                borderColor:
                  clientType === opt.value ? "var(--signal-500)" : "var(--steel-200)",
                background:
                  clientType === opt.value ? "rgba(242,72,10,0.04)" : "transparent",
              }}
            >
              <input
                type="radio"
                name="type"
                value={opt.value}
                checked={clientType === opt.value}
                onChange={() => setClientType(opt.value as "RURAL" | "URBANO")}
                className="mt-0.5"
              />
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--ink-900)" }}
                >
                  {opt.label}
                </div>
                <div className="text-xs" style={{ color: "var(--steel-400)" }}>
                  {opt.desc}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Quantidade de imóveis */}
        <div className="mb-6">
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--steel-400)" }}
          >
            Quantidade de{" "}
            {clientType === "RURAL" ? "propriedades rurais" : "imóveis urbanos"}
          </label>
          <input type="hidden" name="propertyCount" value={propertyCount} />
          <div className="flex gap-2 flex-wrap">
            {counts.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPropertyCount(n)}
                className="w-9 h-9 text-sm font-semibold border transition-colors"
                style={{
                  borderColor:
                    propertyCount === n ? "var(--signal-500)" : "var(--steel-200)",
                  background:
                    propertyCount === n ? "var(--signal-500)" : "white",
                  color: propertyCount === n ? "white" : "var(--ink-900)",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Blocos por imóvel */}
        <div className="flex flex-col gap-6">
          {Array.from({ length: propertyCount }, (_, i) => (
            <div
              key={i}
              className="border-t pt-5"
              style={{ borderColor: "var(--paper-100)" }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
                style={{ color: "var(--signal-500)" }}
              >
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs"
                  style={{ background: "var(--signal-500)" }}
                >
                  {i + 1}
                </span>
                {clientType === "RURAL"
                  ? `Propriedade Rural ${propertyCount > 1 ? i + 1 : ""}`
                  : `Imóvel Urbano ${propertyCount > 1 ? i + 1 : ""}`}
              </p>
              {clientType === "RURAL" ? (
                <RuralPropertyBlock index={i} />
              ) : (
                <UrbanPropertyBlock index={i} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p
          className="text-sm px-4 py-3 border"
          style={{
            color: "var(--signal-500)",
            borderColor: "var(--signal-500)",
            background: "rgba(242,72,10,0.05)",
          }}
        >
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
          {isPending ? "Salvando..." : "Salvar Cliente"}
        </button>
        <a
          href="/dashboard/clientes"
          className="px-6 py-3 text-sm font-semibold"
          style={{ color: "var(--steel-400)" }}
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}

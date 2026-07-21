"use client";

import { useState } from "react";

type Banco = "BNB" | "BB";

interface Parcela {
  mes: number;
  tipo: "carencia" | "amortizacao";
  saldoInicial: number;
  amortizacao: number;
  juros: number;
  prestacao: number;
  saldoFinal: number;
}

const BANCOS: Record<Banco, { nome: string; taxas: { label: string; valor: number }[] }> = {
  BNB: {
    nome: "Banco do Nordeste (BNB)",
    taxas: [
      { label: "Pronaf A/B — 4% a.a.", valor: 4 },
      { label: "Pronaf Demais — 6% a.a.", valor: 6 },
      { label: "FNE Verde — 7% a.a.", valor: 7 },
      { label: "FNE Industrial — 10% a.a.", valor: 10 },
    ],
  },
  BB: {
    nome: "Banco do Brasil (BB)",
    taxas: [
      { label: "Pronaf Custeio — 3% a.a.", valor: 3 },
      { label: "Pronaf Investimento — 5% a.a.", valor: 5 },
      { label: "FCO Rural — 8% a.a.", valor: 8 },
      { label: "Crédito Rural Geral — 10% a.a.", valor: 10 },
    ],
  },
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcular(
  valor: number,
  taxaAnual: number,
  prazoTotal: number,
  carencia: number
): Parcela[] {
  const r = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
  const nAmort = prazoTotal - carencia;
  const amortMensal = valor / nAmort;
  const parcelas: Parcela[] = [];
  let saldo = valor;

  for (let mes = 1; mes <= prazoTotal; mes++) {
    const saldoInicial = saldo;
    const juros = saldo * r;

    if (mes <= carencia) {
      parcelas.push({
        mes,
        tipo: "carencia",
        saldoInicial,
        amortizacao: 0,
        juros,
        prestacao: juros,
        saldoFinal: saldo,
      });
    } else {
      const amort = Math.min(amortMensal, saldo);
      saldo -= amort;
      parcelas.push({
        mes,
        tipo: "amortizacao",
        saldoInicial,
        amortizacao: amort,
        juros,
        prestacao: amort + juros,
        saldoFinal: saldo,
      });
    }
  }

  return parcelas;
}

export default function SimulacaoForm() {
  const [banco, setBanco] = useState<Banco>("BNB");
  const [valor, setValor] = useState("");
  const [taxa, setTaxa] = useState("");
  const [prazo, setPrazo] = useState("");
  const [carencia, setCarencia] = useState("");
  const [parcelas, setParcelas] = useState<Parcela[] | null>(null);
  const [erro, setErro] = useState("");

  function handleTaxaPreset(v: number) {
    setTaxa(String(v));
  }

  function simular() {
    setErro("");
    const v = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    const t = parseFloat(taxa.replace(",", "."));
    const p = parseInt(prazo);
    const c = parseInt(carencia || "0");

    if (!v || v <= 0) return setErro("Informe o valor financiado.");
    if (!t || t <= 0) return setErro("Informe a taxa de juros anual.");
    if (!p || p <= 0) return setErro("Informe o prazo total em meses.");
    if (c < 0 || c >= p) return setErro("Carência deve ser menor que o prazo total.");

    setParcelas(calcular(v, t, p, c));
  }

  function exportarPDF() {
    const v = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    const t = parseFloat(taxa.replace(",", "."));
    const p = parseInt(prazo);
    const c = parseInt(carencia || "0");
    const params = new URLSearchParams({
      banco,
      valor: String(v),
      taxa: String(t),
      prazo: String(p),
      carencia: String(c),
    });
    window.open(`/api/simulacao?${params}`, "_blank");
  }

  const totalJuros = parcelas?.reduce((s, p) => s + p.juros, 0) ?? 0;
  const totalPago = parcelas?.reduce((s, p) => s + p.prestacao, 0) ?? 0;
  const primeiraAmort = parcelas?.find(p => p.tipo === "amortizacao");
  const ultimaAmort = parcelas ? parcelas[parcelas.length - 1] : null;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">

      {/* Formulário */}
      <div className="bg-white border p-6" style={{ borderColor: "var(--steel-200)" }}>
        <h2 className="font-display text-base font-bold mb-5" style={{ color: "var(--ink-900)" }}>
          Parâmetros da Simulação
        </h2>

        {/* Banco */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--steel-400)" }}>
            Banco
          </label>
          <div className="flex gap-3">
            {(Object.keys(BANCOS) as Banco[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => { setBanco(b); setTaxa(""); }}
                className="flex-1 py-2.5 px-4 text-sm font-semibold border transition-colors"
                style={{
                  borderColor: banco === b ? "var(--signal-500)" : "var(--steel-200)",
                  background: banco === b ? "rgba(242,72,10,0.05)" : "transparent",
                  color: banco === b ? "var(--signal-500)" : "var(--ink-900)",
                }}
              >
                {b} — {BANCOS[b].nome.split(" (")[0]}
              </button>
            ))}
          </div>

          {/* Taxas de referência */}
          <div className="mt-3">
            <p className="text-xs mb-2" style={{ color: "var(--steel-400)" }}>Taxas de referência ({BANCOS[banco].nome}):</p>
            <div className="flex flex-wrap gap-2">
              {BANCOS[banco].taxas.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => handleTaxaPreset(t.valor)}
                  className="text-xs px-2.5 py-1 border rounded-full transition-colors hover:border-[var(--signal-500)] hover:text-[var(--signal-500)]"
                  style={{
                    borderColor: taxa === String(t.valor) ? "var(--signal-500)" : "var(--steel-200)",
                    color: taxa === String(t.valor) ? "var(--signal-500)" : "var(--steel-400)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Campos */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--steel-400)" }}>
              Valor Financiado (R$) *
            </label>
            <input
              type="text"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex: 100000"
              className="w-full px-3 py-2.5 text-sm border outline-none"
              style={{ borderColor: "var(--steel-200)", background: "var(--paper-50)", color: "var(--ink-900)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--steel-400)" }}>
              Taxa de Juros Anual (%) *
            </label>
            <input
              type="number"
              step="any"
              value={taxa}
              onChange={(e) => setTaxa(e.target.value)}
              placeholder="Ex: 6"
              className="w-full px-3 py-2.5 text-sm border outline-none"
              style={{ borderColor: "var(--steel-200)", background: "var(--paper-50)", color: "var(--ink-900)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--steel-400)" }}>
              Prazo Total (meses) *
            </label>
            <input
              type="number"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              placeholder="Ex: 120"
              className="w-full px-3 py-2.5 text-sm border outline-none"
              style={{ borderColor: "var(--steel-200)", background: "var(--paper-50)", color: "var(--ink-900)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--steel-400)" }}>
              Carência (meses)
            </label>
            <input
              type="number"
              value={carencia}
              onChange={(e) => setCarencia(e.target.value)}
              placeholder="Ex: 24"
              className="w-full px-3 py-2.5 text-sm border outline-none"
              style={{ borderColor: "var(--steel-200)", background: "var(--paper-50)", color: "var(--ink-900)" }}
            />
          </div>
        </div>

        {erro && (
          <p className="mb-4 text-xs px-3 py-2 border" style={{ color: "var(--signal-500)", borderColor: "var(--signal-500)", background: "rgba(242,72,10,0.05)" }}>
            {erro}
          </p>
        )}

        <button
          onClick={simular}
          className="px-6 py-3 text-sm font-bold uppercase tracking-wider cursor-pointer"
          style={{ background: "var(--signal-500)", color: "white" }}
        >
          Simular
        </button>
      </div>

      {/* Resultado */}
      {parcelas && (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Valor Financiado", value: fmt(parseFloat(valor.replace(/\./g, "").replace(",", "."))), color: "var(--ink-900)" },
              { label: "Total de Juros", value: fmt(totalJuros), color: "#dc2626" },
              { label: "Total Pago", value: fmt(totalPago), color: "var(--signal-500)" },
              { label: "1ª Parcela (amort.)", value: primeiraAmort ? fmt(primeiraAmort.prestacao) : "—", color: "var(--ink-900)" },
            ].map((c) => (
              <div key={c.label} className="bg-white border p-4" style={{ borderColor: "var(--steel-200)" }}>
                <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--steel-400)" }}>{c.label}</p>
                <p className="text-lg font-bold" style={{ color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Tabela de parcelas */}
          <div className="bg-white border" style={{ borderColor: "var(--steel-200)" }}>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--steel-200)" }}>
              <div>
                <h2 className="font-display text-base font-bold" style={{ color: "var(--ink-900)" }}>
                  Tabela de Amortização — SAC
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--steel-400)" }}>
                  {BANCOS[banco].nome} · {taxa}% a.a. · {prazo} meses · {carencia || 0} meses de carência
                </p>
              </div>
              <button
                onClick={exportarPDF}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer"
                style={{ borderColor: "var(--steel-200)", color: "var(--ink-900)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Exportar PDF
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--ink-900)", color: "white" }}>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Mês</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-center">Tipo</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Saldo Inicial</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Amortização</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Juros</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Prestação</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Saldo Final</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelas.map((p, i) => (
                    <tr
                      key={p.mes}
                      style={{
                        background: p.tipo === "carencia"
                          ? "rgba(251,191,36,0.07)"
                          : i % 2 === 0 ? "white" : "var(--paper-50)",
                      }}
                    >
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: "var(--steel-400)" }}>{p.mes}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${
                          p.tipo === "carencia"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {p.tipo === "carencia" ? "Carência" : "Amort."}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-xs">{fmt(p.saldoInicial)}</td>
                      <td className="px-4 py-2 text-right text-xs">{p.amortizacao > 0 ? fmt(p.amortizacao) : "—"}</td>
                      <td className="px-4 py-2 text-right text-xs text-red-600">{fmt(p.juros)}</td>
                      <td className="px-4 py-2 text-right text-xs font-semibold" style={{ color: "var(--ink-900)" }}>{fmt(p.prestacao)}</td>
                      <td className="px-4 py-2 text-right text-xs">{fmt(p.saldoFinal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--ink-900)", color: "white" }}>
                    <td className="px-4 py-2.5 text-xs font-bold" colSpan={3}>TOTAL</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">
                      {fmt(parcelas.reduce((s, p) => s + p.amortizacao, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{fmt(totalJuros)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold">{fmt(totalPago)}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{ultimaAmort ? fmt(ultimaAmort.saldoFinal) : "—"}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

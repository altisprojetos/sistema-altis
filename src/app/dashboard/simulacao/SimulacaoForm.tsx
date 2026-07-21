"use client";

import { useState, useRef, useEffect } from "react";

interface Parcela {
  ano: number;
  tipo: "carencia" | "amortizacao";
  saldoInicial: number;
  amortizacao: number;
  juros: number;
  prestacao: number;
  saldoFinal: number;
}

interface Cliente {
  id: string;
  name: string;
  document: string | null;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcular(valor: number, taxaAnual: number, prazoAnos: number, carenciaAnos: number): Parcela[] {
  const nAmort = prazoAnos - carenciaAnos;
  const amortAnual = nAmort > 0 ? valor / nAmort : 0;
  const rate = taxaAnual / 100;
  const parcelas: Parcela[] = [];

  // saldoTotal: saldo com capitalização composta (base para calcular prestação)
  // saldoPrincipal: redução de principal constante (Saldo Dev. Principal da ref.)
  let saldoTotal = valor;
  let saldoPrincipal = valor;

  for (let ano = 1; ano <= prazoAnos; ano++) {
    const saldoInicial = saldoPrincipal;
    // períodos restantes incluindo o atual — divide o saldo capitalizado igualmente
    const nRestantes = prazoAnos - ano + 1;

    if (ano <= carenciaAnos) {
      // Carência: paga apenas juros simples sobre o saldo; saldo não se altera
      const juros = saldoTotal * rate;
      parcelas.push({ ano, tipo: "carencia", saldoInicial, amortizacao: 0, juros, prestacao: juros, saldoFinal: saldoPrincipal });
    } else {
      // Amortização: saldo capitaliza e é dividido pelos períodos restantes
      const totalCapitalizado = saldoTotal * (1 + rate);
      const prestacao = totalCapitalizado / nRestantes;
      const amort = Math.min(amortAnual, saldoPrincipal);
      const juros = prestacao - amort; // Encargos = diferença entre prestação e amortização constante

      saldoTotal = Math.max(0, totalCapitalizado - prestacao);
      saldoPrincipal = Math.max(0, saldoPrincipal - amort);

      parcelas.push({ ano, tipo: "amortizacao", saldoInicial, amortizacao: amort, juros, prestacao, saldoFinal: saldoPrincipal });
    }
  }

  return parcelas;
}

export default function SimulacaoForm({ clientes }: { clientes: Cliente[] }) {
  const [banco, setBanco] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [valor, setValor] = useState("");
  const [taxa, setTaxa] = useState("");
  const [prazo, setPrazo] = useState("");
  const [carencia, setCarencia] = useState("");
  const [parcelas, setParcelas] = useState<Parcela[] | null>(null);
  const [erro, setErro] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const clienteSelecionado = clientes.find(c => c.id === clienteId);
  const clientesFiltrados = clienteSearch
    ? clientes.filter(c =>
        c.name.toLowerCase().includes(clienteSearch.toLowerCase()) ||
        (c.document ?? "").includes(clienteSearch)
      )
    : clientes;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function simular() {
    setErro("");
    const v = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    const t = parseFloat(taxa.replace(",", "."));
    const p = parseInt(prazo);
    const c = parseInt(carencia || "0");

    if (!v || v <= 0) return setErro("Informe o valor financiado.");
    if (!t || t <= 0) return setErro("Informe a taxa de juros anual.");
    if (!p || p <= 0) return setErro("Informe o prazo total em anos.");
    if (c < 0 || c >= p) return setErro("Carência deve ser menor que o prazo total.");

    setParcelas(calcular(v, t, p, c));
  }

  function exportarPDF() {
    const v = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    const t = parseFloat(taxa.replace(",", "."));
    const p = parseInt(prazo);
    const c = parseInt(carencia || "0");
    const params = new URLSearchParams({
      banco: banco || "Não informado",
      valor: String(v),
      taxa: String(t),
      prazo: String(p),
      carencia: String(c),
    });
    if (clienteSelecionado) {
      params.set("clienteNome", clienteSelecionado.name);
      if (clienteSelecionado.document) params.set("clienteDoc", clienteSelecionado.document);
    }
    window.open(`/api/simulacao?${params}`, "_blank");
  }

  const totalJuros = parcelas?.reduce((s, p) => s + p.juros, 0) ?? 0;
  const totalPago = parcelas?.reduce((s, p) => s + p.prestacao, 0) ?? 0;
  const primeiraAmort = parcelas?.find(p => p.tipo === "amortizacao");
  const valorNum = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;

  const inputStyle = {
    borderColor: "var(--steel-200)",
    background: "var(--paper-50)",
    color: "var(--ink-900)",
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Formulário */}
      <div className="bg-white border p-6" style={{ borderColor: "var(--steel-200)" }}>
        <h2 className="font-display text-base font-bold mb-5" style={{ color: "var(--ink-900)" }}>
          Parâmetros da Simulação
        </h2>

        {/* Banco e Cliente */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--steel-400)" }}>
              Banco / Instituição
            </label>
            <input
              type="text"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              placeholder="Ex: Banco do Nordeste (BNB)"
              className="w-full px-3 py-2.5 text-sm border outline-none"
              style={inputStyle}
            />
          </div>

          {/* Cliente (opcional) */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--steel-400)" }}>
              Cliente{" "}
              <span className="font-normal normal-case tracking-normal" style={{ color: "var(--steel-300)" }}>
                (opcional)
              </span>
            </label>
            {clienteSelecionado ? (
              <div
                className="flex items-center gap-2 px-3 py-2.5 border text-sm"
                style={{ borderColor: "var(--steel-200)", background: "var(--paper-50)" }}
              >
                <span className="flex-1" style={{ color: "var(--ink-900)" }}>{clienteSelecionado.name}</span>
                <button
                  type="button"
                  onClick={() => { setClienteId(""); setClienteSearch(""); }}
                  className="text-xs leading-none hover:opacity-70"
                  style={{ color: "var(--steel-400)" }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={clienteSearch}
                  onChange={(e) => { setClienteSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Buscar por nome ou CPF/CNPJ..."
                  className="w-full px-3 py-2.5 text-sm border outline-none"
                  style={inputStyle}
                />
                {showDropdown && clientesFiltrados.length > 0 && (
                  <div
                    className="absolute z-20 top-full left-0 right-0 border bg-white shadow-md max-h-52 overflow-y-auto"
                    style={{ borderColor: "var(--steel-200)" }}
                  >
                    {clientesFiltrados.slice(0, 30).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setClienteId(c.id); setClienteSearch(""); setShowDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-gray-50"
                        style={{ borderColor: "var(--steel-100)", color: "var(--ink-900)" }}
                      >
                        {c.name}
                        {c.document && (
                          <span className="ml-2 text-xs" style={{ color: "var(--steel-400)" }}>{c.document}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && clienteSearch && clientesFiltrados.length === 0 && (
                  <div
                    className="absolute z-20 top-full left-0 right-0 border bg-white px-3 py-2 text-xs"
                    style={{ borderColor: "var(--steel-200)", color: "var(--steel-400)" }}
                  >
                    Nenhum cliente encontrado.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Campos numéricos */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--steel-400)" }}>
              Valor Financiado (R$) *
            </label>
            <input
              type="text"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex: 500000"
              className="w-full px-3 py-2.5 text-sm border outline-none"
              style={inputStyle}
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
              placeholder="Ex: 7"
              className="w-full px-3 py-2.5 text-sm border outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--steel-400)" }}>
              Prazo Total (anos) *
            </label>
            <input
              type="number"
              min="1"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              placeholder="Ex: 10"
              className="w-full px-3 py-2.5 text-sm border outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--steel-400)" }}>
              Carência (anos)
            </label>
            <input
              type="number"
              min="0"
              value={carencia}
              onChange={(e) => setCarencia(e.target.value)}
              placeholder="Ex: 2"
              className="w-full px-3 py-2.5 text-sm border outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        {erro && (
          <p
            className="mb-4 text-xs px-3 py-2 border"
            style={{ color: "var(--signal-500)", borderColor: "var(--signal-500)", background: "rgba(242,72,10,0.05)" }}
          >
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
              { label: "Valor Financiado", value: fmt(valorNum), color: "var(--ink-900)" },
              { label: "Total de Juros", value: fmt(totalJuros), color: "#dc2626" },
              { label: "Total Pago", value: fmt(totalPago), color: "var(--signal-500)" },
              { label: "1ª Parcela (amort.)", value: primeiraAmort ? fmt(primeiraAmort.prestacao) : "—", color: "var(--ink-900)" },
            ].map((card) => (
              <div key={card.label} className="bg-white border p-4" style={{ borderColor: "var(--steel-200)" }}>
                <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--steel-400)" }}>
                  {card.label}
                </p>
                <p className="text-lg font-bold" style={{ color: card.color }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Tabela */}
          <div className="bg-white border" style={{ borderColor: "var(--steel-200)" }}>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--steel-200)" }}>
              <div>
                <h2 className="font-display text-base font-bold" style={{ color: "var(--ink-900)" }}>
                  Tabela de Amortização
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--steel-400)" }}>
                  {banco || "Banco não informado"} · {taxa}% a.a. · {prazo} ano{parseInt(prazo) !== 1 ? "s" : ""} · Carência: {carencia || 0} ano{parseInt(carencia || "0") !== 1 ? "s" : ""} · Reembolso anual
                  {clienteSelecionado && ` · ${clienteSelecionado.name}`}
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
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Ano</th>
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
                      key={p.ano}
                      style={{
                        background: p.tipo === "carencia"
                          ? "rgba(251,191,36,0.07)"
                          : i % 2 === 0 ? "white" : "var(--paper-50)",
                      }}
                    >
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: "var(--steel-400)" }}>{p.ano}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${
                          p.tipo === "carencia" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
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
                    <td className="px-4 py-2.5 text-right text-xs" />
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

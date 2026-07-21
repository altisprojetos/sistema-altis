import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcular(valor: number, taxaAnual: number, prazoAnos: number, carenciaAnos: number) {
  const nAmort = prazoAnos - carenciaAnos;
  const amortAnual = nAmort > 0 ? valor / nAmort : 0;
  const rate = taxaAnual / 100;
  const rows: {
    ano: number; tipo: string; saldoInicial: number;
    amort: number; juros: number; prestacao: number; saldoFinal: number;
  }[] = [];

  let saldoTotal = valor;     // saldo com capitalização composta
  let saldoPrincipal = valor; // redução de principal constante

  for (let ano = 1; ano <= prazoAnos; ano++) {
    const saldoInicial = saldoPrincipal;
    const nRestantes = prazoAnos - ano + 1;

    if (ano <= carenciaAnos) {
      const juros = saldoTotal * rate;
      rows.push({ ano, tipo: "Carência", saldoInicial, amort: 0, juros, prestacao: juros, saldoFinal: saldoPrincipal });
    } else {
      const totalCapitalizado = saldoTotal * (1 + rate);
      const prestacao = totalCapitalizado / nRestantes;
      const amort = Math.min(amortAnual, saldoPrincipal);
      const juros = prestacao - amort;

      saldoTotal = Math.max(0, totalCapitalizado - prestacao);
      saldoPrincipal = Math.max(0, saldoPrincipal - amort);

      rows.push({ ano, tipo: "Amort.", saldoInicial, amort, juros, prestacao, saldoFinal: saldoPrincipal });
    }
  }
  return rows;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Não autorizado", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const banco       = sp.get("banco") ?? "Não informado";
  const valor       = parseFloat(sp.get("valor") ?? "0");
  const taxa        = parseFloat(sp.get("taxa") ?? "0");
  const prazo       = parseInt(sp.get("prazo") ?? "0");
  const carencia    = parseInt(sp.get("carencia") ?? "0");
  const clienteNome = sp.get("clienteNome") ?? "";
  const clienteDoc  = sp.get("clienteDoc") ?? "";

  if (!valor || !taxa || !prazo) return new NextResponse("Parâmetros inválidos", { status: 400 });

  const rows = calcular(valor, taxa, prazo, carencia);
  const totalJuros  = rows.reduce((s, r) => s + r.juros, 0);
  const totalPago   = rows.reduce((s, r) => s + r.prestacao, 0);
  const totalAmort  = rows.reduce((s, r) => s + r.amort, 0);
  const primeiraAmort = rows.find(r => r.tipo === "Amort.");

  let lhSrc = "/papel-timbrado.png";
  try {
    lhSrc = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public", "papel-timbrado.png")).toString("base64")}`;
  } catch { /* fallback */ }

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const tableRows = rows.map((r, i) => `
    <tr style="background:${r.tipo === "Carência" ? "#fffbeb" : i % 2 === 0 ? "white" : "#f9f9f9"}">
      <td style="padding:4px 8px;font-size:11px;color:#888;font-family:monospace">${r.ano}</td>
      <td style="padding:4px 8px;text-align:center">
        <span style="font-size:9px;padding:1px 5px;border-radius:3px;font-weight:600;background:${r.tipo === "Carência" ? "#fef3c7" : "#dbeafe"};color:${r.tipo === "Carência" ? "#92400e" : "#1e40af"}">${r.tipo}</span>
      </td>
      <td style="padding:4px 8px;text-align:right;font-size:11px">${fmt(r.saldoInicial)}</td>
      <td style="padding:4px 8px;text-align:right;font-size:11px">${r.amort > 0 ? fmt(r.amort) : "—"}</td>
      <td style="padding:4px 8px;text-align:right;font-size:11px;color:#dc2626">${fmt(r.juros)}</td>
      <td style="padding:4px 8px;text-align:right;font-size:11.5px;font-weight:700">${fmt(r.prestacao)}</td>
      <td style="padding:4px 8px;text-align:right;font-size:11px">${fmt(r.saldoFinal)}</td>
    </tr>`).join("");

  const clienteBlock = clienteNome ? `
    <div style="border:1px solid #e5e5e5;padding:8px 12px;margin-bottom:14px">
      <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Cliente</div>
      <div style="font-size:12.5px;font-weight:600;color:#1a1a1a">${clienteNome}${clienteDoc ? ` — ${clienteDoc}` : ""}</div>
    </div>` : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Simulação de Financiamento — ${banco}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#b8b8b8;font-family:Arial,sans-serif;}
#tb{position:sticky;top:0;z-index:300;background:#0A2238;color:#fff;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;}
#tb button{background:#F2480A;color:#fff;border:none;padding:8px 22px;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;}
.page{width:210mm;min-height:297mm;position:relative;margin:8mm auto;background-size:100% 100%;background-repeat:no-repeat;box-shadow:0 3px 14px rgba(0,0,0,.28);}
.pc{position:absolute;top:40mm;left:16mm;right:16mm;bottom:29mm;overflow:hidden;}
@media print{
  @page{size:A4;margin:0;}
  #tb{display:none;}
  body{background:white;}
  .page{margin:0;box-shadow:none;page-break-after:always;}
  .page:last-child{page-break-after:auto;}
}
</style>
</head>
<body>
<div id="tb">
  <span style="font-size:14px">Simulação — <strong>${banco}</strong>${clienteNome ? ` — ${clienteNome}` : ""}</span>
  <button onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
</div>

<div id="pages"></div>

<div id="pool" style="position:fixed;top:-99999px;left:0;width:178mm;visibility:hidden;font-family:Arial,sans-serif;font-size:12px;">

  <div class="blk">
    <p style="text-align:right;font-size:11px;color:#666;padding-bottom:14px">Nanuque-MG, ${today}</p>
    <p style="font-size:16px;font-weight:bold;color:#0A2238;border-bottom:2px solid #0A2238;padding-bottom:6px;margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px">
      Simulação de Financiamento
    </p>
    ${clienteBlock}
  </div>

  <div class="blk">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${[
        ["Banco / Instituição", banco],
        ["Taxa de Juros", `${taxa}% ao ano`],
        ["Valor Financiado", fmt(valor)],
        ["Prazo Total", `${prazo} ${prazo === 1 ? "ano" : "anos"}`],
        ["Carência", `${carencia} ${carencia === 1 ? "ano" : "anos"}`],
        ["Sistema / Reembolso", "Amortização Constante Anual"],
      ].map(([k, v]) => `
        <div style="border:1px solid #e5e5e5;padding:8px 12px">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">${k}</div>
          <div style="font-size:12.5px;font-weight:600;color:#1a1a1a">${v}</div>
        </div>`).join("")}
    </div>
  </div>

  <div class="blk">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
      ${[
        ["Total de Juros", fmt(totalJuros), "#dc2626"],
        ["Total Pago", fmt(totalPago), "#F2480A"],
        primeiraAmort ? ["1ª Parcela (amort.)", fmt(primeiraAmort.prestacao), "#0A2238"] : ["", "", ""],
      ].map(([k, v, c]) => k ? `
        <div style="background:#f5f5f5;padding:10px 12px;border-left:3px solid ${c}">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">${k}</div>
          <div style="font-size:14px;font-weight:700;color:${c}">${v}</div>
        </div>` : "").join("")}
    </div>
  </div>

  <div class="blk">
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#0A2238;color:white">
          <th style="padding:6px 8px;text-align:left">Ano</th>
          <th style="padding:6px 8px;text-align:center">Tipo</th>
          <th style="padding:6px 8px;text-align:right">Saldo Inicial</th>
          <th style="padding:6px 8px;text-align:right">Amortização</th>
          <th style="padding:6px 8px;text-align:right">Juros</th>
          <th style="padding:6px 8px;text-align:right">Prestação</th>
          <th style="padding:6px 8px;text-align:right">Saldo Final</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
      <tfoot>
        <tr style="background:#0A2238;color:white;font-weight:bold">
          <td colspan="3" style="padding:6px 8px;font-size:11px">TOTAL</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px">${fmt(totalAmort)}</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px">${fmt(totalJuros)}</td>
          <td style="padding:6px 8px;text-align:right;font-size:13px">${fmt(totalPago)}</td>
          <td style="padding:6px 8px"></td>
        </tr>
      </tfoot>
    </table>
  </div>

</div>

<script>
(function(){
  var LH='${lhSrc}';
  function run(){
    var pool=document.getElementById('pool');
    var pages=document.getElementById('pages');
    var probe=document.createElement('div');
    probe.style.cssText='position:fixed;top:-9999px;left:0;width:1mm;height:0;pointer-events:none;';
    document.body.appendChild(probe);
    var px1mm=probe.getBoundingClientRect().width;
    document.body.removeChild(probe);
    var maxH=228*px1mm*0.97;

    function newPage(){
      var pg=document.createElement('div');
      pg.className='page';
      pg.style.backgroundImage="url('"+LH+"')";
      var ct=document.createElement('div');
      ct.className='pc';
      pg.appendChild(ct);
      pages.appendChild(pg);
      return ct;
    }

    var area=newPage();
    var used=0;
    var arr=[].slice.call(pool.children);
    for(var i=0;i<arr.length;i++){
      var blk=arr[i];
      var h=blk.getBoundingClientRect().height;
      if(used>8&&used+h>maxH){ area=newPage(); used=0; }
      area.appendChild(blk);
      used+=h;
    }
    pool.parentNode.removeChild(pool);
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',run); } else { run(); }
})();
</script>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

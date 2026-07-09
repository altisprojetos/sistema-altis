import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

function formatCurrency(v: number | null | undefined) {
  if (!v && v !== 0) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateLong(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new NextResponse("Não autorizado", { status: 401 });

  const { id } = await params;
  const pagamento =
    request.nextUrl.searchParams.get("pagamento") ?? "À combinar com o cliente";
  const observacoes = request.nextUrl.searchParams.get("obs") ?? "";

  const rec = await prisma.process.findUnique({
    where: { id },
    include: {
      client: true,
      seller: { select: { name: true } },
      services: {
        select: {
          serviceName: true,
          serviceGroup: true,
          negotiatedValue: true,
          calculatedValue: true,
          negotiationReason: true,
          hectares: true,
          squareMeters: true,
          financedValue: true,
        },
      },
    },
  });

  if (!rec) return new NextResponse("Não encontrado", { status: 404 });

  if (
    session.user.roles.includes("VENDEDOR") &&
    !session.user.roles.includes("ADMIN") &&
    rec.sellerId !== session.user.id
  ) return new NextResponse("Sem permissão", { status: 403 });

  const totalValue = rec.services.reduce((s, sv) => s + (sv.negotiatedValue ?? 0), 0);
  const totalCalculated = rec.services.reduce((s, sv) => s + (sv.calculatedValue ?? sv.negotiatedValue ?? 0), 0);
  const hasAnyDiscount = totalCalculated !== totalValue;

  let lhSrc = "/papel-timbrado.png";
  try {
    lhSrc = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public", "papel-timbrado.png")).toString("base64")}`;
  } catch { /* fallback */ }

  const serviceRows = rec.services.map((sv, i) => {
    const hasDiscount = sv.calculatedValue != null && sv.negotiatedValue != null
      && Math.abs(sv.calculatedValue - sv.negotiatedValue) > 0.01;
    const detailParts: string[] = [];
    if (sv.hectares) detailParts.push(`${sv.hectares} ha`);
    if (sv.squareMeters) detailParts.push(`${sv.squareMeters} m²`);
    if (sv.financedValue) detailParts.push(`Financiamento: ${formatCurrency(sv.financedValue)}`);
    return `
      <tr style="${i % 2 === 1 ? "background:#f7f7f7" : ""}">
        <td style="padding:7px 10px;border-bottom:1px solid #e5e5e5">
          <span style="font-weight:600;font-size:12px">${esc(sv.serviceName)}</span>
          ${sv.serviceGroup ? `<br><span style="color:#888;font-size:10.5px">${esc(sv.serviceGroup)}</span>` : ""}
          ${detailParts.length ? `<br><span style="color:#aaa;font-size:10px">${detailParts.join(" · ")}</span>` : ""}
        </td>
        ${hasAnyDiscount
          ? `<td style="padding:7px 10px;text-align:right;border-bottom:1px solid #e5e5e5;white-space:nowrap;font-size:12px;color:#999">${hasDiscount ? formatCurrency(sv.calculatedValue) : "—"}</td>
             <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #e5e5e5;white-space:nowrap;font-size:12.5px;font-weight:700;color:#1a1a1a">
               ${formatCurrency(sv.negotiatedValue)}
               ${sv.negotiationReason ? `<br><span style="font-weight:400;font-size:10px;color:#c97a00;font-style:italic">${esc(sv.negotiationReason)}</span>` : ""}
             </td>`
          : `<td style="padding:7px 10px;text-align:right;border-bottom:1px solid #e5e5e5;white-space:nowrap;font-size:12.5px;font-weight:700">${formatCurrency(sv.negotiatedValue)}</td>`
        }
      </tr>`;
  }).join("");

  const todayStr = formatDateLong(new Date());

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Orçamento — ${esc(rec.client.name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#b8b8b8;font-family:Georgia,serif;}

/* ── Toolbar ─────────────────────────────────────── */
#tb{
  position:sticky;top:0;z-index:300;
  background:#0A2238;color:#fff;
  padding:10px 24px;
  display:flex;align-items:center;justify-content:space-between;
}
#tb button{
  background:#F2480A;color:#fff;border:none;
  padding:8px 22px;border-radius:6px;
  font-size:14px;font-family:Arial,sans-serif;font-weight:bold;cursor:pointer;
}
#tb button:hover{opacity:.88;}

/* ── A4 page ─────────────────────────────────────── */
.page{
  width:210mm;
  height:297mm;
  position:relative;
  margin:8mm auto;
  background-size:100% 100%;
  background-repeat:no-repeat;
  overflow:hidden;
  box-shadow:0 3px 14px rgba(0,0,0,.28);
  break-after:page;
  page-break-after:always;
}
.page:last-child{break-after:auto;page-break-after:auto;}

/* Content area (between letterhead header 40mm and footer 29mm) */
.pc{
  position:absolute;
  top:40mm;left:16mm;right:16mm;bottom:29mm;
  overflow:hidden;
}

/* ── Measurement pool ────────────────────────────── */
#pool{
  position:fixed;top:-99999px;left:0;
  width:178mm;
  visibility:hidden;
  font-family:Georgia,serif;
  font-size:12.5px;line-height:1.75;color:#333;
}

@media print{
  @page{size:A4;margin:0;}
  #tb{display:none;}
  body{background:white;}
  .page{margin:0;box-shadow:none;}
}
</style>
</head>
<body>

<div id="tb">
  <span style="font-family:Arial,sans-serif;font-size:14px">Orçamento — <strong>${esc(rec.client.name)}</strong></span>
  <button onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
</div>

<!-- ── Content pool (off-screen for measurement) ── -->
<div id="pool">

  <!-- Date + client header -->
  <div class="blk">
    <p style="text-align:right;font-size:12.5px;color:#444;padding-bottom:18px">
      Nanuque-MG, <strong>${todayStr}</strong>
    </p>
    <p style="font-size:13px;line-height:1.85;color:#222;padding-bottom:18px">
      Cliente: <strong>${esc(rec.client.name.toUpperCase())}</strong>
      ${rec.client.farmName ? `<br>Fazenda: <strong>${esc(rec.client.farmName.toUpperCase())}</strong>` : ""}
      ${rec.client.municipality ? `<br>Município: ${esc(rec.client.municipality)}` : rec.client.address ? `<br>Endereço: ${esc(rec.client.address)}` : ""}
    </p>
  </div>

  <!-- Title + intro -->
  <div class="blk">
    <p style="font-size:13.5px;font-weight:bold;text-transform:uppercase;letter-spacing:.6px;color:#0A2238;border-bottom:2px solid #0A2238;padding-bottom:5px;">
      Proposta de Orçamento
    </p>
    <p style="font-size:12.5px;line-height:1.7;color:#333;padding-top:10px;padding-bottom:14px">
      Prezado(a) Senhor(a), apresentamos nossa proposta referente aos serviços técnicos abaixo discriminados:
    </p>
  </div>

  <!-- Service table -->
  <div class="blk">
    <table style="width:100%;border-collapse:collapse;padding-bottom:16px">
      <thead>
        <tr style="background:#0A2238;color:#fff">
          <th style="padding:8px 10px;text-align:left;font-size:12px;font-family:Arial,sans-serif;font-weight:600">Serviço</th>
          ${hasAnyDiscount
            ? `<th style="padding:8px 10px;text-align:right;font-size:12px;font-family:Arial,sans-serif;font-weight:600;white-space:nowrap">Valor Tabela</th>
               <th style="padding:8px 10px;text-align:right;font-size:12px;font-family:Arial,sans-serif;font-weight:600;white-space:nowrap">Valor Final</th>`
            : `<th style="padding:8px 10px;text-align:right;font-size:12px;font-family:Arial,sans-serif;font-weight:600;white-space:nowrap">Valor (R$)</th>`
          }
        </tr>
      </thead>
      <tbody>${serviceRows}</tbody>
      <tfoot>
        <tr style="background:#0A2238;color:#fff;font-weight:bold">
          <td style="padding:9px 10px;font-family:Arial,sans-serif;font-size:12px">TOTAL</td>
          ${hasAnyDiscount
            ? `<td style="padding:9px 10px;text-align:right;font-size:12px;color:#c8d8e8">${formatCurrency(totalCalculated)}</td>
               <td style="padding:9px 10px;text-align:right;font-size:15px">${formatCurrency(totalValue)}</td>`
            : `<td style="padding:9px 10px;text-align:right;font-size:15px">${formatCurrency(totalValue)}</td>`
          }
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Payment + validity -->
  <div class="blk">
    <div style="font-size:12.5px;line-height:1.85;color:#333;padding-bottom:16px">
      <p style="padding-bottom:4px"><strong>Forma de pagamento:</strong> ${esc(pagamento)}</p>
      ${rec.expectedCompletionDate
        ? `<p style="padding-bottom:4px"><strong>Previsão de conclusão:</strong> ${formatDateLong(rec.expectedCompletionDate)}</p>`
        : ""}
      <p style="color:#666;font-size:12px">Esta proposta tem validade de 30 dias a partir da data de emissão.</p>
    </div>
  </div>

  ${observacoes ? `
  <!-- Observations -->
  <div class="blk">
    <div style="padding:10px 14px;border-left:3px solid #0A2238;background:#f5f7fa;margin-bottom:18px">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#0A2238;padding-bottom:4px">Observações</p>
      <p style="font-size:12px;line-height:1.75;color:#444;white-space:pre-wrap">${esc(observacoes)}</p>
    </div>
  </div>` : ""}

  <!-- Signature -->
  <div class="blk">
    <p style="font-size:12.5px;line-height:1.95;color:#333">
      Atenciosamente,<br><br>
      <strong>Alex Henrique Teixeira Dias</strong><br>
      Engenheiro Ambiental Sanitarista e Civil<br>
      CREA-MG: 227908/D – Visto-BA 71990
    </p>
  </div>

</div><!-- #pool -->

<!-- ── Pages (populated by JS) ─────────────────── -->
<div id="pages"></div>

<script>
(function(){
  var LH='${lhSrc}';

  function run(){
    var pool=document.getElementById('pool');
    var pages=document.getElementById('pages');
    if(!pool||!pages)return;

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
      if(used>8&&used+h>maxH){
        area=newPage();
        used=0;
      }
      area.appendChild(blk);
      used+=h;
    }

    pool.parentNode.removeChild(pool);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',run);
  } else {
    run();
  }
})();
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

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

function intToWords(n: number): string {
  if (n === 0) return "zero";
  const units = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const tens = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const hundreds = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  const parts: string[] = [];
  if (n >= 1000000) { const m = Math.floor(n / 1000000); parts.push(m === 1 ? "um milhão" : `${intToWords(m)} milhões`); n %= 1000000; }
  if (n >= 1000) { const k = Math.floor(n / 1000); parts.push(k === 1 ? "mil" : `${intToWords(k)} mil`); n %= 1000; }
  if (n >= 100) { if (n === 100) { parts.push("cem"); n = 0; } else { parts.push(hundreds[Math.floor(n / 100)]); n %= 100; } }
  if (n >= 20) { const d = Math.floor(n / 10), u = n % 10; parts.push(u > 0 ? `${tens[d]} e ${units[u]}` : tens[d]); }
  else if (n > 0) parts.push(units[n]);
  return parts.join(" e ");
}

function valorPorExtenso(v: number): string {
  const inteiro = Math.floor(v);
  const centavos = Math.round((v - inteiro) * 100);
  const parteInteira = intToWords(inteiro);
  const moeda = inteiro === 1 ? "real" : "reais";
  if (centavos === 0) return `${parteInteira} ${moeda}`;
  return `${parteInteira} ${moeda} e ${intToWords(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
}

function paymentText(method: string | null, installments: number | null): string {
  if (!method) return "Conforme acordado entre as partes";
  if (method === "AVISTA") return "À vista";
  if (method === "PARCELADO" && installments && installments > 1) {
    const nums = ["","uma","duas","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze"];
    const word = installments <= 12 ? nums[installments] : String(installments);
    return `Parcelado em ${installments} (${word}) parcelas iguais`;
  }
  return "Parcelado";
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new NextResponse("Não autorizado", { status: 401 });

  const { id } = await params;

  const rec = await prisma.process.findUnique({
    where: { id },
    select: {
      id: true,
      sellerId: true,
      paymentLabel: true,
      paymentMethod: true,
      installments: true,
      expectedCompletionDate: true,
      client: { include: { properties: { take: 1, orderBy: { index: "asc" } } } },
      seller: { select: { name: true } },
      services: { select: { serviceName: true, serviceGroup: true, negotiatedValue: true, financedValue: true }, orderBy: { id: "asc" } },
    },
  });

  if (!rec) return new NextResponse("Não encontrado", { status: 404 });

  if (
    session.user.roles.includes("VENDEDOR") &&
    !session.user.roles.includes("ADMIN") &&
    rec.sellerId !== session.user.id
  ) return new NextResponse("Sem permissão", { status: 403 });

  const client = rec.client;
  const prop = client.properties?.[0];
  const farmName = prop?.farmName || client.farmName;
  const municipio = prop?.municipality || client.municipality || client.address || "";
  const totalValue = rec.services.reduce((s, sv) => s + (sv.negotiatedValue ?? 0), 0);
  const extenso = valorPorExtenso(totalValue);
  const pagamento = rec.paymentLabel ?? paymentText(rec.paymentMethod, rec.installments);

  let lhSrc = "/papel-timbrado.png";
  try {
    lhSrc = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public", "papel-timbrado.png")).toString("base64")}`;
  } catch { /* fallback */ }

  const serviceRows = rec.services.map(sv => `
    <tr>
      <td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11.5px">${esc(sv.serviceName)}${sv.serviceGroup ? `<br><span style="color:#888;font-size:10px">${esc(sv.serviceGroup)}</span>` : ""}</td>
      <td style="padding:5px 10px;border-bottom:1px solid #e0e0e0;text-align:right;font-size:11.5px;font-weight:600;white-space:nowrap">${formatCurrency(sv.negotiatedValue)}</td>
    </tr>`).join("");

  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  const isLegal = client.document?.includes("/") ?? false;
  const clientDoc  = client.document ? `, ${isLegal ? "CNPJ" : "CPF"} n° ${client.document}` : "";
  const clientAddr = municipio ? `, residente e domiciliado(a) no Município de ${esc(municipio)}` : "";
  const clientFarm = farmName ? `, proprietário(a) do Imóvel Rural denominado "${esc(farmName)}"` : "";
  const svcWithPct = rec.services.find(s => s.financedValue && s.negotiatedValue);
  const feePercentage = svcWithPct
    ? ((svcWithPct.negotiatedValue! / svcWithPct.financedValue!) * 100).toFixed(2).replace(".", ",")
    : null;

  const prazoText  = rec.expectedCompletionDate
    ? `até <strong>${formatDateLong(rec.expectedCompletionDate)}</strong>`
    : "a ser definido conforme cronograma específico a ser acordado entre as partes";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato — ${esc(client.name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#b8b8b8;font-family:"Times New Roman",Times,serif;}

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
/* Image is 909×1286px — same ratio as A4 (210/297≈0.707) */
/* background-size 100% 100% fills page without distortion  */
/* Header region: 0–40mm from top                           */
/* Footer region: 29mm from bottom                          */
/* Safe content: 40mm → 268mm (228mm tall), 16mm h-margins  */
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

.pc{ /* page content */
  position:absolute;
  top:40mm;left:16mm;right:16mm;bottom:29mm;
  overflow:hidden;
}

/* ── Measurement pool ────────────────────────────── */
#pool{
  position:fixed;top:-99999px;left:0;
  width:178mm; /* 210 - 32mm margins */
  visibility:hidden;
  font-family:"Times New Roman",Times,serif;
  font-size:12.5px;line-height:1.9;color:#333;
}

/* ── Typography ──────────────────────────────────── */
.tit{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;color:#0A2238;padding-bottom:5px;}
.sub{text-align:center;font-size:11px;color:#666;letter-spacing:.5px;padding-bottom:22px;}
.pt{font-size:12.5px;line-height:1.85;color:#222;text-align:justify;padding-bottom:14px;}
.ac{font-size:12.5px;color:#222;text-align:center;font-weight:bold;padding-bottom:16px;}
.ct{font-size:12px;font-weight:bold;text-transform:uppercase;padding:14px 0 5px;color:#0A2238;border-bottom:1px solid #ccc;}
.cb{font-size:12px;line-height:1.9;color:#333;text-align:justify;}
.cb p{padding-bottom:3px;}
.db{margin:7px 0 0 18px;font-size:11.5px;line-height:1.9;color:#333;}
.sig{display:flex;gap:60px;padding-top:38px;}
.sl{flex:1;text-align:center;}
.sl-line{border-top:1px solid #444;padding-top:7px;font-size:11.5px;line-height:1.7;color:#333;}

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
  <span style="font-family:Arial,sans-serif;font-size:14px">Contrato — <strong>${esc(client.name)}</strong></span>
  <button onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
</div>

<!-- ── Content pool (off-screen for measurement) ── -->
<div id="pool">

  <div class="blk">
    <p class="tit">Contrato de Prestação de Serviços</p>
    <p class="sub">Instrumento Particular</p>
  </div>

  <div class="blk">
    <p class="pt"><strong>CONTRATANTE:</strong> ${esc(client.name)}${clientDoc}${clientFarm}${clientAddr};</p>
  </div>

  <div class="blk">
    <p class="pt"><strong>CONTRATADA:</strong> Alex Henrique Teixeira Dias, portador do RG n° MG-18.278.247 e CPF n° 122.969.096-47, inscrito no CNPJ n° 54.680.744/0001-23, com sede na cidade de Nanuque, Estado de Minas Gerais, doravante denominada simplesmente <strong>CONTRATADA</strong>;</p>
  </div>

  <div class="blk">
    <p class="ac">Têm, entre si, justo e contratado o seguinte:</p>
  </div>

  <div class="blk">
    <p class="ct">Cláusula Primeira – Do Objeto</p>
    <div class="cb">
      <p>A CONTRATADA obriga-se a prestar ao CONTRATANTE os seguintes serviços técnicos especializados:</p>
      <table style="width:100%;border-collapse:collapse;margin:7px 0 4px">
        <thead><tr style="background:#0A2238;color:#fff">
          <th style="padding:6px 10px;text-align:left;font-size:11px;font-family:Arial,sans-serif">Serviço</th>
          <th style="padding:6px 10px;text-align:right;font-size:11px;font-family:Arial,sans-serif;white-space:nowrap">Valor (R$)</th>
        </tr></thead>
        <tbody>${serviceRows}</tbody>
        <tfoot><tr style="background:#0A2238;color:#fff;font-weight:bold">
          <td style="padding:6px 10px;font-family:Arial,sans-serif;font-size:11.5px">TOTAL</td>
          <td style="padding:6px 10px;text-align:right;font-size:13px">${formatCurrency(totalValue)}</td>
        </tr></tfoot>
      </table>
    </div>
  </div>

  <div class="blk">
    <p class="ct">Cláusula Segunda – Do Prazo</p>
    <div class="cb">
      <p>A CONTRATADA terá o prazo para execução dos serviços contratados de até 20 (vinte) dias úteis para protocolar o projeto ou serviço contratado ao órgão competente, contado a partir do recebimento de toda a documentação necessária devidamente completa e válida, bem como do pagamento da primeira parcela, quando houver.</p>
      <p style="padding-top:5px">Parágrafo único. O prazo poderá ser prorrogado mediante acordo entre as partes, sem ônus para a CONTRATADA, nos casos de pendências de documentação, demora nos processos institucionais externos ou demais fatores alheios à vontade da CONTRATADA.</p>
    </div>
  </div>

  <div class="blk">
    <p class="ct">Cláusula Terceira – Das Obrigações das Partes</p>
    <div class="cb">
      <p><strong>3.1 – Compete ao CONTRATANTE:</strong></p>
      <p style="padding-left:14px">a) Fornecer todos os documentos e informações necessários à execução dos serviços, dentro dos prazos indicados pela CONTRATADA;</p>
      <p style="padding-left:14px">b) Efetuar os pagamentos nas condições e prazos estabelecidos neste contrato;</p>
      <p style="padding-left:14px">c) Disponibilizar o acesso ao imóvel, quando necessário à prestação dos serviços;</p>
      <p style="padding-left:14px">d) Comunicar à CONTRATADA, tempestivamente, qualquer alteração nos dados ou documentos fornecidos.</p>
      <p style="padding-top:5px"><strong>3.2 – Compete à CONTRATADA:</strong></p>
      <p style="padding-left:14px">a) Executar os serviços contratados com competência técnica e dentro dos prazos acordados;</p>
      <p style="padding-left:14px">b) Manter sigilo sobre as informações e documentos do CONTRATANTE;</p>
      <p style="padding-left:14px">c) Comunicar ao CONTRATANTE, com antecedência, eventuais dificuldades ou impedimentos na execução dos serviços;</p>
      <p style="padding-left:14px">d) Apresentar ao CONTRATANTE os documentos e projetos elaborados ao término de cada etapa.</p>
    </div>
  </div>

  <div class="blk">
    <p class="ct">Cláusula Quarta – Do Valor e Forma de Pagamento</p>
    <div class="cb">
      <p>O CONTRATANTE pagará à CONTRATADA o valor total de <strong>${formatCurrency(totalValue)} (${esc(extenso)})</strong>, a ser pago da seguinte forma: <strong>${esc(pagamento)}</strong>.</p>
      <p style="padding-top:7px">Os pagamentos deverão ser realizados mediante depósito ou transferência bancária nos dados a seguir:</p>
      <div class="db">
        <p>Banco: Caixa Econômica Federal</p>
        <p>Agência: 0939</p>
        <p>Conta: 579148353-4</p>
        <p>Titular: ALTIS LTDA</p>
        <p>CNPJ: 40.576.497/0001-05</p>
      </div>
      <p style="padding-top:7px">§ 1º. O não pagamento nas datas acordadas implicará em mora automática, com incidência de multa de 2% (dois por cento) sobre o valor em atraso, acrescida de juros de mora de 1% (um por cento) ao mês e correção monetária pelo IPCA, sem prejuízo do direito de rescisão contratual.</p>
    </div>
  </div>

  <div class="blk">
    <div class="cb">
      <p>§ 2º. No caso de financiamento, se o projeto for inviabilizado em razão de pendências de responsabilidade do CONTRATANTE que impeçam a liberação dos recursos pela instituição financeira, e desde que o projeto já tenha sido protocolado junto à referida instituição, o CONTRATANTE pagará à CONTRATADA o equivalente a 50% (cinquenta por cento) do valor total deste contrato, a título de remuneração pelos serviços técnicos já prestados, independentemente da conclusão do financiamento.</p>
      ${feePercentage ? `<p style="padding-top:5px">§ 3º. Nos contratos referentes à elaboração de projetos para financiamento rural, cuja remuneração da CONTRATADA seja estabelecida em percentual sobre o valor financiado, fica estabelecido o percentual de ${feePercentage}%, conforme acordado entre as partes. Caso o valor do financiamento aprovado pela instituição financeira seja superior ou inferior ao valor inicialmente previsto, a remuneração da CONTRATADA será recalculada com base no valor efetivamente financiado, mantendo-se o percentual pactuado.</p>` : ""}
    </div>
  </div>

  <div class="blk">
    <p class="ct">Cláusula Quinta – Da Rescisão</p>
    <div class="cb">
      <p>Qualquer das partes poderá rescindir o presente contrato mediante notificação prévia por escrito com antecedência mínima de 15 (quinze) dias.</p>
      <p style="padding-top:5px">Parágrafo único. No caso de rescisão por iniciativa do CONTRATANTE, serão devidos os honorários proporcionais aos serviços já executados até a data da rescisão, sem prejuízo de eventuais perdas e danos comprovados.</p>
    </div>
  </div>

  <div class="blk">
    <p class="ct">Cláusula Sexta – Do Foro</p>
    <div class="cb">
      <p>Fica eleito o Foro da Comarca de Nanuque, Estado de Minas Gerais, para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, com renúncia expressa de qualquer outro, por mais privilegiado que seja.</p>
    </div>
  </div>

  <div class="blk">
    <p style="font-size:12.5px;color:#333;text-align:center;padding-top:26px;padding-bottom:6px;">Nanuque-MG, ${dateStr}.</p>
  </div>

  <div class="blk">
    <div class="sig">
      <div class="sl">
        <div class="sl-line">
          <strong>${esc(client.name)}</strong><br>
          CONTRATANTE<br>
          ${client.document ? `${isLegal ? "CNPJ" : "CPF"}: ${client.document}` : "CPF: ___.___.___-__"}
        </div>
      </div>
      <div class="sl">
        <div class="sl-line">
          <strong>Alex Henrique Teixeira Dias</strong><br>
          CONTRATADA<br>
          CPF: 122.969.096-47
        </div>
      </div>
    </div>
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

    /* measure 1 mm in CSS pixels */
    var probe=document.createElement('div');
    probe.style.cssText='position:fixed;top:-9999px;left:0;width:1mm;height:0;pointer-events:none;';
    document.body.appendChild(probe);
    var px1mm=probe.getBoundingClientRect().width;
    document.body.removeChild(probe);

    /* available content height per page: 228mm with 3% safety margin */
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

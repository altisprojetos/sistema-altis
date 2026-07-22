import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

function fmt(v: number) { return BRL.format(v); }
function fmtDate(d: Date | string | null | undefined) { return d ? DATE.format(new Date(d)) : "—"; }
function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session) return new NextResponse("Não autorizado", { status: 401 });

  const roles = session.user.roles;
  if (!roles.some((r: string) => ["ADMIN", "COORDENADOR"].includes(r))) {
    return new NextResponse("Sem permissão", { status: 403 });
  }

  const { userId } = await params;
  const sp = request.nextUrl.searchParams;
  const statusFilter = sp.get("status");
  const month = parseInt(sp.get("month") ?? "0");
  const year = parseInt(sp.get("year") ?? "0");

  const monthStart = month && year ? new Date(year, month - 1, 1) : null;
  const monthEnd   = month && year ? new Date(year, month, 1)     : null;

  const [user, commissions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, roles: true } }),
    prisma.commission.findMany({
      where: {
        userId,
        ...(statusFilter === "PENDENTE" ? { status: "PENDENTE" } : statusFilter === "PAGA" ? { status: "PAGA" } : {}),
        ...(monthStart && monthEnd ? { createdAt: { gte: monthStart, lt: monthEnd } } : {}),
      },
      include: {
        process: {
          select: {
            id: true,
            completedAt: true,
            client: { select: { name: true } },
            services: { select: { serviceName: true, subtype: true, negotiatedValue: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) return new NextResponse("Usuário não encontrado", { status: 404 });

  const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const periodoLabel = month && year
    ? `${MONTHS_PT[month - 1]} / ${year}`
    : "Todos os períodos";

  const totalGeral = commissions.reduce((s, c) => s + c.amount, 0);
  const totalPendente = commissions.filter(c => c.status === "PENDENTE").reduce((s, c) => s + c.amount, 0);
  const totalPago = commissions.filter(c => c.status === "PAGA").reduce((s, c) => s + c.amount, 0);

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoBase64 = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : "";

  const rows = commissions.map(c => {
    const servicos = c.process.services
      .map(s => s.subtype ? `${s.serviceName} – ${s.subtype}` : s.serviceName)
      .join(", ");
    const valorProcesso = c.process.services.reduce((s, sv) => s + (sv.negotiatedValue ?? 0), 0);
    const pct = valorProcesso > 0 ? ((c.amount / valorProcesso) * 100).toFixed(1) + "%" : "—";

    return `
      <tr>
        <td>${esc(c.process.client.name)}</td>
        <td>${esc(servicos || "—")}</td>
        <td class="num">${valorProcesso > 0 ? fmt(valorProcesso) : "—"}</td>
        <td class="ctr">${pct}</td>
        <td class="num ${c.originalAmount ? "adjusted" : ""}">
          ${fmt(c.amount)}
          ${c.originalAmount ? `<br><span class="original">original: ${fmt(c.originalAmount)}</span>` : ""}
        </td>
        <td class="ctr">${fmtDate(c.process.completedAt)}</td>
        <td class="ctr">
          <span class="badge ${c.status === "PAGA" ? "pago" : "pendente"}">
            ${c.status === "PAGA" ? "Pago" : "Pendente"}
          </span>
        </td>
        <td class="ctr">${c.status === "PAGA" ? fmtDate(c.paidAt) : "—"}</td>
        ${c.adjustmentNote ? `<td class="note" colspan="0">${esc(c.adjustmentNote)}</td>` : "<td></td>"}
      </tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Extrato de Comissões — ${esc(user.name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 24px 32px; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #0A2238; padding-bottom: 14px; }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .logo { height: 44px; }
  .company { font-size: 13px; font-weight: bold; color: #0A2238; }
  .company small { font-size: 9px; font-weight: normal; color: #666; display: block; }
  .title-block { text-align: right; }
  .title-block h1 { font-size: 16px; font-weight: bold; color: #0A2238; }
  .title-block p { font-size: 10px; color: #666; }
  .info { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; display: flex; gap: 32px; }
  .info-item p { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; font-weight: 600; }
  .info-item span { font-size: 13px; font-weight: bold; color: #0A2238; }
  .totals { display: flex; gap: 16px; margin-bottom: 18px; }
  .total-card { flex: 1; background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px 14px; }
  .total-card p { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; font-weight: 600; }
  .total-card span { font-size: 15px; font-weight: bold; }
  .total-card.geral span { color: #0A2238; }
  .total-card.pendente span { color: #d97706; }
  .total-card.pago span { color: #16a34a; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #0A2238; color: #fff; text-align: left; padding: 7px 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
  th.num, th.ctr { text-align: right; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; font-weight: 600; }
  td.ctr { text-align: right; white-space: nowrap; }
  td.note { font-size: 9px; color: #888; font-style: italic; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 20px; font-size: 9px; font-weight: 700; }
  .badge.pago { background: #dcfce7; color: #15803d; }
  .badge.pendente { background: #fef9c3; color: #92400e; }
  .adjusted { color: #0A2238; }
  .original { font-size: 9px; color: #9ca3af; font-weight: normal; text-decoration: line-through; }
  .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 16px 24px; } }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="ALTIS">` : ""}
    <div class="company">
      ALTIS CONSULTORIA LTDA
      <small>CNPJ 40.576.497/0001-05</small>
    </div>
  </div>
  <div class="title-block">
    <h1>Extrato de Comissões</h1>
    <p>Emitido em ${fmtDate(new Date())}</p>
  </div>
</div>

<div class="info">
  <div class="info-item">
    <p>Comissionado</p>
    <span>${esc(user.name)}</span>
  </div>
  <div class="info-item">
    <p>Função</p>
    <span>${user.roles.join(", ")}</span>
  </div>
  <div class="info-item">
    <p>Período</p>
    <span>${esc(periodoLabel)}</span>
  </div>
  <div class="info-item">
    <p>Status</p>
    <span>${statusFilter === "PENDENTE" ? "Pendentes" : statusFilter === "PAGA" ? "Pagas" : "Todos"}</span>
  </div>
  <div class="info-item">
    <p>Total de registros</p>
    <span>${commissions.length}</span>
  </div>
</div>

<div class="totals">
  <div class="total-card geral">
    <p>Total Geral</p>
    <span>${fmt(totalGeral)}</span>
  </div>
  <div class="total-card pago">
    <p>Total Pago</p>
    <span>${fmt(totalPago)}</span>
  </div>
  <div class="total-card pendente">
    <p>Total Pendente</p>
    <span>${fmt(totalPendente)}</span>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Cliente</th>
      <th>Serviço(s)</th>
      <th class="num">Valor Processo</th>
      <th class="ctr">% Comissão</th>
      <th class="num">Comissão</th>
      <th class="ctr">Finalizado</th>
      <th class="ctr">Status</th>
      <th class="ctr">Pago em</th>
      <th>Obs.</th>
    </tr>
  </thead>
  <tbody>
    ${rows || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#aaa;">Nenhuma comissão encontrada.</td></tr>'}
  </tbody>
</table>

<div class="footer">
  ALTIS Consultoria · Sistema de Gestão Interno · Documento gerado automaticamente
</div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

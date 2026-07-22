"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireFinanceiro() {
  const session = await auth();
  if (!session) redirect("/login");
  const roles = session.user.roles;
  if (!roles.includes("ADMIN") && !roles.includes("FINANCEIRO")) redirect("/dashboard");
  return session;
}

// ─── Dashboard summary ─────────────────────────────────────────────────────

export async function getFinanceiroDashboard(month?: number, year?: number) {
  await requireFinanceiro();

  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

  // Previsão: processos enviados para operação ainda não finalizados, com previsão no mês
  const previsao = await prisma.process.findMany({
    where: {
      salesStage: "ENVIADO_OPERACAO",
      opsStage: { not: "FINALIZADO" },
      expectedCompletionDate: { gte: startOfMonth, lte: endOfMonth },
    },
    select: {
      id: true,
      negotiatedValue: true,
      totalValue: true,
      expectedCompletionDate: true,
      client: { select: { name: true } },
      services: { select: { serviceName: true, negotiatedValue: true, calculatedValue: true } },
    },
  });

  // Faturamento real: processos finalizados no mês
  const faturadoReal = await prisma.process.findMany({
    where: {
      opsStage: "FINALIZADO",
      completedAt: { gte: startOfMonth, lte: endOfMonth },
    },
    select: {
      id: true,
      negotiatedValue: true,
      totalValue: true,
      completedAt: true,
      client: { select: { name: true } },
      services: { select: { serviceName: true, negotiatedValue: true, calculatedValue: true } },
    },
  });

  // Custos do mês: diretos (sem processo) ou aprovados pela empresa
  const costs = await prisma.cost.findMany({
    where: {
      month: m, year: y,
      OR: [
        { processId: null },
        { processId: { not: null }, approvalStatus: "APROVADO", owner: "EMPRESA" },
      ],
    },
    orderBy: { type: "asc" },
  });

  // Comissões pendentes (valor total)
  const commissionsPending = await prisma.commission.aggregate({
    _sum: { amount: true },
    where: { status: "PENDENTE" },
  });

  // Saldo em conta: todas as entradas
  const entries = await prisma.accountEntry.findMany({
    orderBy: { date: "desc" },
  });

  const totalPrevisao = previsao.reduce((s, p) => s + (p.negotiatedValue ?? p.totalValue ?? 0), 0);
  const totalReal = faturadoReal.reduce((s, p) => s + (p.negotiatedValue ?? p.totalValue ?? 0), 0);
  const totalCustos = costs.reduce((s, c) => s + c.amount, 0);
  const saldo = entries.reduce((s, e) => s + (e.type === "ENTRADA" ? e.amount : -e.amount), 0);

  return {
    month: m,
    year: y,
    previsao,
    faturadoReal,
    costs,
    totalPrevisao,
    totalReal,
    totalCustos,
    comissoesPendentes: commissionsPending._sum.amount ?? 0,
    saldo,
  };
}

// ─── Monthly chart data (last 12 months) ───────────────────────────────────

export async function getMonthlyChartData() {
  await requireFinanceiro();

  const now = new Date();
  const months: { label: string; previsao: number; real: number; custos: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const [previsaoAgg, realAgg, custosAgg] = await Promise.all([
      prisma.process.aggregate({
        _sum: { negotiatedValue: true },
        where: {
          salesStage: "ENVIADO_OPERACAO",
          opsStage: { not: "FINALIZADO" },
          expectedCompletionDate: { gte: start, lte: end },
        },
      }),
      prisma.process.aggregate({
        _sum: { negotiatedValue: true },
        where: {
          opsStage: "FINALIZADO",
          completedAt: { gte: start, lte: end },
        },
      }),
      prisma.cost.aggregate({
        _sum: { amount: true },
        where: {
          month: m, year: y,
          OR: [
            { processId: null },
            { processId: { not: null }, approvalStatus: "APROVADO", owner: "EMPRESA" },
          ],
        },
      }),
    ]);

    months.push({
      label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      previsao: previsaoAgg._sum.negotiatedValue ?? 0,
      real: realAgg._sum.negotiatedValue ?? 0,
      custos: custosAgg._sum.amount ?? 0,
    });
  }

  return months;
}

// ─── Costs ─────────────────────────────────────────────────────────────────

export async function getCosts(month?: number, year?: number) {
  await requireFinanceiro();
  const now = new Date();
  return prisma.cost.findMany({
    where: {
      month: month ?? now.getMonth() + 1,
      year: year ?? now.getFullYear(),
      OR: [
        { processId: null },
        { processId: { not: null }, approvalStatus: "APROVADO", owner: "EMPRESA" },
      ],
    },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
}

export async function createCost(data: {
  description: string;
  amount: number;
  type: "FIXO" | "VARIAVEL";
  category?: string;
  month: number;
  year: number;
}) {
  await requireFinanceiro();
  await prisma.cost.create({ data });
  revalidatePath("/dashboard/financeiro/custos");
  revalidatePath("/dashboard/financeiro");
}

export async function deleteCost(id: string) {
  await requireFinanceiro();
  await prisma.cost.delete({ where: { id } });
  revalidatePath("/dashboard/financeiro/custos");
  revalidatePath("/dashboard/financeiro");
}

// ─── Account entries (Saldo) ───────────────────────────────────────────────

export async function getAccountEntries() {
  await requireFinanceiro();
  return prisma.accountEntry.findMany({ orderBy: { date: "desc" } });
}

export async function createAccountEntry(data: {
  description: string;
  amount: number;
  type: "ENTRADA" | "SAIDA";
  category?: string;
  date: Date;
}) {
  await requireFinanceiro();
  await prisma.accountEntry.create({ data });
  revalidatePath("/dashboard/financeiro/saldo");
  revalidatePath("/dashboard/financeiro");
}

export async function deleteAccountEntry(id: string) {
  await requireFinanceiro();
  await prisma.accountEntry.delete({ where: { id } });
  revalidatePath("/dashboard/financeiro/saldo");
  revalidatePath("/dashboard/financeiro");
}

// ─── Service breakdown ─────────────────────────────────────────────────────

export async function getServiceBreakdown() {
  await requireFinanceiro();

  const services = await prisma.processService.groupBy({
    by: ["serviceGroup"],
    _count: { id: true },
    _sum: { negotiatedValue: true },
    orderBy: { _sum: { negotiatedValue: "desc" } },
  });

  return services.map((s) => ({
    group: s.serviceGroup,
    count: s._count.id,
    total: s._sum.negotiatedValue ?? 0,
  }));
}

// ─── Desempenho por Vendedor / Operador ─────────────────────────────────── v2

export async function getDesempenhoVendedores(month?: number, year?: number) {
  await requireFinanceiro();

  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();
  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

  const vendedores = await prisma.user.findMany({
    where: { roles: { hasSome: ["VENDEDOR", "ADMIN"] } },
    select: {
      id: true,
      name: true,
      commissionRate: true,
      processesSold: {
        select: {
          id: true,
          salesStage: true,
          opsStage: true,
          negotiatedValue: true,
          totalValue: true,
          sentToOpsAt: true,
          completedAt: true,
          expectedCompletionDate: true,
          commissions: {
            select: { userId: true, amount: true, status: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return vendedores.map((v) => {
    const processos = v.processesSold;
    const ativos = processos.filter(p => p.salesStage !== "PROSPECCAO");
    // Fechados no mês = enviados para operação no mês selecionado (data do fechamento pelo vendedor)
    const finalizadosMes = processos.filter(
      p => p.sentToOpsAt &&
        p.sentToOpsAt >= startOfMonth && p.sentToOpsAt <= endOfMonth
    );
    const previsaoMes = processos.filter(
      p => p.salesStage === "ENVIADO_OPERACAO" && p.opsStage !== "FINALIZADO" &&
        p.expectedCompletionDate && p.expectedCompletionDate >= startOfMonth && p.expectedCompletionDate <= endOfMonth
    );

    const valorRealizado = finalizadosMes.reduce((s, p) => s + (p.negotiatedValue ?? p.totalValue ?? 0), 0);
    const valorPrevisto = previsaoMes.reduce((s, p) => s + (p.negotiatedValue ?? p.totalValue ?? 0), 0);
    const valorTotal = processos
      .filter(p => p.opsStage === "FINALIZADO")
      .reduce((s, p) => s + (p.negotiatedValue ?? p.totalValue ?? 0), 0);

    // Filtrar apenas as comissões do próprio vendedor
    const minhasComissoes = processos.flatMap(p => p.commissions).filter(c => c.userId === v.id);
    const comissoesPendentes = minhasComissoes.filter(c => c.status === "PENDENTE").reduce((s, c) => s + c.amount, 0);
    const comissoesPagas = minhasComissoes.filter(c => c.status === "PAGA").reduce((s, c) => s + c.amount, 0);

    return {
      id: v.id,
      name: v.name,
      commissionRate: v.commissionRate,
      totalProcessos: ativos.length,
      finalizadosMes: finalizadosMes.length,
      previsaoMes: previsaoMes.length,
      valorRealizado,
      valorPrevisto,
      valorTotal,
      comissoesPendentes,
      comissoesPagas,
    };
  });
}

export async function getDesempenhoOperadores(month?: number, year?: number) {
  await requireFinanceiro();

  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();
  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

  const operadores = await prisma.user.findMany({
    where: { roles: { hasSome: ["OPERADOR", "ADMIN"] } },
    select: {
      id: true,
      name: true,
      commissionRate: true,
      processesAnalyzed: {
        select: {
          id: true,
          opsStage: true,
          negotiatedValue: true,
          totalValue: true,
          completedAt: true,
          commissions: {
            select: { userId: true, amount: true, status: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return operadores.map((op) => {
    const processos = op.processesAnalyzed;
    const finalizadosMes = processos.filter(
      p => p.opsStage === "FINALIZADO" &&
        p.completedAt && p.completedAt >= startOfMonth && p.completedAt <= endOfMonth
    );
    const emAndamento = processos.filter(p =>
      ["A_INICIAR", "ELABORAR", "ANALISE"].includes(p.opsStage ?? "")
    );

    const valorFinalizadoMes = finalizadosMes.reduce((s, p) => s + (p.negotiatedValue ?? p.totalValue ?? 0), 0);
    const valorTotal = processos
      .filter(p => p.opsStage === "FINALIZADO")
      .reduce((s, p) => s + (p.negotiatedValue ?? p.totalValue ?? 0), 0);

    // Filtrar apenas as comissões do próprio operador
    const minhasComissoes = processos.flatMap(p => p.commissions).filter(c => c.userId === op.id);
    const comissoesPendentes = minhasComissoes.filter(c => c.status === "PENDENTE").reduce((s, c) => s + c.amount, 0);
    const comissoesPagas = minhasComissoes.filter(c => c.status === "PAGA").reduce((s, c) => s + c.amount, 0);

    return {
      id: op.id,
      name: op.name,
      commissionRate: op.commissionRate,
      totalProcessos: processos.length,
      emAndamento: emAndamento.length,
      finalizadosMes: finalizadosMes.length,
      valorFinalizadoMes,
      valorTotal,
      comissoesPendentes,
      comissoesPagas,
    };
  });
}

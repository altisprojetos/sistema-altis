"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalesStage, OpsStage, ContractMethod, ContractStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getOperacaoProcesses(filters?: { opsStage?: OpsStage; search?: string }) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const roles = session.user.roles;
  const userId = session.user.id;

  const where: Record<string, unknown> = {
    salesStage: { in: ["ENVIADO_OPERACAO", "DEVOLVIDO_PENDENCIAS"] },
  };

  // Operador (sem ADMIN) vê: processos atribuídos a ele + processos A_INICIAR sem analista
  if (roles.includes("OPERADOR") && !roles.includes("ADMIN")) {
    where.OR = [
      { analystId: userId },
      { opsStage: "A_INICIAR", analystId: null },
    ];
  }

  if (filters?.opsStage) where.opsStage = filters.opsStage;
  if (filters?.search) {
    where.client = { name: { contains: filters.search, mode: "insensitive" } };
  }

  return prisma.process.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, type: true } },
      seller: { select: { id: true, name: true } },
      analyst: { select: { id: true, name: true } },
      services: { select: { serviceName: true, negotiatedValue: true } },
      devolutions: { orderBy: { createdAt: "desc" }, take: 1 },
      reminders: { where: { done: false }, orderBy: { dueDate: "asc" } },
    },
    orderBy: [{ opsStage: "asc" }, { sentToOpsAt: "asc" }],
  });
}

export async function addReminder(data: {
  processId: string;
  institution: string;
  description: string;
  dueDate: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "OPERADOR", "VENDEDOR"].includes(r))) throw new Error("Sem permissão");

  const due = new Date(data.dueDate).toLocaleDateString("pt-BR");
  const desc = data.description ? ` — ${data.description}` : "";

  await prisma.$transaction([
    prisma.reminder.create({
      data: {
        processId: data.processId,
        institution: data.institution,
        description: data.description,
        dueDate: new Date(data.dueDate),
      },
    }),
    prisma.timelineEntry.create({
      data: {
        processId: data.processId,
        userId: session.user.id,
        stage: "LEMBRETE_CRIADO",
        content: `Lembrete criado: ${data.institution}${desc} · vencimento ${due}`,
      },
    }),
  ]);

  revalidatePath(`/dashboard/operacao/${data.processId}`);
  revalidatePath(`/dashboard/vendas/${data.processId}`);
}

export async function resolveReminder(reminderId: string, processId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    select: { institution: true, description: true, createdAt: true },
  });

  const resolvedAt = new Date();
  const createdStr = reminder?.createdAt
    ? new Date(reminder.createdAt).toLocaleDateString("pt-BR")
    : "—";
  const resolvedStr = resolvedAt.toLocaleDateString("pt-BR");
  const desc = reminder?.description ? ` — ${reminder.description}` : "";

  await prisma.$transaction([
    prisma.reminder.update({
      where: { id: reminderId },
      data: { done: true, resolvedAt },
    }),
    prisma.timelineEntry.create({
      data: {
        processId,
        userId: session.user.id,
        stage: "LEMBRETE_RESOLVIDO",
        content: `Lembrete atendido: ${reminder?.institution ?? ""}${desc} · criado em ${createdStr} · atendido em ${resolvedStr}`,
      },
    }),
  ]);

  revalidatePath(`/dashboard/operacao/${processId}`);
  revalidatePath(`/dashboard/vendas/${processId}`);
}

export async function finalizeProcess(data: {
  processId: string;
  comment?: string;
  bankPaymentStartDate?: string;
  bankPaymentCount?: number;
  bankPaymentInterval?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "OPERADOR"].includes(r))) throw new Error("Sem permissão");

  const process = await prisma.process.findUnique({
    where: { id: data.processId },
    include: {
      seller: { select: { id: true, commissionRate: true } },
      analyst: { select: { id: true, commissionRate: true } },
      services: { select: { negotiatedValue: true } },
    },
  });
  if (!process) throw new Error("Processo não encontrado");

  const totalValue = process.services.reduce((s, sv) => s + (sv.negotiatedValue ?? 0), 0);

  // Gera lembretes de pagamento ao banco (45 dias antes de cada parcela)
  const bankReminders: { processId: string; dueDate: Date }[] = [];
  if (data.bankPaymentStartDate && data.bankPaymentCount && data.bankPaymentInterval) {
    const start = new Date(data.bankPaymentStartDate);
    for (let i = 0; i < data.bankPaymentCount; i++) {
      const due = new Date(start);
      if (data.bankPaymentInterval === "mensal") due.setMonth(due.getMonth() + i);
      else if (data.bankPaymentInterval === "semestral") due.setMonth(due.getMonth() + i * 6);
      else if (data.bankPaymentInterval === "anual") due.setFullYear(due.getFullYear() + i);

      const notify = new Date(due);
      notify.setDate(notify.getDate() - 45);
      bankReminders.push({ processId: data.processId, dueDate: notify });
    }
  }

  // Comissões
  const commissions: { userId: string; processId: string; amount: number }[] = [];
  if (process.seller?.commissionRate) {
    commissions.push({
      userId: process.seller.id,
      processId: data.processId,
      amount: totalValue * (process.seller.commissionRate / 100),
    });
  }
  if (process.analyst?.commissionRate) {
    commissions.push({
      userId: process.analyst.id,
      processId: data.processId,
      amount: totalValue * (process.analyst.commissionRate / 100),
    });
  }

  await prisma.$transaction([
    prisma.process.update({
      where: { id: data.processId },
      data: {
        opsStage: "FINALIZADO",
        completedAt: new Date(),
        bankPaymentStartDate: data.bankPaymentStartDate ? new Date(data.bankPaymentStartDate) : undefined,
        bankPaymentCount: data.bankPaymentCount,
        bankPaymentInterval: data.bankPaymentInterval,
        timeline: {
          create: {
            stage: "FINALIZADO",
            content: data.comment ?? "Processo finalizado",
            userId: session.user.id,
          },
        },
      },
    }),
    ...(bankReminders.length > 0
      ? [prisma.bankPaymentReminder.createMany({ data: bankReminders })]
      : []),
    ...(commissions.length > 0
      ? [prisma.commission.createMany({ data: commissions })]
      : []),
    prisma.prospection.create({
      data: {
        processId: data.processId,
        sellerId: process.sellerId,
      },
    }),
  ]);

  revalidatePath(`/dashboard/operacao/${data.processId}`);
  revalidatePath("/dashboard/operacao");
  revalidatePath("/dashboard/vendas");
}

export async function getProcesses(filters?: {
  salesStage?: SalesStage;
  clientId?: string;
  search?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const roles = session.user.roles;
  const userId = session.user.id;

  const where: Record<string, unknown> = {};

  if (!roles.includes("ADMIN")) {
    const orClauses: Record<string, unknown>[] = [];
    if (roles.includes("VENDEDOR")) orClauses.push({ sellerId: userId });
    if (roles.includes("OPERADOR")) orClauses.push({ analystId: userId });
    if (orClauses.length === 1) Object.assign(where, orClauses[0]);
    else if (orClauses.length > 1) where.OR = orClauses;
  }

  if (filters?.salesStage) where.salesStage = filters.salesStage;
  if (filters?.clientId) where.clientId = filters.clientId;

  if (filters?.search) {
    where.client = {
      name: { contains: filters.search, mode: "insensitive" },
    };
  }

  return prisma.process.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, document: true, type: true } },
      seller: { select: { id: true, name: true } },
      analyst: { select: { id: true, name: true } },
      services: true,
      devolutions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProcessById(id: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const process = await prisma.process.findUnique({
    where: { id },
    include: {
      client: {
        include: {
          notes: {
            where:
              session.user.roles.includes("FINANCEIRO") && !session.user.roles.includes("ADMIN")
                ? { id: "none" }
                : undefined,
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          },
          properties: { orderBy: { index: "asc" } },
        },
      },
      seller: { select: { id: true, name: true } },
      analyst: { select: { id: true, name: true } },
      services: true,
      documents: { orderBy: { uploadedAt: "desc" } },
      devolutions: { orderBy: { createdAt: "desc" } },
      timeline: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      reminders: { orderBy: { dueDate: "asc" } },
      costs: {
        where: { processId: { not: null } },
        include: { user: { select: { name: true } } },
        orderBy: { date: "desc" },
      },
      tasks: {
        include: {
          assignedTo: { select: { name: true } },
          comments: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      commissions: {
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!process) throw new Error("Processo não encontrado");

  const roles = session.user.roles;
  const uid = session.user.id;
  if (
    roles.includes("VENDEDOR") && process.sellerId !== uid ||
    roles.includes("OPERADOR") && process.analystId !== uid && process.opsStage === "A_INICIAR"
  ) {
    // vendedores veem apenas seus processos; operadores veem processos atribuídos ou não atribuídos
  }

  return process;
}

export async function createProcess(data: {
  clientId: string;
  services: Array<{
    serviceKey: string;
    serviceName: string;
    serviceGroup: string;
    calculatedValue: number | null;
    negotiatedValue: number;
    negotiationReason?: string;
    hectares?: number;
    squareMeters?: number;
    confrontantes?: number;
    financedValue?: number;
    clientPropertyId?: string | null;
  }>;
  expectedCompletionDate?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "VENDEDOR"].includes(r))) {
    throw new Error("Sem permissão");
  }

  const totalValue = data.services.reduce((s, sv) => s + sv.negotiatedValue, 0);

  const process = await prisma.process.create({
    data: {
      clientId: data.clientId,
      sellerId: session.user.id,
      salesStage: "PROSPECCAO",
      opsStage: "A_INICIAR",
      totalValue,
      expectedCompletionDate: data.expectedCompletionDate
        ? new Date(data.expectedCompletionDate)
        : null,
      services: {
        create: data.services.map((sv) => ({
          serviceKey: sv.serviceKey,
          serviceName: sv.serviceName,
          serviceGroup: sv.serviceGroup,
          calculatedValue: sv.calculatedValue,
          negotiatedValue: sv.negotiatedValue,
          negotiationReason: sv.negotiationReason,
          hectares: sv.hectares,
          squareMeters: sv.squareMeters,
          confrontantes: sv.confrontantes,
          financedValue: sv.financedValue,
          clientPropertyId: sv.clientPropertyId ?? null,
        })),
      },
      timeline: {
        create: {
          stage: "PROSPECCAO",
          content: "Processo criado",
          userId: session.user.id,
        },
      },
    },
  });

  revalidatePath("/dashboard/vendas");
  return process;
}

export async function updateSalesStage(
  processId: string,
  stage: SalesStage,
  comment?: string
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "VENDEDOR"].includes(r))) {
    throw new Error("Sem permissão");
  }

  const extra: Record<string, unknown> = { salesStage: stage };
  if (stage === "ENVIADO_OPERACAO") {
    extra.sentToOpsAt = new Date();
    extra.opsStage = "A_INICIAR";
  }

  await prisma.process.update({
    where: { id: processId },
    data: {
      ...extra,
      timeline: {
        create: {
          stage,
          content: comment ?? `Etapa alterada para ${stage}`,
          userId: session.user.id,
        },
      },
    },
  });

  revalidatePath(`/dashboard/vendas/${processId}`);
  revalidatePath("/dashboard/vendas");
}

export async function updateContractStatus(
  processId: string,
  method: ContractMethod,
  status: ContractStatus,
  fileUrl?: string
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  await prisma.process.update({
    where: { id: processId },
    data: {
      contractMethod: method,
      contractStatus: status,
      contractFileUrl: fileUrl,
    },
  });

  revalidatePath(`/dashboard/vendas/${processId}`);
}

export async function addDevolution(
  processId: string,
  pendencies: string
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "OPERADOR"].includes(r))) {
    throw new Error("Sem permissão");
  }

  await prisma.$transaction([
    prisma.devolution.create({
      data: { processId, pendencies },
    }),
    prisma.process.update({
      where: { id: processId },
      data: {
        salesStage: "DEVOLVIDO_PENDENCIAS",
        opsStage: "DEVOLVIDO",
        timeline: {
          create: {
            stage: "DEVOLVIDO_PENDENCIAS",
            content: `Devolvido com pendências: ${pendencies}`,
            userId: session.user.id,
          },
        },
      },
    }),
  ]);

  revalidatePath(`/dashboard/vendas/${processId}`);
  revalidatePath("/dashboard/operacao");
}

export async function updateOpsStage(
  processId: string,
  stage: OpsStage,
  comment?: string
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "OPERADOR"].includes(r))) {
    throw new Error("Sem permissão");
  }

  const extra: Record<string, unknown> = { opsStage: stage };
  if (stage === "FINALIZADO") {
    extra.completedAt = new Date();
    extra.salesStage = "ENVIADO_OPERACAO";
  }

  await prisma.process.update({
    where: { id: processId },
    data: {
      ...extra,
      timeline: {
        create: {
          stage: stage as string,
          content: comment ?? `Etapa de operação: ${stage}`,
          userId: session.user.id,
        },
      },
    },
  });

  revalidatePath(`/dashboard/operacao/${processId}`);
  revalidatePath("/dashboard/operacao");
}

export async function assignAnalyst(processId: string, analystId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "OPERADOR"].includes(r))) {
    throw new Error("Sem permissão");
  }

  await prisma.process.update({
    where: { id: processId },
    data: {
      analystId,
      timeline: {
        create: {
          stage: "A_INICIAR",
          content: "Analista atribuído",
          userId: session.user.id,
        },
      },
    },
  });

  revalidatePath(`/dashboard/operacao/${processId}`);
}

export async function addProcessCost(data: {
  processId: string;
  description: string;
  amount: number;
  category?: string;
  date: string;
  owner: "EMPRESA" | "CLIENTE";
  receiptUrl?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "VENDEDOR", "OPERADOR"].includes(r))) throw new Error("Sem permissão");

  const d = new Date(data.date + "T12:00:00");
  await prisma.cost.create({
    data: {
      processId: data.processId,
      userId: session.user.id,
      description: data.description,
      amount: data.amount,
      type: "VARIAVEL",
      category: data.category || "Operacional",
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      date: d,
      owner: data.owner,
      receiptUrl: data.receiptUrl ?? null,
      approvalStatus: "PENDENTE",
    },
  });

  revalidatePath(`/dashboard/vendas/${data.processId}`);
  revalidatePath(`/dashboard/operacao/${data.processId}`);
  revalidatePath("/dashboard/admin/comissoes");
}

export async function deleteProcessCost(costId: string, processId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const cost = await prisma.cost.findUnique({
    where: { id: costId },
    select: { userId: true, approvalStatus: true },
  });
  if (!cost) throw new Error("Custo não encontrado");
  if (!session.user.roles.includes("ADMIN") && cost.userId !== session.user.id) throw new Error("Sem permissão");
  if (cost.approvalStatus === "APROVADO" && !session.user.roles.includes("ADMIN")) throw new Error("Custo já aprovado");

  await prisma.cost.delete({ where: { id: costId } });

  revalidatePath(`/dashboard/vendas/${processId}`);
  revalidatePath(`/dashboard/operacao/${processId}`);
  revalidatePath("/dashboard/admin/comissoes");
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/financeiro/custos");
}

export async function approveProcessCost(costId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.includes("ADMIN")) throw new Error("Sem permissão");

  const cost = await prisma.cost.findUnique({
    where: { id: costId },
    select: { processId: true },
  });

  await prisma.cost.update({
    where: { id: costId },
    data: {
      approvalStatus: "APROVADO",
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
  });

  if (cost?.processId) {
    revalidatePath(`/dashboard/vendas/${cost.processId}`);
    revalidatePath(`/dashboard/operacao/${cost.processId}`);
  }
  revalidatePath("/dashboard/admin/comissoes");
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/financeiro/custos");
}

export async function rejectProcessCost(costId: string, reason: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.includes("ADMIN")) throw new Error("Sem permissão");

  const cost = await prisma.cost.findUnique({
    where: { id: costId },
    select: { processId: true },
  });

  await prisma.cost.update({
    where: { id: costId },
    data: { approvalStatus: "REJEITADO", rejectionReason: reason },
  });

  if (cost?.processId) {
    revalidatePath(`/dashboard/vendas/${cost.processId}`);
    revalidatePath(`/dashboard/operacao/${cost.processId}`);
  }
  revalidatePath("/dashboard/admin/comissoes");
}

export async function getPendingProcessCosts() {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.includes("ADMIN")) throw new Error("Sem permissão");

  return prisma.cost.findMany({
    where: { processId: { not: null }, approvalStatus: "PENDENTE" },
    include: {
      user: { select: { name: true, roles: true } },
      process: { include: { client: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateProcessServices(
  processId: string,
  services: Array<{
    serviceKey: string;
    serviceName: string;
    serviceGroup: string;
    calculatedValue: number | null;
    negotiatedValue: number;
    negotiationReason?: string;
    hectares?: number;
    squareMeters?: number;
    confrontantes?: number;
    financedValue?: number;
    clientPropertyId?: string | null;
  }>
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "VENDEDOR"].includes(r))) throw new Error("Sem permissão");

  const proc = await prisma.process.findUnique({
    where: { id: processId },
    select: { salesStage: true, sellerId: true },
  });
  if (!proc) throw new Error("Processo não encontrado");
  if (proc.salesStage !== "PROSPECCAO") throw new Error("Edição de serviços só é permitida na etapa Prospecção");
  if (!session.user.roles.includes("ADMIN") && session.user.roles.includes("VENDEDOR") && proc.sellerId !== session.user.id) throw new Error("Sem permissão");

  const totalValue = services.reduce((s, sv) => s + sv.negotiatedValue, 0);

  await prisma.$transaction([
    prisma.processService.deleteMany({ where: { processId } }),
    prisma.processService.createMany({
      data: services.map((sv) => ({
        processId,
        serviceKey: sv.serviceKey,
        serviceName: sv.serviceName,
        serviceGroup: sv.serviceGroup,
        calculatedValue: sv.calculatedValue ?? null,
        negotiatedValue: sv.negotiatedValue,
        negotiationReason: sv.negotiationReason || null,
        hectares: sv.hectares ?? null,
        squareMeters: sv.squareMeters ?? null,
        confrontantes: sv.confrontantes ?? null,
        financedValue: sv.financedValue ?? null,
        clientPropertyId: sv.clientPropertyId ?? null,
      })),
    }),
    prisma.process.update({
      where: { id: processId },
      data: { totalValue },
    }),
  ]);

  revalidatePath(`/dashboard/vendas/${processId}`);
}

export async function updateExpectedCompletionDate(
  processId: string,
  newDate: string,
  comment?: string
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "OPERADOR"].includes(r))) throw new Error("Sem permissão");

  const prev = await prisma.process.findUnique({
    where: { id: processId },
    select: { expectedCompletionDate: true },
  });

  const prevStr = prev?.expectedCompletionDate
    ? new Date(prev.expectedCompletionDate).toLocaleDateString("pt-BR")
    : "não definido";

  const newDateObj = new Date(newDate + "T12:00:00");
  const newStr = newDateObj.toLocaleDateString("pt-BR");

  await prisma.$transaction([
    prisma.process.update({
      where: { id: processId },
      data: { expectedCompletionDate: newDateObj },
    }),
    prisma.timelineEntry.create({
      data: {
        processId,
        userId: session.user.id,
        stage: "PRAZO_ATUALIZADO",
        content: comment
          ? `Prazo atualizado: ${prevStr} → ${newStr}. ${comment}`
          : `Prazo atualizado: ${prevStr} → ${newStr}`,
      },
    }),
  ]);

  revalidatePath(`/dashboard/operacao/${processId}`);
}

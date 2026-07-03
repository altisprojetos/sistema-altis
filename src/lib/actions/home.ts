"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getHomeReminders() {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const roles = session.user.roles;
  const userId = session.user.id;

  const processWhere: Record<string, unknown> = {};
  if (!roles.includes("ADMIN")) {
    if (roles.includes("OPERADOR")) {
      processWhere.OR = [{ analystId: userId }, { opsStage: "A_INICIAR", analystId: null }];
    } else if (roles.includes("VENDEDOR")) {
      processWhere.sellerId = userId;
    }
  }

  return prisma.reminder.findMany({
    where: {
      done: false,
      process: processWhere,
    },
    include: {
      process: {
        select: {
          id: true,
          opsStage: true,
          client: { select: { name: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}

export async function getHomeSummary() {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const roles = session.user.roles;
  const userId = session.user.id;
  const now = new Date();

  if (roles.includes("ADMIN") || roles.includes("FINANCEIRO")) {
    const [totalActive, aIniciar, overdueReminders] = await Promise.all([
      prisma.process.count({ where: { opsStage: { not: "FINALIZADO" }, salesStage: "ENVIADO_OPERACAO" } }),
      prisma.process.count({ where: { opsStage: "A_INICIAR" } }),
      prisma.reminder.count({ where: { done: false, dueDate: { lt: now } } }),
    ]);
    return { totalActive, aIniciar, overdueReminders };
  }

  if (roles.includes("OPERADOR")) {
    const [aIniciar, emAndamento, overdueReminders] = await Promise.all([
      prisma.process.count({ where: { opsStage: "A_INICIAR", analystId: null } }),
      prisma.process.count({ where: { analystId: userId, opsStage: { in: ["ELABORAR", "ANALISE"] } } }),
      prisma.reminder.count({
        where: {
          done: false,
          dueDate: { lt: now },
          process: { OR: [{ analystId: userId }, { opsStage: "A_INICIAR", analystId: null }] },
        },
      }),
    ]);
    return { aIniciar, emAndamento, overdueReminders };
  }

  if (roles.includes("VENDEDOR")) {
    const [emAndamento, devolvidos, overdueReminders] = await Promise.all([
      prisma.process.count({ where: { sellerId: userId, salesStage: { not: "ENVIADO_OPERACAO" } } }),
      prisma.process.count({ where: { sellerId: userId, salesStage: "DEVOLVIDO_PENDENCIAS" } }),
      prisma.reminder.count({
        where: { done: false, dueDate: { lt: now }, process: { sellerId: userId } },
      }),
    ]);
    return { emAndamento, devolvidos, overdueReminders };
  }

  return {};
}

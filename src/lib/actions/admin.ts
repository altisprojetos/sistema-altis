"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) throw new Error("Acesso restrito ao Admin");
  return session;
}

// ─── Usuários ────────────────────────────────────────────────────────────────

export async function getUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true, name: true, email: true, roles: true,
      commissionRate: true, active: true, createdAt: true,
      _count: { select: { processesSold: true, processesAnalyzed: true } },
    },
  });
}

export async function getUserById(id: string) {
  await requireAdmin();
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, roles: true,
      commissionRate: true, commissionRateOps: true,
      commissionRateSubVenda: true, commissionRateSubOps: true,
      managerId: true, active: true, createdAt: true,
      subordinates: { select: { id: true } },
    },
  });
}

export async function getCoordinators() {
  await requireAdmin();
  return prisma.user.findMany({
    where: { roles: { has: "COORDENADOR" }, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getSubordinateCandidates() {
  await requireAdmin();
  return prisma.user.findMany({
    where: {
      active: true,
      roles: { hasSome: ["VENDEDOR", "OPERADOR"] },
      NOT: { roles: { has: "COORDENADOR" } },
    },
    select: { id: true, name: true, roles: true, managerId: true },
    orderBy: { name: "asc" },
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  roles: Role[];
  commissionRate: number;
  commissionRateOps: number;
  commissionRateSubVenda: number;
  commissionRateSubOps: number;
  managerId?: string | null;
  subordinateIds?: string[];
}) {
  await requireAdmin();

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return { error: "E-mail já cadastrado" };

  const hash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hash,
      roles: data.roles,
      commissionRate:        data.commissionRate,
      commissionRateOps:     data.commissionRateOps,
      commissionRateSubVenda: data.commissionRateSubVenda,
      commissionRateSubOps:  data.commissionRateSubOps,
      managerId: data.managerId || null,
    },
  });

  if (data.subordinateIds?.length) {
    await prisma.user.updateMany({
      where: { id: { in: data.subordinateIds } },
      data: { managerId: user.id },
    });
  }

  revalidatePath("/dashboard/admin/usuarios");
  return { success: true };
}

export async function updateUser(
  id: string,
  data: {
    name: string;
    email: string;
    roles: Role[];
    commissionRate: number;
    commissionRateOps: number;
    commissionRateSubVenda: number;
    commissionRateSubOps: number;
    managerId?: string | null;
    subordinateIds?: string[];
    active: boolean;
    newPassword?: string;
  }
) {
  await requireAdmin();

  const update: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    roles: data.roles,
    commissionRate:        data.commissionRate,
    commissionRateOps:     data.commissionRateOps,
    commissionRateSubVenda: data.commissionRateSubVenda,
    commissionRateSubOps:  data.commissionRateSubOps,
    managerId: data.managerId || null,
    active: data.active,
  };

  if (data.newPassword) {
    update.password = await bcrypt.hash(data.newPassword, 12);
  }

  try {
    await prisma.user.update({ where: { id }, data: update });
  } catch {
    return { error: "Erro ao atualizar usuário." };
  }

  // Atualiza subordinados: remove vínculo dos que saíram, adiciona aos novos
  if (data.subordinateIds !== undefined) {
    await prisma.user.updateMany({
      where: { managerId: id, id: { notIn: data.subordinateIds } },
      data: { managerId: null },
    });
    if (data.subordinateIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: data.subordinateIds } },
        data: { managerId: id },
      });
    }
  }

  revalidatePath("/dashboard/admin/usuarios");
  revalidatePath(`/dashboard/admin/usuarios/${id}`);
  return { success: true };
}

// ─── Comissões ────────────────────────────────────────────────────────────────

export async function getCommissions(filters?: { status?: "PENDENTE" | "PAGA" }) {
  await requireAdmin();

  return prisma.commission.findMany({
    where: filters?.status ? { status: filters.status } : undefined,
    include: {
      user: { select: { name: true, roles: true } },
      process: {
        select: {
          id: true,
          client: { select: { name: true } },
          services: { select: { serviceName: true, subtype: true, negotiatedValue: true } },
          completedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function payCommission(commissionId: string) {
  const session = await requireAdmin();

  await prisma.commission.update({
    where: { id: commissionId },
    data: {
      status: "PAGA",
      paidAt: new Date(),
      paidById: session.user.id,
    },
  });

  // Registra como custo no financeiro
  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
    include: { user: { select: { name: true } } },
  });

  if (commission) {
    const now = new Date();
    await prisma.cost.create({
      data: {
        description: `Comissão — ${commission.user.name}`,
        amount: commission.amount,
        type: "VARIAVEL",
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        category: "Comissão",
      },
    });
  }

  revalidatePath("/dashboard/admin/comissoes");
}

export async function adjustCommission(commissionId: string, newAmount: number, note: string) {
  await requireAdmin();

  const current = await prisma.commission.findUnique({ where: { id: commissionId } });
  if (!current) return { error: "Comissão não encontrada" };
  if (current.status === "PAGA") return { error: "Comissão já paga não pode ser ajustada" };

  await prisma.commission.update({
    where: { id: commissionId },
    data: {
      amount: newAmount,
      originalAmount: current.originalAmount ?? current.amount,
      adjustmentNote: note,
    },
  });

  revalidatePath("/dashboard/admin/comissoes");
  return { ok: true };
}

export async function payAllPendingCommissions(userId?: string) {
  const session = await requireAdmin();

  const where = {
    status: "PENDENTE" as const,
    ...(userId ? { userId } : {}),
  };

  const pending = await prisma.commission.findMany({
    where,
    include: { user: { select: { name: true } } },
  });

  const now = new Date();

  await prisma.$transaction([
    prisma.commission.updateMany({
      where,
      data: { status: "PAGA", paidAt: now, paidById: session.user.id },
    }),
    prisma.cost.createMany({
      data: pending.map((c) => ({
        description: `Comissão — ${c.user.name}`,
        amount: c.amount,
        type: "VARIAVEL" as const,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        category: "Comissão",
      })),
    }),
  ]);

  revalidatePath("/dashboard/admin/comissoes");
}

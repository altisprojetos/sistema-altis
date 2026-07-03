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
      commissionRate: true, active: true, createdAt: true,
    },
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  roles: Role[];
  commissionRate: number;
}) {
  await requireAdmin();

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return { error: "E-mail já cadastrado" };

  const hash = await bcrypt.hash(data.password, 12);
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hash,
      roles: data.roles,
      commissionRate: data.commissionRate,
    },
  });

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
    active: boolean;
    newPassword?: string;
  }
) {
  await requireAdmin();

  const update: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    roles: data.roles,
    commissionRate: data.commissionRate,
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
          services: { select: { serviceName: true } },
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

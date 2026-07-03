"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function getSellerSession() {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
}

export async function getProspections() {
  const session = await getSellerSession();
  const roles = session.user.roles;
  const userId = session.user.id;

  const now = new Date();

  return prisma.prospection.findMany({
    where: {
      dismissed: false,
      OR: [{ nextContactDate: null }, { nextContactDate: { lte: now } }],
      // Vendedor só vê as próprias; Admin vê todas
      ...(!roles.includes("ADMIN") ? { sellerId: userId } : {}),
    },
    include: {
      process: {
        include: {
          client: { select: { id: true, name: true, type: true, phone: true } },
          services: { select: { serviceName: true, serviceGroup: true, negotiatedValue: true } },
          seller: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingProspectionsCount() {
  const session = await getSellerSession();
  const roles = session.user.roles;
  const userId = session.user.id;
  const now = new Date();

  return prisma.prospection.count({
    where: {
      dismissed: false,
      OR: [{ nextContactDate: null }, { nextContactDate: { lte: now } }],
      ...(!roles.includes("ADMIN") ? { sellerId: userId } : {}),
    },
  });
}

export async function dismissProspection(id: string, nextContactDate?: Date) {
  await getSellerSession();
  await prisma.prospection.update({
    where: { id },
    data: {
      dismissed: nextContactDate ? false : true,
      dismissedAt: nextContactDate ? null : new Date(),
      nextContactDate: nextContactDate ?? null,
    },
  });
  revalidatePath("/dashboard/vendas");
  revalidatePath("/dashboard/vendas/prospeccoes");
}

export async function acceptProspection(prospectionId: string) {
  const session = await getSellerSession();

  const prospection = await prisma.prospection.findUnique({
    where: { id: prospectionId },
    include: { process: { select: { clientId: true } } },
  });

  if (!prospection) throw new Error("Prospecção não encontrada");

  // Marca como dispensada (convertida) e cria novo processo na etapa PROSPECCAO
  const newProcess = await prisma.$transaction(async (tx) => {
    await tx.prospection.update({
      where: { id: prospectionId },
      data: { dismissed: true, dismissedAt: new Date() },
    });

    return tx.process.create({
      data: {
        clientId: prospection.process.clientId,
        sellerId: session.user.id,
        salesStage: "PROSPECCAO",
      },
    });
  });

  revalidatePath("/dashboard/vendas");
  return newProcess.id;
}

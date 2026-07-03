"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getDocumentTree() {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const roles = session.user.roles;
  const uid = session.user.id;

  let where: Record<string, unknown> | undefined = undefined;
  if (!roles.includes("ADMIN")) {
    const orClauses: Record<string, unknown>[] = [];
    if (roles.includes("VENDEDOR")) orClauses.push({ sellerId: uid });
    if (roles.includes("OPERADOR")) orClauses.push({ analystId: uid });
    if (orClauses.length === 1) where = orClauses[0];
    else if (orClauses.length > 1) where = { OR: orClauses };
  }

  const processes = await prisma.process.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      client: { select: { id: true, name: true } },
      services: { select: { serviceName: true }, take: 1 },
      _count: { select: { documents: true } },
      costs: {
        where: { receiptUrl: { not: null } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by client
  const clientMap = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      processes: {
        processId: string;
        label: string;
        docCount: number;
        receiptCount: number;
      }[];
    }
  >();

  for (const p of processes) {
    const cid = p.client.id;
    if (!clientMap.has(cid)) {
      clientMap.set(cid, { clientId: cid, clientName: p.client.name, processes: [] });
    }
    clientMap.get(cid)!.processes.push({
      processId: p.id,
      label: p.services[0]?.serviceName ?? `Processo ${new Date(p.createdAt).toLocaleDateString("pt-BR")}`,
      docCount: p._count.documents,
      receiptCount: p.costs.length,
    });
  }

  return Array.from(clientMap.values());
}

export async function replaceDocument(docId: string, newUrl: string, newFileName: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "VENDEDOR", "OPERADOR"].includes(r))) throw new Error("Sem permissão");

  await prisma.document.update({
    where: { id: docId },
    data: { url: newUrl, fileName: newFileName, uploadedAt: new Date(), uploadedBy: session.user.id },
  });

  const doc = await prisma.document.findUnique({ where: { id: docId }, select: { processId: true } });
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/dashboard/documentos`);
  if (doc?.processId) {
    revalidatePath(`/dashboard/vendas/${doc.processId}`);
    revalidatePath(`/dashboard/operacao/${doc.processId}`);
  }
}

export async function updateDocumentDescription(docId: string, description: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  await prisma.document.update({ where: { id: docId }, data: { description: description || null } });

  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/dashboard/documentos`);
}

export async function addFreeDocument(data: {
  processId: string;
  docName: string;
  description?: string;
  fileName: string;
  url: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  if (!session.user.roles.some(r => ["ADMIN", "VENDEDOR", "OPERADOR"].includes(r))) throw new Error("Sem permissão");

  await prisma.document.create({
    data: {
      processId: data.processId,
      docNumber: 0,
      docName: data.docName,
      fileName: data.fileName,
      url: data.url,
      description: data.description || null,
      uploadedBy: session.user.id,
    },
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/dashboard/documentos`);
  revalidatePath(`/dashboard/vendas/${data.processId}`);
  revalidatePath(`/dashboard/operacao/${data.processId}`);
}

export async function getProcessDocuments(processId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const docs = await prisma.document.findMany({
    where: { processId },
    orderBy: { uploadedAt: "desc" },
  });

  const receipts = await prisma.cost.findMany({
    where: { processId, receiptUrl: { not: null } },
    select: {
      id: true,
      description: true,
      receiptUrl: true,
      date: true,
      user: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  return { docs, receipts };
}

"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function getSession() {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
}

export async function addDocument(data: {
  processId: string;
  docNumber: number;
  docName: string;
  fileName: string;
  url: string;
  propertyIndex?: number;
}) {
  const session = await getSession();
  await prisma.document.create({
    data: {
      processId: data.processId,
      docNumber: data.docNumber,
      docName: data.docName,
      fileName: data.fileName,
      url: data.url,
      propertyIndex: data.propertyIndex ?? 0,
      uploadedBy: session.user.id,
    },
  });
  revalidatePath(`/dashboard/vendas/${data.processId}`);
}

export async function deleteDocument(id: string, processId: string) {
  await getSession();
  await prisma.document.delete({ where: { id } });
  revalidatePath(`/dashboard/vendas/${processId}`);
}

"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ClientType } from "@prisma/client";

const ClientBaseSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  type: z.nativeEnum(ClientType),
  propertyCount: z.coerce.number().int().min(1).default(1),
});

function parseProperties(formData: FormData, count: number, type: ClientType) {
  return Array.from({ length: count }, (_, i) => {
    const propId = (formData.get(`prop_${i}_id`) as string) || undefined;
    if (type === "RURAL") {
      return {
        id: propId,
        index: i,
        farmName: (formData.get(`prop_${i}_farmName`) as string) || null,
        municipality: (formData.get(`prop_${i}_municipality`) as string) || null,
        areaHa: formData.get(`prop_${i}_areaHa`) ? Number(formData.get(`prop_${i}_areaHa`)) : null,
        latitude: formData.get(`prop_${i}_latitude`) ? Number(formData.get(`prop_${i}_latitude`)) : null,
        longitude: formData.get(`prop_${i}_longitude`) ? Number(formData.get(`prop_${i}_longitude`)) : null,
        streetAddress: null, neighborhood: null, city: null, state: null, cep: null,
      };
    } else {
      return {
        id: propId,
        index: i,
        streetAddress: (formData.get(`prop_${i}_streetAddress`) as string) || null,
        neighborhood: (formData.get(`prop_${i}_neighborhood`) as string) || null,
        city: (formData.get(`prop_${i}_city`) as string) || null,
        state: (formData.get(`prop_${i}_state`) as string) || null,
        cep: (formData.get(`prop_${i}_cep`) as string) || null,
        farmName: null, municipality: null, areaHa: null, latitude: null, longitude: null,
      };
    }
  });
}

export async function createClient(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const parsed = ClientBaseSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    type: formData.get("type"),
    propertyCount: formData.get("propertyCount") || 1,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, document, phone, email, address, type, propertyCount } = parsed.data;
  const properties = parseProperties(formData, propertyCount, type);
  const first = properties[0];

  await prisma.client.create({
    data: {
      name,
      document: document || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      type,
      propertyCount,
      farmName: type === "RURAL" ? (first?.farmName ?? null) : null,
      municipality: type === "RURAL" ? (first?.municipality ?? null) : null,
      areaHa: type === "RURAL" ? (first?.areaHa ?? null) : null,
      latitude: first?.latitude ?? null,
      longitude: first?.longitude ?? null,
      sellerId: session.user.id,
      properties: { createMany: { data: properties.map(({ id: _id, ...p }) => p) } },
    },
  });

  revalidatePath("/dashboard/clientes");
  redirect("/dashboard/clientes");
}

export async function updateClient(clientId: string, formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const parsed = ClientBaseSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    type: formData.get("type"),
    propertyCount: formData.get("propertyCount") || 1,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, document, phone, email, address, type, propertyCount } = parsed.data;
  const deletedIds = ((formData.get("deletedPropertyIds") as string) || "")
    .split(",")
    .filter(Boolean);

  const properties = parseProperties(formData, propertyCount, type);
  const first = properties[0];

  await prisma.$transaction(async (tx) => {
    if (deletedIds.length > 0) {
      await tx.clientProperty.deleteMany({ where: { id: { in: deletedIds }, clientId } });
    }

    await tx.client.update({
      where: { id: clientId },
      data: {
        name,
        document: document || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        type,
        propertyCount: properties.length,
        farmName: type === "RURAL" ? (first?.farmName ?? null) : null,
        municipality: type === "RURAL" ? (first?.municipality ?? null) : null,
        areaHa: type === "RURAL" ? (first?.areaHa ?? null) : null,
        latitude: first?.latitude ?? null,
        longitude: first?.longitude ?? null,
      },
    });

    for (const { id, ...propData } of properties) {
      if (id) {
        await tx.clientProperty.update({ where: { id }, data: { ...propData } });
      } else {
        await tx.clientProperty.create({ data: { clientId, ...propData } });
      }
    }
  });

  revalidatePath(`/dashboard/clientes/${clientId}`);
  redirect(`/dashboard/clientes/${clientId}`);
}

export async function addClientNote(clientId: string, content: string) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!content.trim()) return { error: "Observação não pode ser vazia" };

  await prisma.clientNote.create({
    data: { clientId, userId: session.user.id, content: content.trim() },
  });

  revalidatePath(`/dashboard/clientes/${clientId}`);
  return { success: true };
}

export async function getClients(search?: string) {
  const session = await auth();
  if (!session) return [];

  const isAdmin = session.user.roles.includes("ADMIN");

  return prisma.client.findMany({
    where: {
      ...(isAdmin ? {} : { sellerId: session.user.id }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { document: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { municipality: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      seller: { select: { name: true } },
      _count: { select: { processes: true } },
      properties: {
        select: { id: true, index: true, farmName: true, municipality: true, streetAddress: true, city: true, areaHa: true },
        orderBy: { index: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClientById(id: string) {
  const session = await auth();
  if (!session) return null;

  return prisma.client.findUnique({
    where: { id },
    include: {
      seller: { select: { name: true } },
      properties: { orderBy: { index: "asc" } },
      notes: {
        include: { user: { select: { name: true, roles: true } } },
        orderBy: { createdAt: "desc" },
      },
      processes: {
        select: {
          id: true,
          salesStage: true,
          opsStage: true,
          createdAt: true,
          services: { select: { serviceName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";

function sanitizeFolder(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/, "");
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const processId = formData.get("processId") as string | null;
  const subfolderRaw = formData.get("subfolder") as string | null;

  if (!file || !processId) {
    return NextResponse.json({ error: "Arquivo e processId obrigatórios" }, { status: 400 });
  }

  const subfolder = subfolderRaw ? sanitizeFolder(subfolderRaw) : null;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = subfolder
    ? path.join(process.cwd(), "public", "uploads", processId, subfolder)
    : path.join(process.cwd(), "public", "uploads", processId);

  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name);
  const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniqueName = `${Date.now()}_${base}${ext}`;
  const filePath = path.join(uploadDir, uniqueName);

  await writeFile(filePath, buffer);

  const url = subfolder
    ? `/uploads/${processId}/${subfolder}/${uniqueName}`
    : `/uploads/${processId}/${uniqueName}`;

  return NextResponse.json({ url, fileName: file.name });
}

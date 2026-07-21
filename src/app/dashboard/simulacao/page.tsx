import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import SimulacaoForm from "./SimulacaoForm";
import { prisma } from "@/lib/prisma";

export default async function SimulacaoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const clientes = await prisma.client.findMany({
    select: { id: true, name: true, document: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Simulação de Financiamento"
        subtitle="Sistema de Amortização Constante (SAC) — Reembolso Anual"
      />
      <div className="mt-6">
        <SimulacaoForm clientes={clientes} />
      </div>
    </div>
  );
}

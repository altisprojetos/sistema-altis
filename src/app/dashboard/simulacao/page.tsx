import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import SimulacaoForm from "./SimulacaoForm";

export default async function SimulacaoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Simulação de Financiamento"
        subtitle="Sistema de Amortização Constante (SAC)"
      />
      <div className="mt-6">
        <SimulacaoForm />
      </div>
    </div>
  );
}

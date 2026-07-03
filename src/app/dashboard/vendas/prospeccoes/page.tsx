import { getProspections } from "@/lib/actions/prospeccoes";
import PageHeader from "@/components/ui/PageHeader";
import Link from "next/link";
import ProspeccaoCards from "./ProspeccaoCards";

export default async function ProspeccaoPage() {
  const prospections = await getProspections();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Oportunidades de Reengajamento"
          subtitle="Clientes com processos finalizados — hora de oferecer novos serviços"
        />
        <Link
          href="/dashboard/vendas"
          className="text-sm text-gray-500 hover:text-[var(--ink-900)]"
        >
          ← Voltar ao Pipeline
        </Link>
      </div>

      {prospections.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 text-sm text-amber-800">
          <span className="font-semibold">{prospections.length} cliente(s)</span> aguardam contato
          para novos serviços. Aceite para abrir um novo processo ou adie com lembrete de data.
        </div>
      )}

      <ProspeccaoCards prospections={prospections} />
    </div>
  );
}

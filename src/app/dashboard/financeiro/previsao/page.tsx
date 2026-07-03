import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Link from "next/link";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function fmt(v: number) { return BRL.format(v); }

export default async function PrevisaoPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("FINANCEIRO")) redirect("/dashboard");

  const previsao = await prisma.process.findMany({
    where: {
      salesStage: "ENVIADO_OPERACAO",
      opsStage: { not: "FINALIZADO" },
    },
    include: {
      client: { select: { name: true } },
      seller: { select: { name: true } },
      services: { select: { serviceName: true, serviceGroup: true, negotiatedValue: true, calculatedValue: true } },
    },
    orderBy: { expectedCompletionDate: "asc" },
  });

  const total = previsao.reduce((s, p) => s + (p.negotiatedValue ?? p.totalValue ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Previsão de Faturamento"
        subtitle="Processos em andamento com data estimada de conclusão"
      />

      <div className="flex gap-2 text-sm">
        {[
          { href: "/dashboard/financeiro", label: "Visão Geral" },
          { href: "/dashboard/financeiro/previsao", label: "Previsão" },
          { href: "/dashboard/financeiro/custos", label: "Custos" },
          { href: "/dashboard/financeiro/saldo", label: "Saldo em Conta" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 rounded border border-[var(--ink-900)] bg-[var(--ink-900)] text-white font-medium"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 flex items-center justify-between">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">{previsao.length} processo(s)</span> em andamento
        </p>
        <p className="text-lg font-bold text-blue-700">{fmt(total)}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Cliente</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Vendedor</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Serviços</th>
              <th className="text-center px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Etapa Ops</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Valor</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Previsão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {previsao.map((p) => {
              const value = p.negotiatedValue ?? p.totalValue ?? 0;
              const overdue =
                p.expectedCompletionDate && new Date(p.expectedCompletionDate) < new Date();
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-[var(--ink-900)]">{p.client.name}</td>
                  <td className="px-5 py-3 text-gray-500">{p.seller.name}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs max-w-[200px]">
                    <span className="truncate block">
                      {p.services.map((s) => s.serviceName).join(", ") || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {p.opsStage?.replace("_", " ") ?? "A INICIAR"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">{fmt(value)}</td>
                  <td className={`px-5 py-3 text-right ${overdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                    {p.expectedCompletionDate
                      ? new Date(p.expectedCompletionDate).toLocaleDateString("pt-BR")
                      : "—"}
                    {overdue && <span className="ml-1 text-xs">⚠</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {previsao.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            Nenhum processo em andamento com previsão.
          </p>
        )}
      </div>
    </div>
  );
}

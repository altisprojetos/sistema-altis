import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getClientById } from "@/lib/actions/clients";
import PageHeader from "@/components/ui/PageHeader";
import Link from "next/link";
import ClientEditForm from "./ClientEditForm";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.roles.includes("FINANCEIRO") && !session.user.roles.includes("ADMIN")) redirect("/dashboard");

  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/clientes/${id}`}
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--steel-400)" }}
        >
          ← Voltar para ficha do cliente
        </Link>
      </div>
      <PageHeader
        title={`Editar: ${client.name}`}
        subtitle="Atualize os dados cadastrais e imóveis"
      />
      <ClientEditForm client={client} />
    </div>
  );
}

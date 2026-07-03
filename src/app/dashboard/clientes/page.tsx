import { getClients } from "@/lib/actions/clients";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { q } = await searchParams;
  const clients = await getClients(q);

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} cadastrado${clients.length !== 1 ? "s" : ""}`}
        action={{ label: "+ Novo Cliente", href: "/dashboard/clientes/novo" }}
      />

      {/* Busca */}
      <form method="GET" className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, CPF/CNPJ, telefone ou município..."
          className="w-full max-w-md px-4 py-2.5 text-sm border outline-none"
          style={{
            borderColor: "var(--steel-200)",
            background: "white",
            color: "var(--ink-900)",
          }}
        />
      </form>

      {clients.length === 0 ? (
        <div
          className="facet-tl p-12 text-center"
          style={{ background: "white" }}
        >
          <p className="text-sm" style={{ color: "var(--steel-400)" }}>
            {q ? "Nenhum cliente encontrado para esta busca." : "Nenhum cliente cadastrado ainda."}
          </p>
          <Link
            href="/dashboard/clientes/novo"
            className="inline-block mt-4 text-sm font-semibold"
            style={{ color: "var(--signal-500)" }}
          >
            Cadastrar primeiro cliente →
          </Link>
        </div>
      ) : (
        <div className="facet-tl overflow-hidden" style={{ background: "white" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--paper-100)" }}>
                {["Nome", "Documento", "Telefone", "Tipo", "Município", "Propriedades", "Processos", "Vendedor", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--steel-400)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className="transition-colors hover:bg-[var(--paper-50)]"
                  style={{ borderBottom: "1px solid var(--paper-50)" }}
                >
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--ink-900)" }}>
                    {c.name}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--steel-400)" }}>
                    {c.document || "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--steel-400)" }}>
                    {c.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={c.type} />
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--steel-400)" }}>
                    {c.municipality || c.address || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.type === "RURAL" ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold"
                        style={{ color: "var(--ink-900)" }}
                        title={`${c.propertyCount} propriedade(s)`}
                      >
                        🏡 {c.propertyCount}
                      </span>
                    ) : (
                      <span style={{ color: "var(--steel-200)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                      style={{ background: "var(--paper-100)", color: "var(--ink-900)" }}
                    >
                      {c._count.processes}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--steel-400)" }}>
                    {c.seller.name}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/clientes/${c.id}`}
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--signal-500)" }}
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

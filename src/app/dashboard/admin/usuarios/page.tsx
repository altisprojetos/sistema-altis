import { getUsers } from "@/lib/actions/admin";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", VENDEDOR: "Vendedor", OPERADOR: "Operador", FINANCEIRO: "Financeiro",
};

export default async function UsuariosPage() {
  const users = await getUsers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuários"
        subtitle="Gerenciamento de acesso ao sistema"
        action={{ label: "+ Novo Usuário", href: "/dashboard/admin/usuarios/novo" }}
      />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">E-mail</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Perfil</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Comissão</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Processos</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.active ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-medium text-[var(--ink-900)]">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge value={u.roles.join(" / ")} />
                </td>
                <td className="px-4 py-3 text-right">
                  {u.commissionRate > 0 ? (
                    <span className="font-semibold text-[var(--signal-500)]">
                      {u.commissionRate}%
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {u._count.processesSold + u._count.processesAnalyzed}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {u.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/admin/usuarios/${u.id}`}
                    className="text-xs text-[var(--signal-500)] hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Nenhum usuário cadastrado.</p>
        )}
      </div>
    </div>
  );
}

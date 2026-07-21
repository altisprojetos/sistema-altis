"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUser } from "@/lib/actions/admin";
import { Role } from "@prisma/client";
import PageHeader from "@/components/ui/PageHeader";

interface UserData {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  commissionRate: number;
  active: boolean;
}

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "VENDEDOR",    label: "Vendedor",    desc: "Acesso ao módulo de Vendas e Clientes" },
  { value: "OPERADOR",    label: "Operador",    desc: "Acesso ao módulo de Operação" },
  { value: "FINANCEIRO",  label: "Financeiro",  desc: "Acesso ao módulo Financeiro (somente leitura)" },
  { value: "COORDENADOR", label: "Coordenador",  desc: "Acesso completo a Clientes, Vendas e Operação (sem Admin)" },
  { value: "ADMIN",       label: "Admin",       desc: "Acesso total ao sistema" },
];

export function UserForm({ mode, user }: { mode: "create" | "edit"; user?: UserData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName]                   = useState(user?.name ?? "");
  const [email, setEmail]                 = useState(user?.email ?? "");
  const [roles, setRoles]                 = useState<Role[]>(user?.roles?.length ? user.roles : ["VENDEDOR"]);
  const [commissionRate, setCommission]   = useState(user?.commissionRate ?? 0);
  const [active, setActive]               = useState(user?.active ?? true);
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const showCommission = roles.includes("VENDEDOR") || roles.includes("OPERADOR");

  function toggleRole(r: Role) {
    setRoles(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      setError("Nome e e-mail são obrigatórios.");
      return;
    }
    if (roles.length === 0) {
      setError("Selecione ao menos uma função.");
      return;
    }
    if (mode === "create" && !password) {
      setError("Informe uma senha para o novo usuário.");
      return;
    }
    if (password && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setError("");

    startTransition(async () => {
      if (mode === "create") {
        const res = await createUser({ name, email, password, roles, commissionRate });
        if ("error" in res) { setError(res.error ?? "Erro ao salvar."); return; }
      } else if (user) {
        const res = await updateUser(user.id, {
          name, email, roles, commissionRate, active,
          newPassword: password || undefined,
        });
        if ("error" in res) { setError(res.error ?? "Erro ao salvar."); return; }
      }
      router.push("/dashboard/admin/usuarios");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      <PageHeader
        title={mode === "create" ? "Novo Usuário" : "Editar Usuário"}
        subtitle={mode === "create" ? "Cadastre um novo acesso ao sistema" : `Editando: ${user?.name}`}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Dados pessoais */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-[var(--ink-900)]">Dados do Usuário</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Nome completo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João da Silva"
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              E-mail *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@altis.com"
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
            />
          </div>
        </div>

        {/* Senha */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {mode === "create" ? "Senha *" : "Nova senha (deixe em branco para manter)"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
            />
          </div>
        </div>
      </div>

      {/* Perfil de acesso */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-[var(--ink-900)]">Perfil de Acesso</h2>
          <p className="text-xs text-gray-400 mt-0.5">Pode selecionar mais de uma função.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                roles.includes(r.value)
                  ? "border-[var(--signal-500)] bg-orange-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                value={r.value}
                checked={roles.includes(r.value)}
                onChange={() => toggleRole(r.value)}
                className="mt-0.5 accent-[var(--signal-500)]"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--ink-900)]">{r.label}</p>
                <p className="text-xs text-gray-500">{r.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Comissão */}
        {showCommission && (
          <div className="flex flex-col gap-1 max-w-xs border-t border-gray-100 pt-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Taxa de comissão (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commissionRate}
                onChange={(e) => setCommission(parseFloat(e.target.value) || 0)}
                className="border border-gray-200 rounded px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
              />
              <span className="text-sm text-gray-500">% sobre o valor do processo</span>
            </div>
            <p className="text-xs text-gray-400">
              Comissão calculada sobre o valor total negociado do processo.
            </p>
          </div>
        )}

        {/* Status */}
        {mode === "edit" && (
          <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[var(--signal-500)] rounded-full peer peer-checked:bg-[var(--signal-500)] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {active ? "Usuário ativo" : "Usuário inativo"}
              </p>
              <p className="text-xs text-gray-400">
                Usuários inativos não conseguem fazer login.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-[var(--signal-500)] text-white rounded font-semibold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Salvando..." : mode === "create" ? "Criar Usuário" : "Salvar Alterações"}
        </button>
        <a
          href="/dashboard/admin/usuarios"
          className="px-6 py-2.5 border border-gray-300 rounded text-gray-600 text-sm hover:bg-gray-50"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}

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
  commissionRate:        number;
  commissionRateOps:     number;
  commissionRateSubVenda: number;
  commissionRateSubOps:  number;
  managerId:             string | null;
  subordinates:          { id: string }[];
  active: boolean;
}

interface Coordinator { id: string; name: string }
interface SubordinateCandidate { id: string; name: string; roles: Role[]; managerId: string | null }

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "VENDEDOR",    label: "Vendedor",    desc: "Acesso ao módulo de Vendas e Clientes" },
  { value: "OPERADOR",    label: "Operador",    desc: "Acesso ao módulo de Operação" },
  { value: "FINANCEIRO",  label: "Financeiro",  desc: "Acesso ao módulo Financeiro (somente leitura)" },
  { value: "COORDENADOR", label: "Coordenador", desc: "Acesso completo a Clientes, Vendas e Operação (sem Admin)" },
  { value: "ADMIN",       label: "Admin",       desc: "Acesso total ao sistema" },
];

function RateField({
  label, hint, value, onChange,
}: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number" min={0} max={100} step={0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="border border-gray-200 rounded px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
        />
        <span className="text-sm text-gray-500">%</span>
      </div>
      <p className="text-xs text-gray-400">{hint}</p>
    </div>
  );
}

export function UserForm({
  mode,
  user,
  coordinators = [],
  subordinateCandidates = [],
}: {
  mode: "create" | "edit";
  user?: UserData;
  coordinators?: Coordinator[];
  subordinateCandidates?: SubordinateCandidate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName]   = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [roles, setRoles] = useState<Role[]>(user?.roles?.length ? user.roles : ["VENDEDOR"]);

  const [commissionRate,        setRate]       = useState(user?.commissionRate        ?? 0);
  const [commissionRateOps,     setRateOps]    = useState(user?.commissionRateOps     ?? 0);
  const [commissionRateSubVenda, setRateSubV]  = useState(user?.commissionRateSubVenda ?? 0);
  const [commissionRateSubOps,  setRateSubO]   = useState(user?.commissionRateSubOps  ?? 0);
  const [managerId, setManagerId]              = useState(user?.managerId ?? "");
  const [subordinateIds, setSubordinateIds]    = useState<string[]>(
    user?.subordinates?.map(s => s.id) ?? []
  );

  const [active, setActive]                   = useState(user?.active ?? true);
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isVendedor    = roles.includes("VENDEDOR");
  const isOperador    = roles.includes("OPERADOR");
  const isCoordenador = roles.includes("COORDENADOR");
  const isAdmin       = roles.includes("ADMIN");

  const showSalesRate  = isVendedor || isCoordenador;
  const showOpsRate    = isOperador || isCoordenador;
  const showSubVenda   = isCoordenador;
  const showSubOps     = isCoordenador;
  const showManager    = (isVendedor || isOperador) && !isCoordenador && !isAdmin && coordinators.length > 0;
  const showSubSelect  = isCoordenador && subordinateCandidates.length > 0;

  function toggleRole(r: Role) {
    setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  function toggleSubordinate(id: string) {
    setSubordinateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError("Nome e e-mail são obrigatórios."); return; }
    if (roles.length === 0) { setError("Selecione ao menos uma função."); return; }
    if (mode === "create" && !password) { setError("Informe uma senha para o novo usuário."); return; }
    if (password && password !== confirmPassword) { setError("As senhas não coincidem."); return; }
    setError("");

    startTransition(async () => {
      const payload = {
        name, email, roles,
        commissionRate,
        commissionRateOps,
        commissionRateSubVenda,
        commissionRateSubOps,
        managerId: managerId || null,
        subordinateIds: isCoordenador ? subordinateIds : undefined,
        active,
      };

      if (mode === "create") {
        const res = await createUser({ ...payload, password });
        if ("error" in res) { setError(res.error ?? "Erro ao salvar."); return; }
      } else if (user) {
        const res = await updateUser(user.id, { ...payload, newPassword: password || undefined });
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
        <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-2 text-sm">{error}</div>
      )}

      {/* Dados pessoais */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-[var(--ink-900)]">Dados do Usuário</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome completo *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João da Silva"
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">E-mail *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@altis.com"
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {mode === "create" ? "Senha *" : "Nova senha (deixe em branco para manter)"}
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirmar senha</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]" />
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
            <label key={r.value} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
              roles.includes(r.value) ? "border-[var(--signal-500)] bg-orange-50" : "border-gray-200 hover:border-gray-300"
            }`}>
              <input type="checkbox" checked={roles.includes(r.value)} onChange={() => toggleRole(r.value)}
                className="mt-0.5 accent-[var(--signal-500)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ink-900)]">{r.label}</p>
                <p className="text-xs text-gray-500">{r.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {mode === "edit" && (
          <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[var(--signal-500)] rounded-full peer peer-checked:bg-[var(--signal-500)] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <div>
              <p className="text-sm font-medium text-gray-700">{active ? "Usuário ativo" : "Usuário inativo"}</p>
              <p className="text-xs text-gray-400">Usuários inativos não conseguem fazer login.</p>
            </div>
          </div>
        )}
      </div>

      {/* Comissões */}
      {(showSalesRate || showOpsRate || showSubVenda || showSubOps || showManager) && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-5">
          <div>
            <h2 className="font-semibold text-[var(--ink-900)]">Comissões</h2>
            <p className="text-xs text-gray-400 mt-0.5">Calculadas sobre o valor total negociado do processo ao ser finalizado.</p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {showSalesRate && (
              <RateField
                label="Comissão de Venda"
                hint="Aplicada quando este usuário é o vendedor do processo."
                value={commissionRate}
                onChange={setRate}
              />
            )}
            {showOpsRate && (
              <RateField
                label="Comissão de Operação"
                hint="Aplicada quando este usuário é o elaborador/analista do processo."
                value={commissionRateOps}
                onChange={setRateOps}
              />
            )}
            {(showSubVenda || showSubOps) && (
              <div className="border-t border-gray-100 pt-4 flex flex-col gap-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comissão por Subordinado</p>
                {showSubVenda && (
                  <RateField
                    label="Por Vendedor Subordinado"
                    hint="Aplicada quando um vendedor vinculado a este coordenador fechar um processo."
                    value={commissionRateSubVenda}
                    onChange={setRateSubV}
                  />
                )}
                {showSubOps && (
                  <RateField
                    label="Por Operador Subordinado"
                    hint="Aplicada quando um operador vinculado a este coordenador finalizar um processo."
                    value={commissionRateSubOps}
                    onChange={setRateSubO}
                  />
                )}
              </div>
            )}
          </div>

          {/* Coordenador gestor (para vendedor/operador) */}
          {showManager && (
            <div className="flex flex-col gap-1 border-t border-gray-100 pt-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Coordenador / Gestor</label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="border border-gray-200 rounded px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-[var(--signal-500)]"
              >
                <option value="">— Sem coordenador —</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                O coordenador receberá comissão por subordinado nos processos finalizados por este usuário.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Subordinados (para coordenador) */}
      {showSubSelect && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-[var(--ink-900)]">Equipe / Subordinados</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Selecione os vendedores e operadores vinculados a este coordenador.
            </p>
          </div>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {subordinateCandidates.map((s) => {
              const checked = subordinateIds.includes(s.id);
              const roleLabels = s.roles
                .filter(r => r === "VENDEDOR" || r === "OPERADOR")
                .map(r => r === "VENDEDOR" ? "Vendedor" : "Operador")
                .join(", ");
              return (
                <label key={s.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                  checked ? "border-[var(--signal-500)] bg-orange-50" : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSubordinate(s.id)}
                    className="accent-[var(--signal-500)]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--ink-900)]">{s.name}</p>
                    <p className="text-xs text-gray-500">{roleLabels}</p>
                  </div>
                  {s.managerId && s.managerId !== user?.id && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      outro gestor
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 bg-[var(--signal-500)] text-white rounded font-semibold text-sm hover:opacity-90 disabled:opacity-50">
          {isPending ? "Salvando..." : mode === "create" ? "Criar Usuário" : "Salvar Alterações"}
        </button>
        <a href="/dashboard/admin/usuarios"
          className="px-6 py-2.5 border border-gray-300 rounded text-gray-600 text-sm hover:bg-gray-50">
          Cancelar
        </a>
      </div>
    </form>
  );
}

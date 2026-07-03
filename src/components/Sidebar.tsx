"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";

function NavIcon({ id }: { id: string }) {
  const props = {
    width: 15,
    height: 15,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (id) {
    case "inicio":
      return (
        <svg {...props}>
          <path d="M8 2L2 7v7h4V9h4v5h4V7L8 2z" />
        </svg>
      );
    case "clientes":
      return (
        <svg {...props}>
          <circle cx="8" cy="5" r="2.5" />
          <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" />
        </svg>
      );
    case "vendas":
      return (
        <svg {...props}>
          <rect x="2" y="6" width="12" height="8" rx="1" />
          <path d="M5 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          <path d="M2 10h12" />
        </svg>
      );
    case "operacao":
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="2" />
          <path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5L5 11M11 5l1.5-1.5" />
        </svg>
      );
    case "financeiro":
      return (
        <svg {...props}>
          <path d="M8 2v12" />
          <path d="M5 4.5h4a1.5 1.5 0 010 3H5a2 2 0 000 4h5.5" />
        </svg>
      );
    case "documentos":
      return (
        <svg {...props}>
          <path d="M4 2h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
          <path d="M10 2v4h4M6 9h4M6 12h3" />
        </svg>
      );
    case "usuarios":
      return (
        <svg {...props}>
          <circle cx="6" cy="5" r="2" />
          <path d="M1 14c0-2.8 2.2-5 5-5h0" />
          <circle cx="11" cy="5" r="2" />
          <path d="M9 9h0c2.8 0 5 2.2 5 5" />
          <path d="M8 9v0" />
        </svg>
      );
    case "aprovacoes":
      return (
        <svg {...props}>
          <path d="M3 8l4 4 6-7" />
          <circle cx="8" cy="8" r="6" />
        </svg>
      );
    default:
      return null;
  }
}

const navItems: { label: string; href: string; icon: string; roles: Role[]; exact?: boolean }[] = [
  { label: "Início",      href: "/dashboard",                   icon: "inicio",     roles: ["ADMIN","VENDEDOR","OPERADOR","FINANCEIRO"], exact: true },
  { label: "Clientes",    href: "/dashboard/clientes",          icon: "clientes",   roles: ["ADMIN","VENDEDOR","OPERADOR"] },
  { label: "Vendas",      href: "/dashboard/vendas",            icon: "vendas",     roles: ["ADMIN","VENDEDOR"] },
  { label: "Operação",    href: "/dashboard/operacao",          icon: "operacao",   roles: ["ADMIN","OPERADOR"] },
  { label: "Financeiro",  href: "/dashboard/financeiro",        icon: "financeiro", roles: ["ADMIN","FINANCEIRO"] },
  { label: "Documentos",  href: "/dashboard/documentos",        icon: "documentos", roles: ["ADMIN","VENDEDOR","OPERADOR"] },
];

const adminItems: { label: string; href: string; icon: string; roles: Role[] }[] = [
  { label: "Usuários",    href: "/dashboard/admin/usuarios",    icon: "usuarios",   roles: ["ADMIN"] },
  { label: "Aprovações",  href: "/dashboard/admin/comissoes",   icon: "aprovacoes", roles: ["ADMIN"] },
];

export default function Sidebar({ roles, userName }: { roles: Role[]; userName: string }) {
  const pathname = usePathname();

  const mainItems = navItems.filter(item => item.roles.some(r => roles.includes(r)));
  const extraItems = roles.includes("ADMIN") ? adminItems : [];

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

  function isActive(item: { href: string; exact?: boolean }) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <aside
      className="w-56 flex flex-col min-h-screen flex-shrink-0"
      style={{ background: "var(--ink-900)" }}
    >
      {/* ── Logo ───────────────────────────────────────── */}
      <div
        className="px-5 py-4 flex items-center"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Image
          src="/logo-dark.png"
          alt="ALTIS"
          width={150}
          height={52}
          priority
        />
      </div>

      {/* ── Main nav ───────────────────────────────────── */}
      <nav className="flex-1 px-3 pt-4 pb-2">
        <div className="flex flex-col gap-0.5">
          {mainItems.map(item => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded transition-colors"
                style={{
                  color: active ? "white" : "var(--steel-400)",
                  background: active ? "rgba(242,72,10,0.16)" : "transparent",
                  borderLeft: active ? "2.5px solid var(--signal-500)" : "2.5px solid transparent",
                }}
              >
                <NavIcon id={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* ── Admin items ──────────────────────────────── */}
        {extraItems.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <p
              className="px-3 mb-1.5 font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.25)" }}
            >
              Admin
            </p>
            <div className="flex flex-col gap-0.5">
              {extraItems.map(item => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded transition-colors"
                    style={{
                      color: active ? "white" : "var(--steel-400)",
                      background: active ? "rgba(242,72,10,0.16)" : "transparent",
                      borderLeft: active ? "2.5px solid var(--signal-500)" : "2.5px solid transparent",
                    }}
                  >
                    <NavIcon id={item.icon} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* ── User / Logout ──────────────────────────────── */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded font-bold text-white"
            style={{
              width: 30,
              height: 30,
              fontSize: 11,
              background: "var(--signal-500)",
              clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
            }}
          >
            {initials}
          </div>
          <div className="overflow-hidden">
            <div
              className="font-semibold truncate"
              style={{ fontSize: 12, color: "var(--paper-0)" }}
            >
              {userName}
            </div>
            <div
              className="font-mono uppercase truncate"
              style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", marginTop: 1 }}
            >
              {roles.join(" / ")}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-opacity hover:opacity-70"
          style={{ color: "var(--signal-500)", letterSpacing: "0.1em", fontSize: 10 }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l4-3-4-3M14 8H6" />
          </svg>
          Sair
        </button>
      </div>
    </aside>
  );
}

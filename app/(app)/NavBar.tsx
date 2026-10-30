"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import {
  LEVEL_LABELS,
  MODULE_HOME,
  MODULE_LABELS,
  type EffectiveLevel,
  type ModuleKey,
} from "@/lib/permissions";
import { useState } from "react";
import { LogoBadge } from "./LogoBadge";

type MinLevel = "VIEWER" | "EDITOR" | "SUPERVISOR" | "ADMIN";
const RANK: Record<EffectiveLevel, number> = { VIEWER: 1, EDITOR: 2, SUPERVISOR: 3, ADMIN: 4 };

interface NavLink {
  href: string;
  label: string;
  min?: MinLevel;
  badge?: "pendencias";
  exact?: boolean;
}

const LINKS: Record<ModuleKey, NavLink[]> = {
  ABASTECIMENTO: [
    { href: "/", label: "Visão geral", exact: true },
    { href: "/abastecimentos", label: "Abastecimentos" },
    { href: "/veiculos", label: "Veículos" },
    { href: "/pendencias", label: "Pendências", badge: "pendencias" },
    { href: "/ticket-log", label: "Ticket Log" },
    { href: "/importar", label: "Importar dados", min: "EDITOR" },
    { href: "/metas", label: "Metas" },
    { href: "/exportar", label: "Exportar" },
  ],
  ROTINA: [
    { href: "/rotinas", label: "Check do dia", exact: true },
    { href: "/rotinas/resumo", label: "Resumo" },
    { href: "/rotinas/configurar", label: "Configurar rotinas", min: "SUPERVISOR" },
  ],
};

const SUBTITLE: Record<ModuleKey, string> = {
  ABASTECIMENTO: "controle de consumo & quilometragem",
  ROTINA: "check diário das atividades da equipe",
};

function moduleOfPath(path: string): ModuleKey | null {
  if (path.startsWith("/rotinas")) return "ROTINA";
  if (path.startsWith("/usuarios") || path.startsWith("/sem-acesso")) return null;
  return "ABASTECIMENTO";
}

export function NavBar({
  user,
  modules,
  levels,
  pendenciasCount,
}: {
  user: { name: string; role: Role };
  modules: ModuleKey[];
  levels: Record<ModuleKey, EffectiveLevel | null>;
  pendenciasCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === "MASTER";

  const current = moduleOfPath(pathname);
  const active: ModuleKey | null = current && modules.includes(current) ? current : (modules[0] ?? null);

  const links: NavLink[] = active
    ? LINKS[active].filter((l) => {
        const lvl = levels[active];
        return lvl !== null && (!l.min || RANK[lvl] >= RANK[l.min]);
      })
    : [];
  if (isAdmin) links.push({ href: "/usuarios", label: "Usuários e acessos" });

  const levelLabel = isAdmin
    ? ROLE_LABELS.MASTER
    : active && levels[active] && levels[active] !== "ADMIN"
      ? `${MODULE_LABELS[active]}: ${LEVEL_LABELS[levels[active] as keyof typeof LEVEL_LABELS]}`
      : ROLE_LABELS[user.role];

  function isActive(link: NavLink) {
    return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(link.href + "/");
  }

  return (
    <header className="border-b border-brand-100 bg-white">
      <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="leading-tight">
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              {active === "ROTINA" ? (
                <>
                  Check de <span className="text-brand-600">Rotina</span>
                </>
              ) : (
                <>
                  Controle de <span className="text-brand-600">Abastecimento</span>
                </>
              )}
            </span>
            <p className="hidden text-xs text-slate-400 sm:block">{active ? SUBTITLE[active] : "central da operação"}</p>
          </div>
          <LogoBadge />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{levelLabel}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sair
          </button>
          <button
            className="rounded-md border border-slate-300 p-2 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {modules.length > 1 && (
        <div className="mx-auto flex w-full max-w-[1800px] gap-1 px-4 pb-2 sm:px-6 lg:px-8" role="tablist" aria-label="Módulos">
          {modules.map((m) => (
            <Link
              key={m}
              href={MODULE_HOME[m]}
              role="tab"
              aria-selected={m === active}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                m === active
                  ? "border-brand-600 bg-brand-50 text-brand-800"
                  : "border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              {MODULE_LABELS[m]}
            </Link>
          ))}
        </div>
      )}

      <nav className="hidden gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:px-6 lg:flex lg:px-8">
        {links.map((link) => {
          const on = isActive(link);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                on ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {link.label}
              {link.badge === "pendencias" && pendenciasCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    on ? "bg-white/25 text-white" : "bg-red-100 text-red-700"
                  }`}
                >
                  {pendenciasCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-brand-100 px-4 py-2 lg:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 ${
                isActive(link) ? "bg-brand-50 text-brand-800" : "text-slate-700"
              }`}
            >
              {link.label}
              {link.badge === "pendencias" && pendenciasCount > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">
                  {pendenciasCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

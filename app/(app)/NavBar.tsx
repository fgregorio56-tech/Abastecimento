"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { useState } from "react";
import { LogoBadge } from "./LogoBadge";

const LINKS: { href: string; label: string; roles?: Role[]; badge?: "pendencias" }[] = [
  { href: "/", label: "Visão geral" },
  { href: "/abastecimentos", label: "Abastecimentos" },
  { href: "/veiculos", label: "Veículos" },
  { href: "/pendencias", label: "Pendências", badge: "pendencias" },
  { href: "/ticket-log", label: "Ticket Log" },
  { href: "/importar", label: "Importar dados", roles: ["MASTER", "EDITOR"] },
  { href: "/metas", label: "Metas" },
  { href: "/exportar", label: "Exportar" },
  { href: "/usuarios", label: "Usuários", roles: ["MASTER"] },
];

export function NavBar({
  user,
  pendenciasCount,
}: {
  user: { name: string; role: Role };
  pendenciasCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = LINKS.filter((l) => !l.roles || l.roles.includes(user.role));

  return (
    <header className="border-b border-brand-100 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="leading-tight">
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Controle de <span className="text-brand-600">Abastecimento</span>
            </span>
            <p className="hidden text-xs text-slate-400 sm:block">controle de consumo &amp; quilometragem</p>
          </div>
          <LogoBadge />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
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

      <nav className="hidden gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:px-6 lg:flex lg:px-8">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {link.label}
              {link.badge === "pendencias" && pendenciasCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    active ? "bg-white/25 text-white" : "bg-red-100 text-red-700"
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
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
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

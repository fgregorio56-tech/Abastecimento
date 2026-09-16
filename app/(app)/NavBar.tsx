"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { useState } from "react";

const LINKS: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/", label: "Painel" },
  { href: "/abastecimentos", label: "Abastecimentos" },
  { href: "/importar", label: "Importar", roles: ["MASTER", "EDITOR"] },
  { href: "/veiculos", label: "Veículos" },
  { href: "/metas", label: "Metas" },
  { href: "/exportar", label: "Exportar" },
  { href: "/usuarios", label: "Usuários", roles: ["MASTER"] },
];

export function NavBar({ user }: { user: { name: string; role: Role } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = LINKS.filter((l) => !l.roles || l.roles.includes(user.role));

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-slate-900">⛽ Abastecimento</span>
          <nav className="hidden gap-1 md:flex">
            {links.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
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
            className="rounded-md border border-slate-300 p-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-2 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

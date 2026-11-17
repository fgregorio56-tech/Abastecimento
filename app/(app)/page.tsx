import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  canView,
  isAdmin,
  visibleModules,
  MODULE_DESCRIPTIONS,
  MODULE_HOME,
  MODULE_ICONS,
  MODULE_LABELS,
} from "@/lib/permissions";

/** Portal: página inicial com um cartão por módulo liberado para o usuário. */
export default async function PortalPage() {
  const user = await requireUser();
  const modules = visibleModules(user);
  const admin = isAdmin(user);
  if (modules.length === 0 && !admin) redirect("/sem-acesso");

  const pendencias = canView(user, "ABASTECIMENTO")
    ? (
        await Promise.all([
          prisma.fuelRecord.count({ where: { hasError: true } }),
          prisma.vehicle.count({ where: { ativo: true, OR: [{ marca: null }, { modelo: null }] } }),
        ])
      ).reduce((a, b) => a + b, 0)
    : 0;

  const cards = [
    ...modules.map((m) => ({
      href: MODULE_HOME[m],
      icon: MODULE_ICONS[m],
      label: MODULE_LABELS[m],
      description: MODULE_DESCRIPTIONS[m],
      badge: m === "ABASTECIMENTO" && pendencias > 0 ? `${pendencias} pendência(s)` : null,
    })),
    ...(admin
      ? [
          {
            href: "/usuarios",
            icon: "👥",
            label: "Usuários e acessos",
            description: "Cadastre usuários e defina o acesso de cada um aos módulos.",
            badge: null,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {user.name || "bem-vindo"}</h1>
        <p className="text-sm text-slate-500">Escolha um módulo para começar.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex flex-col gap-2 rounded-xl border border-brand-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl" aria-hidden>
                {c.icon}
              </span>
              {c.badge && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{c.badge}</span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-brand-700">{c.label}</h2>
            <p className="text-sm text-slate-500">{c.description}</p>
            <span className="mt-auto text-sm font-medium text-brand-600">Abrir →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

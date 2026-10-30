import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canView, isAdmin, visibleModules } from "@/lib/permissions";
import { NavBar } from "./NavBar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const verAbastecimento = canView(user, "ABASTECIMENTO");

  // As contagens de pendências só interessam a quem acessa o Abastecimento.
  const [errorCount, incompleteVehicleCount] = verAbastecimento
    ? await Promise.all([
        prisma.fuelRecord.count({ where: { hasError: true } }),
        prisma.vehicle.count({ where: { ativo: true, OR: [{ marca: null }, { modelo: null }] } }),
      ])
    : [0, 0];

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar
        user={{ name: user.name || user.email, role: user.role }}
        modules={visibleModules(user)}
        levels={{
          ABASTECIMENTO: isAdmin(user) ? "ADMIN" : (user.modulos.ABASTECIMENTO ?? null),
          ROTINA: isAdmin(user) ? "ADMIN" : (user.modulos.ROTINA ?? null),
        }}
        pendenciasCount={errorCount + incompleteVehicleCount}
      />
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

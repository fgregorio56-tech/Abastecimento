import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NavBar } from "./NavBar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const [errorCount, incompleteVehicleCount] = await Promise.all([
    prisma.fuelRecord.count({ where: { hasError: true } }),
    prisma.vehicle.count({ where: { ativo: true, OR: [{ marca: null }, { modelo: null }] } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar
        user={{ name: user.name ?? user.email ?? "Usuário", role: user.role }}
        pendenciasCount={errorCount + incompleteVehicleCount}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

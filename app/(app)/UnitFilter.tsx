"use client";

import { useRouter, usePathname } from "next/navigation";
import { UNIDADES } from "@/lib/roles";

export function UnitFilter({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function onChange(value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set("unidade", value);
    else params.delete("unidade");
    params.delete("pagina");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      defaultValue={initialValue}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
    >
      <option value="">Todas as unidades</option>
      {UNIDADES.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

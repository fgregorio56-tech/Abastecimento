"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { somarDias } from "@/lib/rotinas-shared";

/** Navegação de data (‹ data › Hoje) que grava a data em ?data=AAAA-MM-DD. */
export function DateNav({ dia, hoje }: { dia: string; hoje: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function ir(novo: string) {
    if (!novo) return;
    const sp = new URLSearchParams(searchParams.toString());
    if (novo === hoje) sp.delete("data");
    else sp.set("data", novo);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const btn = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" aria-label="Dia anterior" onClick={() => ir(somarDias(dia, -1))} className={btn}>
        ‹
      </button>
      <input
        type="date"
        aria-label="Data"
        value={dia}
        onChange={(e) => ir(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
      />
      <button type="button" aria-label="Próximo dia" onClick={() => ir(somarDias(dia, 1))} className={btn}>
        ›
      </button>
      {dia !== hoje && (
        <button type="button" onClick={() => ir(hoje)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
          Hoje
        </button>
      )}
    </div>
  );
}

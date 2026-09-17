"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";

const MESES_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatMonth(mes: string) {
  const [ano, mm] = mes.split("-");
  return `${MESES_PT[Number(mm) - 1]}/${ano}`;
}

export function PeriodFilter({
  availableMonths,
  selectedMonths,
}: {
  availableMonths: string[];
  selectedMonths: string[] | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const isAll = selectedMonths === null;
  const [draft, setDraft] = useState<Set<string>>(new Set(selectedMonths ?? availableMonths));

  const byYear = new Map<string, string[]>();
  for (const m of availableMonths) {
    const year = m.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(m);
  }

  function apply(months: string[] | null) {
    const params = new URLSearchParams();
    if (months !== null) {
      for (const m of months) params.append("mes", m);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function toggle(month: string) {
    const next = new Set(draft);
    if (next.has(month)) next.delete(month);
    else next.add(month);
    setDraft(next);
  }

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Período</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(new Set(availableMonths));
              apply(null);
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              isAll ? "bg-brand-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Todo o período
          </button>
          <button
            type="button"
            onClick={() => apply([...draft])}
            disabled={isPending || draft.size === 0}
            className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Aplicar seleção
          </button>
        </div>
      </div>

      {availableMonths.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum abastecimento importado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {[...byYear.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([year, months]) => (
              <div key={year} className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-semibold text-slate-500">{year}</span>
                {months.map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => toggle(m)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      draft.has(m)
                        ? "bg-brand-100 text-brand-800 ring-1 ring-brand-400"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {formatMonth(m)}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

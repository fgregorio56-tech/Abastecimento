"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditableRow, type RowData } from "./EditableRow";
import { deleteMultipleFuelRecords } from "./actions";

export function FuelRecordsTable({ rows, canEdit }: { rows: RowData[]; canEdit: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} abastecimento(s) selecionado(s)? Essa ação não pode ser desfeita.`)) {
      return;
    }
    startTransition(async () => {
      await deleteMultipleFuelRecords([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  const colSpan = canEdit ? 10 : 8;

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
      {canEdit && selected.size > 0 && (
        <div className="flex items-center justify-between border-b border-brand-100 bg-brand-50 px-3 py-2">
          <span className="text-sm font-medium text-brand-800">{selected.size} selecionado(s)</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white"
            >
              Limpar seleção
            </button>
            <button
              onClick={bulkDelete}
              disabled={isPending}
              className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              Excluir selecionados
            </button>
          </div>
        </div>
      )}
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-brand-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            {canEdit && (
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
            )}
            <th className="px-3 py-2">Placa</th>
            <th className="px-3 py-2">Data</th>
            <th className="px-3 py-2 text-right">KM</th>
            <th className="px-3 py-2 text-right">Litros</th>
            <th className="px-3 py-2">Combustível</th>
            <th className="px-3 py-2">Origem</th>
            <th className="px-3 py-2">Posto</th>
            <th className="px-3 py-2">Situação</th>
            {canEdit && <th className="px-3 py-2">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-slate-500">
                Nenhum abastecimento encontrado.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <EditableRow
              key={r.id}
              row={r}
              canEdit={canEdit}
              selected={selected.has(r.id)}
              onToggleSelect={canEdit ? toggle : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

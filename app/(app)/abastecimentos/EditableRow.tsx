"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteFuelRecord, updateFuelRecord } from "./actions";
import { ERROR_LABELS } from "@/lib/validation";
import { formatDate, formatKm, formatLitros } from "@/lib/format";

export interface RowData {
  id: string;
  placaTexto: string;
  data: string | null; // ISO
  km: number | null;
  litros: number | null;
  combustivel: string;
  posto: string | null;
  hasError: boolean;
  errors: string[];
  corrected: boolean;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function EditableRow({ row, canEdit }: { row: RowData; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [placa, setPlaca] = useState(row.placaTexto);
  const [data, setData] = useState(toDateInputValue(row.data));
  const [km, setKm] = useState(row.km?.toString() ?? "");
  const [litros, setLitros] = useState(row.litros?.toString() ?? "");

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateFuelRecord(row.id, { placa, data, km, litros });
      if (!result.ok) {
        setError(result.error ?? "Erro ao salvar.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Excluir o abastecimento de ${row.placaTexto}?`)) return;
    startTransition(async () => {
      await deleteFuelRecord(row.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-slate-100 bg-amber-50">
        <td className="py-2 pr-2">
          <input
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            className="w-24 rounded border border-slate-300 px-2 py-1 text-sm uppercase"
          />
        </td>
        <td className="py-2 pr-2">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-36 rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-2">
          <input
            value={km}
            onChange={(e) => setKm(e.target.value)}
            inputMode="decimal"
            className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm"
          />
        </td>
        <td className="py-2 pr-2">
          <input
            value={litros}
            onChange={(e) => setLitros(e.target.value)}
            inputMode="decimal"
            className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm"
          />
        </td>
        <td className="py-2 pr-2 text-slate-500">{row.combustivel}</td>
        <td className="py-2 pr-2 text-slate-500">{row.posto ?? "—"}</td>
        <td className="py-2 pr-2 text-xs text-red-600">
          {error}
        </td>
        <td className="flex gap-2 py-2 pr-2">
          <button
            onClick={save}
            disabled={isPending}
            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Salvar
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={isPending}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-slate-100 ${row.hasError ? "bg-red-50/60" : ""}`}>
      <td className="py-2 pr-2 font-medium text-slate-900">{row.placaTexto || "—"}</td>
      <td className="py-2 pr-2 text-slate-600">{formatDate(row.data ? new Date(row.data) : null)}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-600">{formatKm(row.km)}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-600">{formatLitros(row.litros)}</td>
      <td className="py-2 pr-2 text-slate-500">{row.combustivel}</td>
      <td className="py-2 pr-2 text-slate-500">{row.posto ?? "—"}</td>
      <td className="py-2 pr-2">
        {row.hasError ? (
          <div className="flex flex-wrap gap-1">
            {row.errors.map((code) => (
              <span
                key={code}
                className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                title={code}
              >
                {ERROR_LABELS[code] ?? code}
              </span>
            ))}
          </div>
        ) : row.corrected ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Corrigido
          </span>
        ) : (
          <span className="text-xs text-slate-400">OK</span>
        )}
      </td>
      {canEdit && (
        <td className="flex gap-2 py-2 pr-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Editar
          </button>
          <button
            onClick={remove}
            disabled={isPending}
            className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Excluir
          </button>
        </td>
      )}
    </tr>
  );
}

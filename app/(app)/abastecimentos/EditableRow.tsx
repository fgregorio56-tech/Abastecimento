"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteFuelRecord, updateFuelRecord } from "./actions";
import { ERROR_LABELS } from "@/lib/validation";
import { formatDate, formatKm, formatLitros, formatMedia } from "@/lib/format";
import { FUEL_TYPES, FUEL_TYPE_LABELS, ORIGENS, ORIGEM_LABELS } from "@/lib/roles";

export interface RowData {
  id: string;
  placaTexto: string;
  data: string | null; // ISO
  km: number | null;
  kmAnterior: number | null;
  /** Sobrescrita manual do KM anterior, se houver (para preencher a edição). */
  kmAnteriorManual: number | null;
  kmRodado: number | null;
  media: number | null;
  litros: number | null;
  combustivel: string;
  origem: string;
  motorista: string | null;
  posto: string | null;
  hasError: boolean;
  errors: string[];
  corrected: boolean;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function EditableRow({
  row,
  canEdit,
  selected = false,
  onToggleSelect,
}: {
  row: RowData;
  canEdit: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [placa, setPlaca] = useState(row.placaTexto);
  const [data, setData] = useState(toDateInputValue(row.data));
  const [km, setKm] = useState(row.km?.toString() ?? "");
  const [kmAnterior, setKmAnterior] = useState(row.kmAnteriorManual?.toString() ?? "");
  const [litros, setLitros] = useState(row.litros?.toString() ?? "");
  const [combustivel, setCombustivel] = useState(row.combustivel);
  const [origem, setOrigem] = useState(row.origem);
  const [motorista, setMotorista] = useState(row.motorista ?? "");

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateFuelRecord(row.id, {
        placa,
        data,
        km,
        kmAnterior,
        litros,
        combustivel,
        origem,
        motorista,
      });
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
        {onToggleSelect && (
          <td className="py-2 pr-2">
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(row.id)} />
          </td>
        )}
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
            value={kmAnterior}
            onChange={(e) => setKmAnterior(e.target.value)}
            placeholder={row.kmAnterior?.toString() ?? "—"}
            inputMode="decimal"
            title="Deixe em branco para calcular automaticamente pelo abastecimento anterior"
            className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm"
          />
        </td>
        <td className="py-2 pr-2 text-right tabular-nums text-slate-500">{formatKm(row.kmRodado)}</td>
        <td className="py-2 pr-2 text-right tabular-nums text-slate-500">{formatMedia(row.media)}</td>
        <td className="py-2 pr-2">
          <input
            value={litros}
            onChange={(e) => setLitros(e.target.value)}
            inputMode="decimal"
            className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm"
          />
        </td>
        <td className="py-2 pr-2">
          <select
            value={combustivel}
            onChange={(e) => setCombustivel(e.target.value)}
            className="rounded border border-slate-300 px-1 py-1 text-xs"
          >
            {FUEL_TYPES.map((t) => (
              <option key={t} value={t}>
                {FUEL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 pr-2">
          <select
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            className="rounded border border-slate-300 px-1 py-1 text-xs"
          >
            {ORIGENS.map((o) => (
              <option key={o} value={o}>
                {ORIGEM_LABELS[o]}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 pr-2 text-xs text-red-600">
          {error}
        </td>
        <td className="py-2 pr-2">
          <input
            value={motorista}
            onChange={(e) => setMotorista(e.target.value)}
            className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-2 text-slate-500">{row.posto ?? "—"}</td>
        <td className="sticky right-0 border-l border-slate-200 bg-amber-50 py-2 pl-2 pr-2 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.15)]">
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={isPending}
              className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
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
          </div>
        </td>
      </tr>
    );
  }

  const rowBg = row.hasError ? "bg-red-50" : selected ? "bg-brand-50" : "bg-white";

  return (
    <tr className={`border-b border-slate-100 ${rowBg}`}>
      {onToggleSelect && (
        <td className="py-2 pr-2">
          <input type="checkbox" checked={selected} onChange={() => onToggleSelect(row.id)} />
        </td>
      )}
      <td className="py-2 pr-2 font-medium text-slate-900">{row.placaTexto || "—"}</td>
      <td className="py-2 pr-2 text-slate-600">{formatDate(row.data ? new Date(row.data) : null)}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-600">{formatKm(row.km)}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-600">
        {formatKm(row.kmAnterior)}
        {row.kmAnteriorManual !== null && (
          <span className="ml-1 text-brand-600" title="KM anterior definido manualmente">
            ✎
          </span>
        )}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-600">{formatKm(row.kmRodado)}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-600">{formatMedia(row.media)}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-600">{formatLitros(row.litros)}</td>
      <td className="py-2 pr-2 text-slate-500">{FUEL_TYPE_LABELS[row.combustivel as keyof typeof FUEL_TYPE_LABELS] ?? row.combustivel}</td>
      <td className="py-2 pr-2">
        <span
          className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
            row.origem === "INTERNO" ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-600"
          }`}
        >
          {ORIGEM_LABELS[row.origem as keyof typeof ORIGEM_LABELS] ?? row.origem}
        </span>
      </td>
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
      <td className="py-2 pr-2 text-slate-500">{row.motorista ?? "—"}</td>
      <td className="py-2 pr-2 text-slate-500">{row.posto ?? "—"}</td>
      {canEdit && (
        <td
          className={`sticky right-0 border-l border-slate-200 py-2 pl-2 pr-2 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.15)] ${rowBg}`}
        >
          <div className="flex gap-2">
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
          </div>
        </td>
      )}
    </tr>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setManualGoal } from "./actions";
import { formatKm, formatMedia } from "@/lib/format";
import type { GoalResult } from "@/lib/goals";

export function GoalRow({
  goal,
  info,
  canEdit,
}: {
  goal: GoalResult;
  info: { marca: string | null; modelo: string | null; anoModelo: number | null; kmAtual: number | null };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(goal.origem === "manual" && goal.metaFinal ? String(goal.metaFinal) : "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setManualGoal(goal.vehicleId, value);
      if (!result.ok) {
        setError(result.error ?? "Erro ao salvar.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function resetToCalculated() {
    startTransition(async () => {
      await setManualGoal(goal.vehicleId, "");
      setValue("");
      setEditing(false);
      router.refresh();
    });
  }

  // diferencaPercentual > 0 significa média atual acima da meta (mais km/l = melhor).
  const diffTone =
    goal.diferencaPercentual === null
      ? "text-slate-400"
      : goal.diferencaPercentual >= 0
        ? "text-[#0ca30c]"
        : "text-[#d03b3b]";

  return (
    <tr className="border-b border-slate-100">
      <td className="px-3 py-2 font-medium text-slate-900">{goal.placa}</td>
      <td className="px-3 py-2 text-slate-600">
        {[info.marca, info.modelo, info.anoModelo].filter(Boolean).join(" ") || "—"}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatKm(info.kmAtual)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatMedia(goal.mediaAtual)}</td>
      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={goal.metaCalculada?.toFixed(2) ?? "—"}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm"
            />
            <span className="text-xs text-slate-400">km/l</span>
          </div>
        ) : (
          formatMedia(goal.metaFinal)
        )}
      </td>
      <td className={`px-3 py-2 text-right tabular-nums font-medium ${diffTone}`}>
        {goal.diferencaPercentual === null ? "—" : `${goal.diferencaPercentual > 0 ? "+" : ""}${goal.diferencaPercentual}%`}
      </td>
      <td className="px-3 py-2 text-xs text-slate-500">
        {goal.origem === "manual" && "Manual"}
        {goal.origem === "grupo_marca_modelo" && "Grupo (marca/modelo)"}
        {goal.origem === "media_frota" && "Média da frota"}
        {goal.origem === "indisponivel" && "Sem dados"}
      </td>
      {canEdit && (
        <td className="px-3 py-2">
          {editing ? (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <button onClick={save} disabled={isPending} className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  Salvar
                </button>
                <button onClick={() => setEditing(false)} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                Ajustar
              </button>
              {goal.origem === "manual" && (
                <button onClick={resetToCalculated} disabled={isPending} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50">
                  Usar cálculo
                </button>
              )}
            </div>
          )}
        </td>
      )}
    </tr>
  );
}

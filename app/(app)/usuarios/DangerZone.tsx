"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { wipeDatabase } from "./actions";

const CONFIRM_TEXT = "LIMPAR TUDO";

export function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await wipeDatabase(value);
      if (!res.ok) {
        setError(res.error ?? "Erro ao limpar a base.");
        return;
      }
      setResult(
        `Base limpa: ${res.deleted?.fuelRecords ?? 0} abastecimento(s) e ${res.deleted?.vehicles ?? 0} veículo(s) removidos.`,
      );
      setValue("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-sm font-semibold text-red-800">Zona de perigo</h2>
      <p className="mt-1 text-sm text-red-700">
        Apaga <strong>todos</strong> os abastecimentos, lotes de importação e veículos cadastrados —
        útil para recomeçar os testes do zero. Usuários e o Ticket Log são preservados (a própria
        limpeza fica registrada no log). Essa ação não pode ser desfeita.
      </p>

      {result && <p className="mt-3 text-sm font-medium text-emerald-700">{result}</p>}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Limpar toda a base
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Digite "${CONFIRM_TEXT}" para confirmar`}
            className="w-64 rounded-lg border border-red-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={isPending || value.trim() !== CONFIRM_TEXT}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "Limpando..." : "Confirmar exclusão total"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setValue("");
                setError(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

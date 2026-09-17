"use client";

import { useActionState } from "react";
import { processImport, type ImportState } from "./actions";

const initialState: ImportState = { ok: true };

export function UploadForm() {
  const [state, formAction, pending] = useActionState(processImport, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="arquivo" className="block text-sm font-medium text-slate-700">
          Planilha de abastecimentos (.xlsx, .xls ou .csv)
        </label>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          accept=".xlsx,.xls,.csv"
          required
          className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Importando..." : "Importar planilha"}
      </button>
    </form>
  );
}

import { requireRole } from "@/lib/session";
import { UploadForm } from "./UploadForm";

export default async function ImportarPage() {
  await requireRole("MASTER", "EDITOR");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importar abastecimentos</h1>
        <p className="text-sm text-slate-500">
          Envie a planilha da base de abastecimentos. As colunas são reconhecidas
          automaticamente pelo nome (placa, data, km, litros, valor, posto, combustível,
          motorista, marca, modelo, ano).
        </p>
      </div>

      <div className="max-w-xl rounded-xl border border-brand-100 bg-white p-6">
        <UploadForm />
      </div>

      <div className="max-w-xl rounded-xl border border-brand-100 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Dicas para uma boa importação</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>A primeira linha da planilha deve conter os nomes das colunas.</li>
          <li>
            Colunas obrigatórias: <strong>placa</strong>, <strong>data</strong>,{" "}
            <strong>km</strong> e <strong>litros</strong>.
          </li>
          <li>Veículos novos (placas não cadastradas) são criados automaticamente.</li>
          <li>
            Depois de importar, os registros com erro (placa, data, km ou litragem
            inválidos) ficam sinalizados na tela de Abastecimentos para correção.
          </li>
        </ul>
      </div>
    </div>
  );
}

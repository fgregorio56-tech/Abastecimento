import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-brand-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-5">
          <Image src="/logo-retec.png" alt="Retec" width={96} height={38} className="h-8 w-auto" priority />
          <div className="h-8 w-px bg-brand-100" />
          <Image src="/logo-gvc.png" alt="Grupo GVC" width={124} height={64} className="h-10 w-auto" priority />
        </div>

        <h1 className="text-center text-xl font-bold text-slate-900">
          Controle de <span className="text-brand-600">Abastecimento</span>
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Gestão e análise de abastecimentos da frota
        </p>
        <div className="mt-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

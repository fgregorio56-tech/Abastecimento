// Formato Mercosul: 3 letras + 1 número + 1 letra + 2 números (ex.: ABC1D23).
const MERCOSUL_REGEX = /^[A-Z]{3}\d[A-Z]\d{2}$/;
// Formato antigo (pré-Mercosul): 3 letras + 4 números (ex.: ABC1234).
const ANTIGA_REGEX = /^[A-Z]{3}\d{4}$/;

function FlagDot() {
  return (
    <svg width="7" height="7" viewBox="0 0 8 8" aria-hidden className="shrink-0">
      <circle cx="4" cy="4" r="4" fill="#009c3b" />
      <polygon points="4,1.1 6.9,4 4,6.9 1.1,4" fill="#ffdf00" />
      <circle cx="4" cy="4" r="1.3" fill="#002776" />
    </svg>
  );
}

/**
 * Renderiza a placa do veículo como uma placa física real — Mercosul
 * (faixa azul "BRASIL" + fonte condensada) se o formato bater com o padrão
 * atual (LLL#L##), ou placa cinza do modelo anterior (LLL####) caso
 * contrário. Formatos que não batem com nenhum padrão (placa incompleta ou
 * mal importada) caem no visual antigo, só pra não quebrar o layout.
 */
export function LicensePlate({ placa, className = "" }: { placa: string | null | undefined; className?: string }) {
  const clean = (placa ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!clean) {
    return (
      <span
        className={`inline-flex h-[30px] w-[108px] items-center justify-center rounded-[5px] border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-400 ${className}`}
      >
        sem placa
      </span>
    );
  }

  const isMercosul = MERCOSUL_REGEX.test(clean);
  const isAntiga = ANTIGA_REGEX.test(clean);

  if (isMercosul) {
    return (
      <span
        className={`inline-flex w-[108px] flex-col overflow-hidden rounded-[5px] border-[1.5px] border-slate-900 bg-white shadow-sm ${className}`}
      >
        <span className="flex h-[13px] items-center justify-center gap-1 bg-[#0033a0]">
          <FlagDot />
          <span className="text-[7px] font-bold tracking-[0.15em] text-white">BRASIL</span>
        </span>
        <span className="py-[2px] text-center font-mono text-[16px] font-extrabold leading-tight tracking-[0.1em] text-slate-900">
          {clean}
        </span>
      </span>
    );
  }

  // Placa antiga (ou formato não reconhecido): visual cinza do modelo anterior.
  const display = isAntiga ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
  return (
    <span
      className={`inline-flex w-[108px] flex-col overflow-hidden rounded-[5px] border-[1.5px] border-slate-900 bg-gradient-to-b from-slate-100 to-slate-300 shadow-sm ${className}`}
    >
      <span className="flex h-[10px] items-center justify-center bg-slate-200/80">
        <span className="text-[6px] font-semibold tracking-[0.12em] text-slate-500">BRASIL</span>
      </span>
      <span className="py-[2px] text-center font-mono text-[16px] font-extrabold leading-tight tracking-[0.06em] text-slate-900">
        {display}
      </span>
    </span>
  );
}

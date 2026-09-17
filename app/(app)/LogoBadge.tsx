import Image from "next/image";

/**
 * Logos dos grupos parceiros no cabeçalho.
 * RETEC já usa o arquivo real (public/logo-retec.png). Grupo GVC segue como
 * placeholder textual até o arquivo de imagem ser incorporado em /public.
 */
export function LogoBadge() {
  return (
    <div className="hidden items-center gap-3 border-l border-brand-100 pl-3 sm:flex">
      <Image src="/logo-retec.png" alt="Retec" width={72} height={29} className="h-6 w-auto" priority />
      <span className="flex flex-col leading-none" title="Grupo GVC">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Grupo</span>
        <span className="text-sm font-extrabold tracking-tight" style={{ color: "#00a99d" }}>
          GVC
        </span>
      </span>
    </div>
  );
}

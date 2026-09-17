/**
 * Espaço reservado para as logos dos grupos parceiros no cabeçalho.
 * Placeholder textual nas cores da marca até os arquivos de imagem
 * (RETEC e Grupo GVC) serem incorporados em /public.
 */
export function LogoBadge() {
  return (
    <div className="hidden items-center gap-3 border-l border-brand-100 pl-3 sm:flex">
      <span
        className="rounded-md px-2 py-1 text-xs font-extrabold tracking-wide text-white"
        style={{ backgroundColor: "#2f7a4f" }}
        title="Retec"
      >
        RETEC
      </span>
      <span className="flex flex-col leading-none" title="Grupo GVC">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Grupo</span>
        <span className="text-sm font-extrabold tracking-tight" style={{ color: "#00a99d" }}>
          GVC
        </span>
      </span>
    </div>
  );
}

import Image from "next/image";

/** Logos dos grupos parceiros no cabeçalho (RETEC e Grupo GVC). */
export function LogoBadge() {
  return (
    <div className="hidden items-center gap-4 border-l border-brand-100 pl-3 sm:flex">
      <Image src="/logo-retec.png" alt="Retec" width={72} height={29} className="h-6 w-auto" priority />
      <Image src="/logo-gvc.png" alt="Grupo GVC" width={94} height={49} className="h-8 w-auto" priority />
    </div>
  );
}

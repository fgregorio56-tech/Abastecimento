export const ROLES = ["MASTER", "EDITOR", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  MASTER: "Mestre",
  EDITOR: "Editor",
  VIEWER: "Visualizador",
};

export function canManageUsers(role?: string | null) {
  return role === "MASTER";
}

export function canEditData(role?: string | null) {
  return role === "MASTER" || role === "EDITOR";
}

export const FUEL_TYPES = [
  "DIESEL",
  "DIESEL_S10",
  "GASOLINA",
  "ETANOL",
  "GNV",
  "ARLA",
  "LUBRIFICANTE",
  "OUTRO",
] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  DIESEL: "Diesel",
  DIESEL_S10: "Diesel S10",
  GASOLINA: "Gasolina",
  ETANOL: "Etanol",
  GNV: "GNV",
  ARLA: "Arla 32",
  LUBRIFICANTE: "Lubrificante",
  OUTRO: "Outro",
};

/** Tipos que não representam combustível de propulsão — não entram no cálculo de km/l. */
export const PRODUTOS_FORA_DO_KML: FuelType[] = ["ARLA", "LUBRIFICANTE"];

export function contaParaMedia(combustivel: string): boolean {
  return !PRODUTOS_FORA_DO_KML.includes(combustivel as FuelType);
}

export const ORIGENS = ["EXTERNO", "INTERNO"] as const;
export type Origem = (typeof ORIGENS)[number];

export const ORIGEM_LABELS: Record<Origem, string> = {
  EXTERNO: "Externo (posto)",
  INTERNO: "Interno (frota)",
};

/** Unidades/filiais da frota (lista fechada). */
export const UNIDADES = [
  "RETEC SIMOES FILHO",
  "RETEC JUAZEIRO",
  "RETEC OESTE",
  "CVR ALTO SERTAO",
  "CVR OESTE",
  "CVR SAO FRANCISCO",
];

/** Sugestões de tipo de veículo (lista aberta — qualquer texto é aceito). */
export const TIPOS_VEICULO_SUGERIDOS = [
  "¾",
  "Toco",
  "Truck",
  "Carreta",
  "VUC",
  "HR",
  "Fiorino",
  "Poliguindaste",
  "Utilitário",
  "Passeio",
];

export const ACTIVITY_TYPES = [
  "IMPORTACAO",
  "CORRECAO",
  "EXCLUSAO",
  "VEICULO",
  "META",
  "USUARIO",
  "SISTEMA",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  IMPORTACAO: "Importação",
  CORRECAO: "Correção",
  EXCLUSAO: "Exclusão",
  VEICULO: "Veículo",
  META: "Meta",
  USUARIO: "Usuário",
  SISTEMA: "Sistema",
};

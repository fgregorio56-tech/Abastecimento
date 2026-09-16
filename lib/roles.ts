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
  OUTRO: "Outro",
};

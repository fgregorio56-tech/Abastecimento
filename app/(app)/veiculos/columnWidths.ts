// Larguras fixas de coluna (table-layout: fixed), compartilhadas entre
// /veiculos e a tabela de veículos incompletos em /pendencias — evita que
// colunas com texto mais longo (Unidade) espremam as vizinhas (Situação)
// até o rótulo do cabeçalho ficar escondido atrás da coluna de Ações fixa.
//
// Fica num módulo separado (sem "use client") porque VehicleRow.tsx é um
// Client Component: uma constante exportada de um arquivo "use client" não
// chega com seu valor real quando importada por um Server Component.
export const VEHICLE_COL_WIDTHS = {
  placa: 100,
  marca: 110,
  modelo: 110,
  anoModelo: 120,
  anoFabricacao: 150,
  tipo: 90,
  capacidade: 120,
  unidade: 140,
  kmAtual: 100,
  media: 130,
  situacao: 110,
  acoes: 150,
};

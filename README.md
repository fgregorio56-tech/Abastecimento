# Abastecimento — Gestão e Análise de Frota

Aplicação web para controlar e analisar os abastecimentos de uma frota de
veículos: importação de planilhas, correção de erros, indicadores de
consumo, ranking de veículos e metas de média por veículo.

## Funcionalidades

- **Usuários e permissões**: um usuário **Mestre** cria e gerencia usuários
  **Editor** (importa e corrige dados) e **Visualizador** (apenas consulta).
- **Importação**: upload de planilhas `.xlsx`/`.xls`/`.csv` com reconhecimento
  automático de colunas (placa, data, km, litros, valor, posto, combustível,
  motorista, marca, modelo, ano). Veículos novos são criados automaticamente.
- **Validação automática**: cada abastecimento é validado (placa, data, km,
  litragem, duplicidade, KM regressivo, salto de KM incoerente) e os
  registros com erro ficam sinalizados para correção manual.
- **Correção**: edição in-line de placa, data, km e litragem diretamente na
  tela de Abastecimentos, com revalidação automática.
- **Painel de análise**: filtro por todo o período, um mês ou vários meses;
  KM rodado total, litros abastecidos, média geral da frota, gráficos
  mensais e ranking dos melhores/piores veículos por média (km/l).
- **Metas de consumo**: meta sugerida por veículo com base na mediana de
  consumo de veículos semelhantes (marca/modelo), ajustada pela idade do
  veículo e pela quilometragem rodada — sempre editável manualmente.
- **Exportação**: download em `.xlsx` dos abastecimentos já validados,
  filtrando por período.

## Stack

Next.js 16 (App Router) · TypeScript · Prisma + SQLite · NextAuth (Credentials) ·
Tailwind CSS · Recharts · SheetJS (xlsx)

## Como rodar localmente

```bash
npm install
cp .env.example .env   # ajuste NEXTAUTH_SECRET, MASTER_EMAIL e MASTER_PASSWORD
npx prisma migrate deploy
npx prisma db seed      # cria o usuário mestre inicial
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e entre com o e-mail e
senha definidos em `MASTER_EMAIL` / `MASTER_PASSWORD` (padrão em
`.env.example`: troque antes de usar em produção). Depois de logado, crie os
demais usuários em **Usuários**.

Gere um `NEXTAUTH_SECRET` seguro com:

```bash
openssl rand -base64 32
```

## Banco de dados

Por padrão usa SQLite (`prisma/dev.db`, arquivo local, ignorado pelo git).
Para produção, aponte `DATABASE_URL` para um banco Postgres/MySQL e ajuste o
`provider` em `prisma/schema.prisma` (o modelo evita `enum`, então funciona
sem alterações em qualquer um dos provedores compatíveis com o Prisma).

## Scripts

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` / `npm start` — build e execução em produção
- `npm run lint` — checagem de lint
- `npx prisma studio` — explorar o banco de dados
- `npx prisma db seed` — (re)criar o usuário mestre inicial

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
- **Correção**: edição in-line de placa, data, km, litragem, combustível e
  origem (interno/externo) diretamente na tela de Abastecimentos, com
  revalidação automática.
- **Pendências**: tela dedicada que reúne abastecimentos com erro e veículos
  sem cadastro completo (marca/modelo), com contador no menu.
- **Ticket Log**: histórico de todas as importações, correções, exclusões e
  alterações de usuários/veículos/metas feitas no sistema.
- **Painel de análise**: filtro por todo o período, um mês ou vários meses;
  KM rodado (hoje/semana/mês/ano), litros, valor total, consumo interno vs.
  externo, outros produtos (Arla 32, lubrificantes — não entram no cálculo
  de km/l), média da frota (meta x real) e melhores/piores desempenhos.
- **Metas de consumo**: meta sugerida por veículo com base na mediana de
  consumo de veículos semelhantes (marca/modelo), ajustada pela idade do
  veículo e pela quilometragem rodada — sempre editável manualmente.
- **Exportação**: download em `.xlsx` dos abastecimentos já validados,
  filtrando por período.

## Stack

Next.js 16 (App Router) · TypeScript · Prisma + PostgreSQL · NextAuth (Credentials) ·
Tailwind CSS · Recharts · SheetJS (xlsx)

## Como rodar localmente

```bash
npm install
cp .env.example .env   # ajuste DATABASE_URL, NEXTAUTH_SECRET, MASTER_EMAIL e MASTER_PASSWORD
npx prisma migrate deploy
npx prisma db seed      # cria o usuário mestre inicial
npm run dev
```

É necessário ter um banco PostgreSQL acessível (local ou na nuvem) antes de
rodar `prisma migrate deploy` — veja a seção **Banco de dados** abaixo.

Acesse [http://localhost:3000](http://localhost:3000) e entre com o e-mail e
senha definidos em `MASTER_EMAIL` / `MASTER_PASSWORD` (padrão em
`.env.example`: troque antes de usar em produção). Depois de logado, crie os
demais usuários em **Usuários**.

Gere um `NEXTAUTH_SECRET` seguro com:

```bash
openssl rand -base64 32
```

## Banco de dados

Usa PostgreSQL (`DATABASE_URL` no `.env`). Para desenvolvimento local, instale
o Postgres e crie um banco vazio; para produção/hospedagem em nuvem (ex.:
Vercel), use um provedor gerenciado como [Neon](https://neon.tech) (tem plano
gratuito) e cole a connection string fornecida por ele em `DATABASE_URL`.

## Publicar para todo mundo acessar (deploy)

1. Crie um banco Postgres gratuito no [Neon](https://neon.tech) (login com
   GitHub) e copie a "connection string" (começa com `postgresql://...`).
2. Crie uma conta na [Vercel](https://vercel.com) (login com GitHub) e
   importe este repositório (`fgregorio56-tech/Abastecimento`).
3. Em **Environment Variables**, adicione:
   - `DATABASE_URL` — a connection string do Neon
   - `NEXTAUTH_SECRET` — gere com `openssl rand -base64 32`
   - `NEXTAUTH_URL` — a URL pública que a Vercel vai gerar (ex.:
     `https://abastecimento.vercel.app`)
   - `MASTER_EMAIL`, `MASTER_PASSWORD`, `MASTER_NAME` — credenciais do
     usuário mestre inicial
4. Clique em **Deploy**.
5. Depois do primeiro deploy, rode a migração e o seed contra o banco de
   produção (uma única vez), pela sua máquina local com `DATABASE_URL`
   apontando para o Neon:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
6. Acesse a URL gerada pela Vercel e entre com `MASTER_EMAIL` /
   `MASTER_PASSWORD`. Qualquer pessoa com a URL já consegue acessar a tela
   de login — crie os demais usuários (Editor/Visualizador) em **Usuários**.

## Scripts

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` / `npm start` — build e execução em produção
- `npm run lint` — checagem de lint
- `npx prisma studio` — explorar o banco de dados
- `npx prisma db seed` — (re)criar o usuário mestre inicial

## Logos no cabeçalho

O cabeçalho tem um espaço reservado (`app/(app)/LogoBadge.tsx`) para as logos
dos grupos parceiros (RETEC e Grupo GVC), hoje com um selo de texto como
placeholder. Para usar as imagens reais, salve os arquivos em `public/`
(ex.: `public/logo-retec.png`, `public/logo-gvc.png`) e troque o conteúdo de
`LogoBadge.tsx` por `<img src="/logo-retec.png" ... />`.

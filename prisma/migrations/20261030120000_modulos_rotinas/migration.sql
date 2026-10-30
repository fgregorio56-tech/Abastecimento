-- AlterTable
ALTER TABLE "User" ADD COLUMN     "modulos" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "supervisorId" TEXT,
ALTER COLUMN "role" SET DEFAULT 'USUARIO';

-- CreateTable
CREATE TABLE "Rotina" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "local" TEXT,
    "horario" TEXT,
    "frequencia" TEXT NOT NULL DEFAULT 'SEMANAL',
    "diasSemana" INTEGER[],
    "diaMes" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "inicio" DATE NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rotina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotinaRegistro" (
    "id" TEXT NOT NULL,
    "rotinaId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "motivo" TEXT,
    "justificativa" TEXT,
    "responsavelId" TEXT NOT NULL,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotinaRegistro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotinaExtra" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "observacao" TEXT,
    "responsavelId" TEXT NOT NULL,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RotinaExtra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rotina_responsavelId_idx" ON "Rotina"("responsavelId");

-- CreateIndex
CREATE INDEX "RotinaRegistro_data_idx" ON "RotinaRegistro"("data");

-- CreateIndex
CREATE INDEX "RotinaRegistro_responsavelId_idx" ON "RotinaRegistro"("responsavelId");

-- CreateIndex
CREATE UNIQUE INDEX "RotinaRegistro_rotinaId_data_key" ON "RotinaRegistro"("rotinaId", "data");

-- CreateIndex
CREATE INDEX "RotinaExtra_data_idx" ON "RotinaExtra"("data");

-- CreateIndex
CREATE INDEX "RotinaExtra_responsavelId_idx" ON "RotinaExtra"("responsavelId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotina" ADD CONSTRAINT "Rotina_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotina" ADD CONSTRAINT "Rotina_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotinaRegistro" ADD CONSTRAINT "RotinaRegistro_rotinaId_fkey" FOREIGN KEY ("rotinaId") REFERENCES "Rotina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotinaRegistro" ADD CONSTRAINT "RotinaRegistro_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotinaRegistro" ADD CONSTRAINT "RotinaRegistro_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotinaExtra" ADD CONSTRAINT "RotinaExtra_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotinaExtra" ADD CONSTRAINT "RotinaExtra_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dados: converte os perfis antigos para o acesso por módulo, mantendo o que
-- cada um já podia fazer no Abastecimento (o Editor seguia podendo excluir,
-- por isso vira Supervisor do módulo). Ninguém ganha acesso às Rotinas
-- automaticamente: o Administrador libera depois em Usuários.
UPDATE "User" SET "modulos" = '{"ABASTECIMENTO": "SUPERVISOR"}', "role" = 'USUARIO' WHERE "role" = 'EDITOR';
UPDATE "User" SET "modulos" = '{"ABASTECIMENTO": "VIEWER"}', "role" = 'USUARIO' WHERE "role" = 'VIEWER';
UPDATE "User" SET "role" = 'USUARIO' WHERE "role" NOT IN ('MASTER', 'USUARIO');

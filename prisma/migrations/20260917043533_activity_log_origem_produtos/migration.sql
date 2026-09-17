-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FuelRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placaTexto" TEXT NOT NULL,
    "vehicleId" TEXT,
    "data" DATETIME,
    "km" REAL,
    "litros" REAL,
    "valorLitro" REAL,
    "valorTotal" REAL,
    "posto" TEXT,
    "combustivel" TEXT NOT NULL DEFAULT 'DIESEL',
    "origem" TEXT NOT NULL DEFAULT 'EXTERNO',
    "motorista" TEXT,
    "observacao" TEXT,
    "hasError" BOOLEAN NOT NULL DEFAULT false,
    "errors" TEXT NOT NULL DEFAULT '[]',
    "corrected" BOOLEAN NOT NULL DEFAULT false,
    "importBatchId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FuelRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FuelRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FuelRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FuelRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FuelRecord" ("combustivel", "corrected", "createdAt", "createdById", "data", "errors", "hasError", "id", "importBatchId", "km", "litros", "motorista", "observacao", "placaTexto", "posto", "updatedAt", "updatedById", "valorLitro", "valorTotal", "vehicleId") SELECT "combustivel", "corrected", "createdAt", "createdById", "data", "errors", "hasError", "id", "importBatchId", "km", "litros", "motorista", "observacao", "placaTexto", "posto", "updatedAt", "updatedById", "valorLitro", "valorTotal", "vehicleId" FROM "FuelRecord";
DROP TABLE "FuelRecord";
ALTER TABLE "new_FuelRecord" RENAME TO "FuelRecord";
CREATE INDEX "FuelRecord_vehicleId_idx" ON "FuelRecord"("vehicleId");
CREATE INDEX "FuelRecord_data_idx" ON "FuelRecord"("data");
CREATE INDEX "FuelRecord_hasError_idx" ON "FuelRecord"("hasError");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_tipo_idx" ON "ActivityLog"("tipo");

-- CreateTable
CREATE TABLE "Planejamento" (
    "userId" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Planejamento_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "Planejamento" ADD CONSTRAINT "Planejamento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

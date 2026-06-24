-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "fechaProximoContacto" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "observaciones" TEXT;
ALTER TABLE "Lead" ADD COLUMN "origen" TEXT;
ALTER TABLE "Lead" ADD COLUMN "proximaAccion" TEXT;
ALTER TABLE "Lead" ADD COLUMN "responsableId" TEXT;

-- CreateTable
CREATE TABLE "LeadNota" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "comentario" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadNota_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LeadNota_leadId_createdAt_idx" ON "LeadNota"("leadId", "createdAt");

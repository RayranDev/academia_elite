-- CreateTable
CREATE TABLE "SoporteSesion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "superAdminId" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "soloLectura" BOOLEAN NOT NULL DEFAULT true,
    "iniciadaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadaEn" DATETIME
);

-- CreateIndex
CREATE INDEX "SoporteSesion_superAdminId_finalizadaEn_idx" ON "SoporteSesion"("superAdminId", "finalizadaEn");

-- CreateIndex
CREATE INDEX "SoporteSesion_escuelaId_idx" ON "SoporteSesion"("escuelaId");

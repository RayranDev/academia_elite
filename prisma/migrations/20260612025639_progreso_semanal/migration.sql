-- CreateTable
CREATE TABLE "ProgresoSemanal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "academico" BOOLEAN NOT NULL DEFAULT false,
    "comportamiento" BOOLEAN NOT NULL DEFAULT false,
    "puntualidad" BOOLEAN NOT NULL DEFAULT false,
    "ayudaCasa" BOOLEAN NOT NULL DEFAULT false,
    "valores" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,
    "validadoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgresoSemanal_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProgresoSemanal_escuelaId_jugadorId_idx" ON "ProgresoSemanal"("escuelaId", "jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgresoSemanal_jugadorId_semana_key" ON "ProgresoSemanal"("jugadorId", "semana");

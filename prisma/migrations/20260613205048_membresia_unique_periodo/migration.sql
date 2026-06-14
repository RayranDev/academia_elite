-- AlterTable: unique de cuota por (escuela, jugador, periodo) + índice de tenant
CREATE UNIQUE INDEX "Membresia_escuelaId_jugadorId_periodo_key" ON "Membresia"("escuelaId", "jugadorId", "periodo");
CREATE INDEX "Membresia_escuelaId_idx" ON "Membresia"("escuelaId");

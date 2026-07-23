-- AlterTable
ALTER TABLE "Asistencia" ADD COLUMN     "agregadoEnCancha" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "corregidoAt" TIMESTAMP(3),
ADD COLUMN     "corregidoPorId" TEXT,
ADD COLUMN     "justificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "llegoTarde" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marcadoAt" TIMESTAMP(3),
ADD COLUMN     "salioAntes" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "notaSesion" TEXT,
ADD COLUMN     "sesionCerradaAt" TIMESTAMP(3),
ADD COLUMN     "sesionIniciadaAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ObservacionJugador" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "entrenadorId" TEXT NOT NULL,
    "eventoId" TEXT,
    "texto" TEXT NOT NULL,
    "visiblePadre" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObservacionJugador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObservacionJugador_escuelaId_jugadorId_createdAt_idx" ON "ObservacionJugador"("escuelaId", "jugadorId", "createdAt");

-- CreateIndex
CREATE INDEX "ObservacionJugador_eventoId_idx" ON "ObservacionJugador"("eventoId");

-- AddForeignKey
ALTER TABLE "ObservacionJugador" ADD CONSTRAINT "ObservacionJugador_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Código propio del jugador para que el padre lo vincule.
ALTER TABLE "Jugador" ADD COLUMN "codigoJugador" TEXT;
CREATE UNIQUE INDEX "Jugador_codigoJugador_key" ON "Jugador"("codigoJugador");

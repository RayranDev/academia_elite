-- Código humano de referencia (soporte): nullable, único. Los registros nuevos
-- lo reciben al crearse; los existentes se backfillean aparte.
ALTER TABLE "Escuela" ADD COLUMN "codigoRef" TEXT;
ALTER TABLE "Jugador" ADD COLUMN "codigoRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Escuela_codigoRef_key" ON "Escuela"("codigoRef");
CREATE UNIQUE INDEX "Jugador_codigoRef_key" ON "Jugador"("codigoRef");

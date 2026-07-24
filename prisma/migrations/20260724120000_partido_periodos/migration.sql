-- Partido v2: estructura real del partido (dos tiempos, alargue, penales).
--
-- `periodo` lleva DEFAULT y NOT NULL: los partidos existentes quedan en
-- 'NO_INICIADO', que es el estado correcto para uno que nunca corrió el modo.
-- El resto es nullable y no rompe datos previos. La tabla ya tiene RLS y agregar
-- columnas no lo altera.
ALTER TABLE "Evento" ADD COLUMN "periodo" TEXT NOT NULL DEFAULT 'NO_INICIADO';
ALTER TABLE "Evento" ADD COLUMN "periodoIniciadoAt" TIMESTAMP(3);
ALTER TABLE "Evento" ADD COLUMN "penalesLocal" INTEGER;
ALTER TABLE "Evento" ADD COLUMN "penalesVisitante" INTEGER;

-- Los partidos ya jugados (con resultado cargado y sesión cerrada) se marcan
-- como finalizados: es su estado real y evita que aparezcan como "sin comenzar".
UPDATE "Evento"
SET "periodo" = 'FINALIZADO'
WHERE "tipo" = 'PARTIDO' AND "sesionCerradaAt" IS NOT NULL;

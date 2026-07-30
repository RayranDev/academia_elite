-- Tarjeta azul (expulsión temporal, usada en algunas ligas de fútbol base).
-- Columna con default: no rompe las estadísticas ya cargadas. La tabla ya tiene RLS.
ALTER TABLE "EstadisticaPartido" ADD COLUMN "azul" BOOLEAN NOT NULL DEFAULT false;

-- Categorías "sin edad" (ligas libres, equipos mixtos, adultos): antes
-- anioDesde/anioHasta eran obligatorios aunque no aplicaran. NULL = sin
-- filtro de año. El motor de evaluación (GrupoEdad) nunca leyó estos campos
-- — deja NULL sin romper nada aguas abajo.
ALTER TABLE "Categoria" ALTER COLUMN "anioDesde" DROP NOT NULL;
ALTER TABLE "Categoria" ALTER COLUMN "anioHasta" DROP NOT NULL;

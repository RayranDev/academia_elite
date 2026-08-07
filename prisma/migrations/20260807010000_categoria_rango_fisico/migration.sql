-- Calibración física por CATEGORÍA real (Fase B), reemplaza el rango fijo por
-- GrupoEdad (SUB8/SUB10/SUB12/SUB14/SUB16) que traía embebido el motor.
--
-- Por qué: la Fase A ya dejó que cada escuela defina categorías con años
-- propios o "sin edad" (`20260807000000_categoria_anios_opcionales`), pero el
-- motor de stats seguía normalizando las 4 pruebas físicas contra una franja
-- etaria fija — dos escuelas con la misma "Sub-12" pero criterios de edad
-- distintos terminaban comparadas contra el mismo rango, y una categoría sin
-- edad no tenía ningún rango razonable. Esta tabla mueve la calibración a la
-- categoría concreta: 1 fila por categoría (unique en categoriaId), sembrada
-- al crear la categoría con el GrupoEdad más cercano y editable después sin
-- atarse a esa franja.

CREATE TABLE "CategoriaRangoFisico" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "sprintMin" DOUBLE PRECISION NOT NULL,
    "sprintMax" DOUBLE PRECISION NOT NULL,
    "saltoMin" DOUBLE PRECISION NOT NULL,
    "saltoMax" DOUBLE PRECISION NOT NULL,
    "agilidadMin" DOUBLE PRECISION NOT NULL,
    "agilidadMax" DOUBLE PRECISION NOT NULL,
    "yoyoMin" DOUBLE PRECISION NOT NULL,
    "yoyoMax" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaRangoFisico_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoriaRangoFisico_categoriaId_key" ON "CategoriaRangoFisico"("categoriaId");

CREATE INDEX "CategoriaRangoFisico_escuelaId_idx" ON "CategoriaRangoFisico"("escuelaId");

ALTER TABLE "CategoriaRangoFisico" ADD CONSTRAINT "CategoriaRangoFisico_escuelaId_fkey"
  FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CategoriaRangoFisico" ADD CONSTRAINT "CategoriaRangoFisico_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reaplica RLS al esquema `public`: las tablas NUEVAS no la heredan y nacerían
-- expuestas a la Data API de Supabase. Bloque idempotente (activar RLS sobre una
-- tabla que ya la tiene es un no-op), mismo patrón que `enable_rls_observacion`.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

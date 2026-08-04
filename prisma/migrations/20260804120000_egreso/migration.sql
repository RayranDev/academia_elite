-- Egresos de caja de la escuela (gasto operativo: cancha, árbitro, sueldos, ...).
--
-- A diferencia de `Membresia`, acá `monto` es NOT NULL: un egreso sin monto no
-- es un gasto. `fecha` (cuándo se pagó) es distinta de `createdAt` (cuándo se
-- cargó el registro), para que el reporte de caja del período ubique el gasto
-- en su fecha real.

CREATE TABLE "Egreso" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "medioPago" TEXT,
    "referenciaPago" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Egreso_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Egreso_escuelaId_fecha_idx" ON "Egreso"("escuelaId", "fecha");

ALTER TABLE "Egreso" ADD CONSTRAINT "Egreso_escuelaId_fkey"
  FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

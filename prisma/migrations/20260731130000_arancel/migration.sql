-- Lista de precios de la escuela (Track A · A.1).
--
-- Sin esto no hay forma de emitir la cobranza del mes sin tipear el monto
-- jugador por jugador. El precio aplicable se resuelve en `src/lib/aranceles.ts`:
-- gana el de la categoría sobre el general (`categoriaId` NULL), y dentro del
-- mismo alcance el `vigenteDesde` más reciente ya vigente.
--
-- A propósito SIN unique por (categoría, concepto): varias filas con distinto
-- `vigenteDesde` son el historial de precios.

CREATE TABLE "Arancel" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arancel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Arancel_escuelaId_concepto_idx" ON "Arancel"("escuelaId", "concepto");

ALTER TABLE "Arancel" ADD CONSTRAINT "Arancel_escuelaId_fkey"
  FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Arancel" ADD CONSTRAINT "Arancel_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

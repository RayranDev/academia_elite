-- Conceptos de cobro parametrizables + el pago como entidad propia.
--
-- Dos cambios que van juntos porque el segundo depende del primero:
--
-- 1) `concepto` deja de ser texto y pasa a ser FK a `ConceptoCobro`, un catálogo
--    POR ESCUELA. Con el texto, dos torneos distintos en el mismo mes entraban
--    ambos como 'OTRO' y el unique de `Membresia` rechazaba el segundo: la
--    escuela no podía cobrar dos cosas de igual nombre en un período.
--
-- 2) Nace `Pago` (el hecho de que entró plata) separado de `Membresia` (el
--    cargo). Hasta hoy la misma fila era las dos cosas, lo que solo funciona
--    mientras 1 cargo = 1 pago exacto. No cubre "transferí 450.000 que cubren
--    agosto, septiembre e indumentaria", ni "pagué parte en efectivo y parte por
--    Nequi", ni dos hermanos pagados juntos. Cuelgan de `Pago` dos ejes
--    independientes: `PagoMedio` (cómo entró) y `PagoAplicacion` (a qué se
--    aplica).

-- ---------------------------------------------------------------------------
-- 1. Catálogo de conceptos
-- ---------------------------------------------------------------------------

CREATE TABLE "ConceptoCobro" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptoCobro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConceptoCobro_escuelaId_codigo_key"
  ON "ConceptoCobro"("escuelaId", "codigo");

CREATE INDEX "ConceptoCobro_escuelaId_activo_idx"
  ON "ConceptoCobro"("escuelaId", "activo");

ALTER TABLE "ConceptoCobro" ADD CONSTRAINT "ConceptoCobro_escuelaId_fkey"
  FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Siembra los seis conceptos de sistema en TODA escuela existente. Las escuelas
-- nuevas los reciben al crearse (ver `sembrarConceptosDeSistema` en el servicio).
INSERT INTO "ConceptoCobro" ("id", "escuelaId", "codigo", "nombre", "esSistema", "activo", "orden")
SELECT gen_random_uuid()::text, e."id", c.codigo, c.nombre, true, true, c.orden
FROM "Escuela" e
CROSS JOIN (VALUES
  ('MENSUALIDAD',  'Mensualidad',  1),
  ('MATRICULA',    'Matrícula',    2),
  ('INDUMENTARIA', 'Indumentaria', 3),
  ('TORNEO',       'Torneo',       4),
  ('TRANSPORTE',   'Transporte',   5),
  ('OTRO',         'Otro',         6)
) AS c(codigo, nombre, orden);

-- ---------------------------------------------------------------------------
-- 2. Membresia.concepto -> Membresia.conceptoId
-- ---------------------------------------------------------------------------

ALTER TABLE "Membresia" ADD COLUMN "conceptoId" TEXT;

UPDATE "Membresia" m
SET "conceptoId" = c."id"
FROM "ConceptoCobro" c
WHERE c."escuelaId" = m."escuelaId" AND c."codigo" = m."concepto";

-- Red de seguridad: cualquier valor viejo fuera del catálogo cae a OTRO. Si dos
-- filas del mismo jugador/período cayeran acá, el unique nuevo aborta la
-- migración — preferible a resolverlo en silencio y perder una cuota.
UPDATE "Membresia" m
SET "conceptoId" = c."id"
FROM "ConceptoCobro" c
WHERE m."conceptoId" IS NULL
  AND c."escuelaId" = m."escuelaId"
  AND c."codigo" = 'OTRO';

ALTER TABLE "Membresia" ALTER COLUMN "conceptoId" SET NOT NULL;

DROP INDEX "Membresia_escuelaId_jugadorId_periodo_concepto_key";
ALTER TABLE "Membresia" DROP COLUMN "concepto";

CREATE UNIQUE INDEX "Membresia_escuelaId_jugadorId_periodo_conceptoId_key"
  ON "Membresia"("escuelaId", "jugadorId", "periodo", "conceptoId");

CREATE INDEX "Membresia_conceptoId_idx" ON "Membresia"("conceptoId");

ALTER TABLE "Membresia" ADD CONSTRAINT "Membresia_conceptoId_fkey"
  FOREIGN KEY ("conceptoId") REFERENCES "ConceptoCobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Arancel.concepto -> Arancel.conceptoId
-- ---------------------------------------------------------------------------

ALTER TABLE "Arancel" ADD COLUMN "conceptoId" TEXT;

UPDATE "Arancel" a
SET "conceptoId" = c."id"
FROM "ConceptoCobro" c
WHERE c."escuelaId" = a."escuelaId" AND c."codigo" = a."concepto";

UPDATE "Arancel" a
SET "conceptoId" = c."id"
FROM "ConceptoCobro" c
WHERE a."conceptoId" IS NULL
  AND c."escuelaId" = a."escuelaId"
  AND c."codigo" = 'OTRO';

ALTER TABLE "Arancel" ALTER COLUMN "conceptoId" SET NOT NULL;

DROP INDEX "Arancel_escuelaId_concepto_idx";
ALTER TABLE "Arancel" DROP COLUMN "concepto";

CREATE INDEX "Arancel_escuelaId_conceptoId_idx" ON "Arancel"("escuelaId", "conceptoId");

ALTER TABLE "Arancel" ADD CONSTRAINT "Arancel_conceptoId_fkey"
  FOREIGN KEY ("conceptoId") REFERENCES "ConceptoCobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. Pago, PagoMedio, PagoAplicacion
-- ---------------------------------------------------------------------------

CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "escuelaId" TEXT NOT NULL,
    "reportadoPor" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'REPORTADO',
    "monto" DECIMAL(12,2) NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "nota" TEXT,
    "revisadoPor" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "anuladoPor" TEXT,
    "anuladoEn" TIMESTAMP(3),
    "motivoAnulacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Pago_escuelaId_estado_idx" ON "Pago"("escuelaId", "estado");
CREATE INDEX "Pago_escuelaId_fechaPago_idx" ON "Pago"("escuelaId", "fechaPago");
CREATE INDEX "Pago_reportadoPor_idx" ON "Pago"("reportadoPor");

ALTER TABLE "Pago" ADD CONSTRAINT "Pago_escuelaId_fkey"
  FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PagoMedio" (
    "id" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "medio" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "referencia" TEXT,
    "comprobanteUrl" TEXT,

    CONSTRAINT "PagoMedio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PagoMedio_pagoId_idx" ON "PagoMedio"("pagoId");

ALTER TABLE "PagoMedio" ADD CONSTRAINT "PagoMedio_pagoId_fkey"
  FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PagoAplicacion" (
    "pagoId" TEXT NOT NULL,
    "membresiaId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PagoAplicacion_pkey" PRIMARY KEY ("pagoId", "membresiaId")
);

CREATE INDEX "PagoAplicacion_membresiaId_idx" ON "PagoAplicacion"("membresiaId");

ALTER TABLE "PagoAplicacion" ADD CONSTRAINT "PagoAplicacion_pagoId_fkey"
  FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PagoAplicacion" ADD CONSTRAINT "PagoAplicacion_membresiaId_fkey"
  FOREIGN KEY ("membresiaId") REFERENCES "Membresia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Una cuota NO puede tener dos pagos vigentes encima. El chequeo en el servicio
-- corre dentro de una transacción, pero la barrera real es esta: el doble clic
-- de un tutor en el celular dispara dos reportes casi simultáneos sobre la misma
-- cuota, y sin índice la carrera se gana a veces.
--
-- Es un índice único PARCIAL: Prisma no sabe expresarlo en el schema, así que
-- vive solo acá (mismo caso que los bloques de RLS). Al borrarlo/recrearlo,
-- acordarse de que `prisma migrate diff` no lo ve.
CREATE UNIQUE INDEX "PagoAplicacion_membresiaId_activa_key"
  ON "PagoAplicacion"("membresiaId") WHERE "activa";

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

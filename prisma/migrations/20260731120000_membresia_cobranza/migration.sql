-- Sanea el modelo de dinero de las cuotas (Track A · A.0).
--
-- 1) `monto` deja de ser Float: la plata no se guarda en punto flotante. Se hace
--    AHORA, con la cobranza todavía sin histórico real, porque cambiar el tipo
--    de una columna de dinero con años de datos encima es una migración mucho
--    más cara y arriesgada.
-- 2) Se registra el pago de verdad: un estado "PAGADA" sin cuándo, cómo ni
--    comprobante no es auditable ni sirve para conciliar contra el banco.
-- 3) `concepto` entra al unique: una escuela cobra mensualidad, matrícula,
--    indumentaria y torneos — no solo la cuota del mes.
--
-- Sin bloque de re-habilitación de RLS: esta migración no crea tablas nuevas
-- (`Membresia` ya nació con RLS en `enable_rls`). El bloque idempotente de
-- `enable_rls_observacion` corresponde a las migraciones que agregan modelos.

-- Float -> Decimal. El cast es seguro: los valores actuales son montos de cuota
-- (miles de pesos), muy lejos del límite de DECIMAL(12,2).
ALTER TABLE "Membresia"
  ALTER COLUMN "monto" TYPE DECIMAL(12,2) USING "monto"::numeric(12,2);

ALTER TABLE "Membresia"
  ADD COLUMN "concepto" TEXT NOT NULL DEFAULT 'MENSUALIDAD',
  ADD COLUMN "descuento" DECIMAL(12,2),
  ADD COLUMN "pagadaEn" TIMESTAMP(3),
  ADD COLUMN "medioPago" TEXT,
  ADD COLUMN "referenciaPago" TEXT;

-- El unique pasa a incluir el concepto. Las filas existentes quedan todas en
-- 'MENSUALIDAD', así que la tupla ampliada sigue siendo única: el índice nuevo
-- no puede chocar con datos previos.
DROP INDEX "Membresia_escuelaId_jugadorId_periodo_key";

CREATE UNIQUE INDEX "Membresia_escuelaId_jugadorId_periodo_concepto_key"
  ON "Membresia"("escuelaId", "jugadorId", "periodo", "concepto");

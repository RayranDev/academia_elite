-- Identificación fiscal del ADQUIRIENTE (User = acudiente que paga), no del
-- menor. En Colombia la factura electrónica se emite a quien paga, no al
-- jugador — que ya tiene su propio tipoDocumento/numeroDocumento en `Jugador`
-- (RC/TI, porque ahí sí es un NNA). Hoy la plataforma NO factura
-- electrónicamente: estos campos solo dejan la puerta abierta a que una
-- escuela se formalice ante la DIAN sin tener que perseguir después a
-- cientos de familias pidiéndoles la cédula. Los tres son OPCIONALES: la
-- escuela informal no los necesita y no se le debe exigir nada.
--
-- Sin bloque de re-habilitación de RLS: esta migración solo agrega columnas a
-- una tabla que ya existe (`User` ya nació con RLS en `enable_rls`), no crea
-- tablas nuevas. El bloque idempotente de `enable_rls_observacion` corresponde
-- a las migraciones que agregan modelos (mismo criterio documentado en
-- `20260731120000_membresia_cobranza/migration.sql`).

ALTER TABLE "User"
  ADD COLUMN "tipoDocumento" TEXT,
  ADD COLUMN "numeroDocumento" TEXT,
  ADD COLUMN "direccion" TEXT;

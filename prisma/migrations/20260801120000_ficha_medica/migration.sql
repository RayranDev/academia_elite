-- Ficha administrativa y médica del jugador (datos sensibles de salud,
-- Ley 1581 — HABEAS-DATA.md actualizado en el mismo PR, antes que este schema).
--
-- Todo opcional: la escuela opera sin esta ficha y la familia decide cargarla.
-- `autorizaDatosSalud` es un consentimiento específico y separado (mismo
-- patrón que `consentimientoFoto`): sin autorización, los campos de salud no
-- se muestran a nadie aunque estén guardados en la base.
--
-- Sin bloque de RLS: esta migración no crea tablas nuevas, altera `Jugador`
-- que ya tiene RLS habilitado desde `enable_rls`.

ALTER TABLE "Jugador"
  ADD COLUMN "tipoDocumento" TEXT,
  ADD COLUMN "numeroDocumento" TEXT,
  ADD COLUMN "autorizaDatosSalud" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "autorizacionDatosSaludEn" TIMESTAMP(3),
  ADD COLUMN "eps" TEXT,
  ADD COLUMN "rh" TEXT,
  ADD COLUMN "alergias" TEXT,
  ADD COLUMN "condicionesMedicas" TEXT,
  ADD COLUMN "aptoMedicoVence" TIMESTAMP(3),
  ADD COLUMN "contactoEmergenciaNombre" TEXT,
  ADD COLUMN "contactoEmergenciaTelefono" TEXT,
  ADD COLUMN "contactoEmergenciaParentesco" TEXT,
  ADD COLUMN "autorizaTraslado" BOOLEAN NOT NULL DEFAULT false;

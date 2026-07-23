-- Reaplica RLS al esquema `public` tras crear tablas nuevas.
--
-- La migración `enable_rls` dejó anotado que las tablas NUEVAS no heredan RLS:
-- `ObservacionJugador` (creada en `modos_sesion_asistencia_viva`) nació expuesta
-- a la Data API de Supabase. Este bloque es idempotente — activar RLS sobre una
-- tabla que ya lo tiene es un no-op —, así que se puede repetir tras cada
-- migración que agregue modelos.
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

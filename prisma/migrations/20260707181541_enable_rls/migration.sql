-- Habilita Row Level Security (RLS) en TODAS las tablas del esquema `public`.
--
-- Por qué: Supabase expone una Data API (PostgREST) sobre `public` accesible con
-- la anon key. Sin RLS, esas tablas son leíbles/escribibles por HTTP con esa key
-- (datos de menores). Activar RLS SIN políticas deja el acceso en deny-all para
-- los roles `anon` y `authenticated` (PostgREST), cerrando esa puerta.
--
-- Por qué NO rompe la app:
--   * La app usa Prisma con el rol `postgres`, que es DUEÑO de las tablas; el
--     dueño BYPASSEA RLS con ENABLE (no FORCE). Las queries siguen funcionando.
--   * Supabase Storage se accede con la service role key (bypassa RLS) y vive en
--     otro esquema, no en `public`.
--
-- Nota de mantenimiento: las tablas NUEVAS que agregue Prisma en el futuro NO
-- heredan RLS automáticamente; volver a correr este bloque tras crearlas.
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

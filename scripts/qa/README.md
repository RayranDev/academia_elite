# Entorno QA aislado

Levanta la app contra una copia de datos demo que **no puede tocar producción**.
Pensado para agentes y auditores que necesitan probar escribiendo (crear logros,
evaluaciones, subir fotos, editar pagos) sin riesgo.

## Por qué existe

La base de `.env` local suele ser la **misma** que usa producción (mismo proyecto
Supabase, schema `public`). Probar contra ella escribe datos reales de menores, y
`npm run db:reset` / `db:seed` los borran. Ver `docs/politicas/POLITICA-QA.md` §2.

## Uso

```bash
npm run qa:entorno                  # build + servidor en http://localhost:3300
npm run qa:entorno -- --puerto=3400 # otro puerto
npm run qa:entorno -- --sin-build   # reutiliza el build QA anterior
npm run qa:detener                  # termina SOLO ese servidor
```

Al terminar, `scratch/qa/entorno.json` trae puerto, url, pid, schema, carpeta de
uploads y las cuentas demo por rol (la contraseña demo sale de
`prisma/seed-credenciales.ts`). El log del servidor queda en
`scratch/qa/servidor.log`.

## Qué hace

1. Calcula las URLs con `?schema=qa` y **aborta** si el schema resultante no es
   exactamente `qa` (jamás `public`).
2. Recrea solo ese schema: `DROP SCHEMA "qa" CASCADE` + `CREATE SCHEMA "qa"`,
   explícito. Nunca `prisma migrate reset`. Luego `migrate deploy` y `db seed`.
3. Pone la foto del niño de marca (`public/nino_carta.png`, generado por IA, no es
   un menor real) en los jugadores demo, con el mismo pipeline de la subida real
   (WebP, sin EXIF, nombre UUID). Las cartas muestran esa cara y no el avatar.
4. Compila en `scratch/qa/next` (`NEXT_DIST_DIR`), así un `npm run build` o la suite
   e2e no le rompen el servidor.
5. Arranca `next start` desacoplado, con el entorno sobrescrito:
   `DATABASE_URL`/`DIRECT_URL` al schema `qa`; `AUTH_URL`/`NEXTAUTH_URL` al puerto;
   correo en modo consola (sin `RESEND_API_KEY`, `EMAIL_DEV_TO`, `EMAIL_EQUIPO`);
   sin Upstash; sin Supabase; archivos en `ALMACENAMIENTO_LOCAL_DIR`
   (`scratch/qa/uploads`).

## Qué garantiza

- **Nunca toca `public`**: ni la base ni el bucket de Supabase.
- Una sola instancia a la vez: si hay un entorno vivo, `qa:entorno` se niega.
- `qa:detener` solo mata el pid del descriptor (y su árbol), y solo si ese pid sigue
  escuchando en el puerto del entorno (protege contra pids reutilizados).

## Límites

- Comparte la **instancia** de base con producción: el aislamiento es por schema, no
  por servidor. Un proyecto Supabase aparte para QA sigue siendo la solución de
  fondo.
- El schema `qa` y los uploads quedan al detener (para inspección); se recrean en la
  siguiente corrida.
- `npm run db:seed` / `db:reset` contra `public` abortan por la guardia
  (`scripts/guardia-borrado.mjs`). Desbloqueo consciente:
  `PERMITIR_BORRADO_DE_BASE=1` solo para ese comando. No lo dejes en `.env`.

import "dotenv/config";

/**
 * Normaliza a UNA sola conexión antes de que se importe nada de `src/`.
 *
 * La CLI de Prisma (`prisma.config.ts`) y los scripts de este repo (p. ej.
 * `scripts/backfill-categoria-rangos.ts`) usan `DIRECT_URL` para la conexión
 * directa. Pero `src/lib/db.ts` — el singleton que abren
 * `evaluarJugadorCore`, `obtenerJugador` y `recalcularMenDiario` — solo lee
 * `DATABASE_URL` y no tiene fallback (lanza si falta).
 *
 * `seed-demo-evolucion.ts` es el primer seed que cruza de Prisma-directo a
 * `src/services`/`src/repositories`: sin esto, con solo `DIRECT_URL` seteada
 * (el patrón documentado en `scripts/backup-db.ts`), el cliente propio del
 * runner escribía por una conexión y `evaluarJugadorCore` fallaba —o, peor,
 * si `DATABASE_URL` apuntaba a OTRA base, escribía silenciosamente en dos
 * bases distintas— a mitad de una siembra, sin transacción ni rollback.
 *
 * Se importa esto ANTES que cualquier módulo de `src/` (primera línea de
 * `seed.ts` y de `seed-demo-evolucion.run.ts`), así el singleton de
 * `src/lib/db.ts` nace ya apuntando a la misma conexión que el resto del
 * seed resuelve.
 */
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
if (!process.env.DATABASE_URL) {
  throw new Error("DIRECT_URL o DATABASE_URL requerida (.env).");
}

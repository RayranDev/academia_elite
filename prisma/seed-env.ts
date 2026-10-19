import "dotenv/config";
import { exigirBorradoPermitido } from "../scripts/guardia-borrado.mjs";

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

/**
 * GUARDIA DE BORRADO. Todo seed que importa este módulo borra datos antes de
 * sembrar. Si la conexión apunta al schema `public` (la base real, compartida
 * con producción) se aborta ACÁ, antes de abrir ningún cliente ni importar
 * nada de `src/`. Los schemas aislados (`e2e`, `qa`) pasan sin variable extra.
 * Desbloqueo consciente: `PERMITIR_BORRADO_DE_BASE=1` (ver
 * `scripts/guardia-borrado.mjs`). `seed-prod.ts` no lo importa a propósito:
 * solo hace upserts y nunca borra.
 */
try {
  exigirBorradoPermitido({
    url: process.env.DATABASE_URL,
    env: process.env,
    operacion: "este seed",
  });
} catch (e) {
  // Sin stack trace: el mensaje ya explica qué pasó y cómo desbloquearlo.
  console.error(`\n${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}

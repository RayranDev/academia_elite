/**
 * Guardia de borrado de base de datos.
 *
 * Por qué existe: la base de `.env` local puede ser la MISMA que usa producción
 * (mismo proyecto Supabase, schema `public`). `npm run db:reset` y los seeds
 * (`prisma/seed.ts`, `seed-demo-evolucion.run.ts`) BORRAN tablas: correrlos a
 * ciegas destruye los datos reales de menores. Esta guardia hace que borrar sea
 * una decisión consciente, no un descuido.
 *
 * Regla (función pura `decidirBorrado`):
 *   - Se PERMITE si el schema de la URL NO es `public` (ausente = `public`).
 *     Los E2E (`e2e`) y el entorno QA (`qa`) viven en su propio schema, así que
 *     funcionan sin ninguna variable extra.
 *   - Contra `public` solo se permite con `PERMITIR_BORRADO_DE_BASE=1`.
 *   - Fail-closed: si la URL no se puede interpretar, no se permite.
 *
 * Usos:
 *   - Módulo: `prisma/seed-env.ts` la importa (primer import de todo seed).
 *   - CLI: `node scripts/guardia-borrado.mjs` (lo invoca el script npm
 *     `db:reset`); lee `DIRECT_URL ?? DATABASE_URL` del `.env`, igual que
 *     `prisma.config.ts`, y sale con código 1 si no está permitido.
 *
 * Es `.mjs` sin dependencias de `src/` para poder correr con `node` a secas.
 */
import { pathToFileURL } from "node:url";

/**
 * Extrae el schema de una URL de conexión Postgres.
 * @param {string | undefined} url
 * @returns {{ ok: true, schema: string } | { ok: false }}
 *   `schema` ausente o vacío equivale a `public` (el valor por defecto de Prisma).
 */
export function schemaDeUrl(url) {
  if (!url) return { ok: false };
  try {
    const crudo = new URL(url).searchParams.get("schema");
    const schema = (crudo ?? "").trim().toLowerCase();
    return { ok: true, schema: schema === "" ? "public" : schema };
  } catch {
    return { ok: false };
  }
}

/**
 * Decide si es seguro correr una operación que borra datos.
 * @param {{ url: string | undefined, env?: Record<string, string | undefined> }} entrada
 * @returns {{ permitido: boolean, schema: string | null, motivo: string }}
 */
export function decidirBorrado({ url, env = {} }) {
  const lectura = schemaDeUrl(url);
  if (!lectura.ok) {
    // Fail-closed: sin saber a qué base apunta, no se borra nada.
    if (env.PERMITIR_BORRADO_DE_BASE === "1") {
      return {
        permitido: true,
        schema: null,
        motivo: "URL ilegible, pero PERMITIR_BORRADO_DE_BASE=1.",
      };
    }
    return {
      permitido: false,
      schema: null,
      motivo: "No se pudo interpretar la URL de la base (DIRECT_URL / DATABASE_URL).",
    };
  }
  if (lectura.schema !== "public") {
    return {
      permitido: true,
      schema: lectura.schema,
      motivo: `Schema aislado "${lectura.schema}": no es la base real.`,
    };
  }
  if (env.PERMITIR_BORRADO_DE_BASE === "1") {
    return {
      permitido: true,
      schema: "public",
      motivo: 'Borrado de "public" autorizado explícitamente (PERMITIR_BORRADO_DE_BASE=1).',
    };
  }
  return {
    permitido: false,
    schema: "public",
    motivo: 'La URL apunta al schema "public" (la base real).',
  };
}

/** Mensaje de bloqueo, con las instrucciones para desbloquear conscientemente. */
export function mensajeBloqueo(decision, operacion = "esta operación") {
  return [
    `BORRADO BLOQUEADO: ${operacion} borra tablas. ${decision.motivo}`,
    "",
    "La base de .env puede ser la misma que usa producción (datos reales de menores).",
    "Para probar sin riesgo usa el entorno aislado:  npm run qa:entorno  (schema \"qa\").",
    "",
    "Si de verdad quieres borrar esta base (por ejemplo, una base local exclusiva de",
    "pruebas), desbloquéalo de forma consciente SOLO para este comando:",
    "  bash / zsh   PERMITIR_BORRADO_DE_BASE=1 npm run db:seed",
    '  PowerShell   $env:PERMITIR_BORRADO_DE_BASE="1"; npm run db:seed',
    "No lo dejes definido en .env: anularía la guardia para siempre.",
  ].join("\n");
}

/**
 * Lanza si el borrado no está permitido. Pensado para el arranque de los seeds.
 * @param {{ url: string | undefined, env?: Record<string, string | undefined>, operacion?: string }} entrada
 */
export function exigirBorradoPermitido({ url, env = {}, operacion }) {
  const decision = decidirBorrado({ url, env });
  if (!decision.permitido) {
    throw new Error(mensajeBloqueo(decision, operacion));
  }
  return decision;
}

// --- CLI -------------------------------------------------------------------
const esCli =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (esCli) {
  // Solo en modo CLI se carga .env (como hace prisma.config.ts). Como módulo no
  // se toca el entorno.
  // (Sin top-level await: este módulo también lo importan seeds que corren bajo
  // tsx en modo CJS, donde un módulo con TLA no se puede `require`.)
  import("dotenv/config").then(() => {
    const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    const decision = decidirBorrado({ url, env: process.env });
    if (!decision.permitido) {
      console.error(mensajeBloqueo(decision, "db:reset"));
      process.exit(1);
    }
    console.log(`Guardia de borrado: OK (${decision.motivo})`);
  });
}

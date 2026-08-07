import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  RANGOS_POR_GRUPO,
  PRUEBAS_FISICAS,
  claveRango,
  rangosDesdeParametros,
  filaDesdeRangos,
  grupoEdadSemilla,
  type GrupoEdad,
} from "@/lib/stats-engine";
import { mezclarParametros } from "@/lib/parametros";

/**
 * Backfill de `CategoriaRangoFisico` para categorías creadas ANTES de la Fase
 * B (que no pasaron por la transacción de `crearCategoriaEscuela` y por lo
 * tanto no tienen fila de calibración física propia). Siembra cada una con el
 * `GrupoEdad` más cercano a su rango de años (o SUB16 si es "sin edad") + los
 * valores efectivos (global + overrides) de SU escuela — mismo cálculo que
 * `crearCategoriaEscuela`.
 *
 * Idempotente: solo toca categorías con `rangoFisico: null` (relación 1:1).
 * Correrlo dos veces es un no-op la segunda vez.
 *
 * Uso:
 *   DIRECT_URL=<prod-directa> npx tsx scripts/backfill-categoria-rangos.ts --dry-run
 *   DIRECT_URL=<prod-directa> npx tsx scripts/backfill-categoria-rangos.ts
 *
 * NOTA: la resolución de "valores efectivos de RANGO_* de una escuela" está
 * REIMPLEMENTADA acá standalone (no importa `@/services/parametro-escuela.
 * service.ts`, que depende de `@/lib/db`, el cliente ligado a la sesión de la
 * app — mismo criterio que `seed-prod.ts`). Si `globalConDefecto`/
 * `cargarValores` cambian en ese archivo, revisar también acá.
 */

const DRY_RUN = process.argv.includes("--dry-run");

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL o DATABASE_URL requerida.");
}
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

/** Defaults embebidos de las claves RANGO_* (reimplementación de `globalConDefecto`, solo la parte de rangos). */
function rangoGlobalConDefecto(dbGlobal: Record<string, number>): Record<string, number> {
  const base: Record<string, number> = {};
  for (const grupo of Object.keys(RANGOS_POR_GRUPO) as GrupoEdad[]) {
    for (const prueba of PRUEBAS_FISICAS) {
      const r = RANGOS_POR_GRUPO[grupo][prueba];
      base[claveRango(prueba, grupo, "MIN")] = r.min;
      base[claveRango(prueba, grupo, "MAX")] = r.max;
    }
  }
  return { ...base, ...dbGlobal };
}

async function main() {
  console.log(`🔧 Backfill de CategoriaRangoFisico${DRY_RUN ? " (--dry-run, no escribe nada)" : ""}…`);

  // El global de RANGO_* es el mismo para todas las escuelas: se resuelve una sola vez.
  const rangoGlobalRows = await db.parametroFormula.findMany({
    where: { clave: { startsWith: "RANGO_" } },
    select: { clave: true, valor: true },
  });
  const dbGlobal = Object.fromEntries(rangoGlobalRows.map((p) => [p.clave, p.valor]));
  const global = rangoGlobalConDefecto(dbGlobal);

  const categorias = await db.categoria.findMany({
    where: { rangoFisico: null },
    select: { id: true, escuelaId: true, nombre: true, anioDesde: true, anioHasta: true },
  });

  console.log(`   • Categorías sin CategoriaRangoFisico (antes): ${categorias.length}`);
  if (categorias.length === 0) {
    console.log("✅ Nada para backfillear.");
    return;
  }

  // Overrides por escuela: se cachean para no repetir la consulta por cada categoría.
  const overridesCache = new Map<string, Record<string, number>>();
  async function valoresEfectivosDeEscuela(escuelaId: string): Promise<Record<string, number>> {
    const cacheado = overridesCache.get(escuelaId);
    if (cacheado) return cacheado;
    const overridesRows = await db.parametroEscuela.findMany({
      where: { escuelaId },
      select: { clave: true, valor: true },
    });
    const override = Object.fromEntries(overridesRows.map((o) => [o.clave, o.valor]));
    const efectivo = mezclarParametros(global, override);
    overridesCache.set(escuelaId, efectivo);
    return efectivo;
  }

  let creadas = 0;
  for (const categoria of categorias) {
    const grupo = grupoEdadSemilla(categoria.anioDesde, categoria.anioHasta);
    const valoresEfectivos = await valoresEfectivosDeEscuela(categoria.escuelaId);
    const rangos = rangosDesdeParametros(valoresEfectivos, grupo);
    const fila = filaDesdeRangos(rangos);

    console.log(
      `   • "${categoria.nombre}" (${categoria.id}, escuela ${categoria.escuelaId}) → semilla ${grupo}`,
    );

    if (!DRY_RUN) {
      await db.categoriaRangoFisico.create({
        data: { escuelaId: categoria.escuelaId, categoriaId: categoria.id, ...fila },
      });
    }
    creadas++;
  }

  const restantes = DRY_RUN
    ? categorias.length
    : await db.categoria.count({ where: { rangoFisico: null } });
  console.log(`   • Filas ${DRY_RUN ? "a crear" : "creadas"}: ${creadas}`);
  console.log(`   • Categorías sin CategoriaRangoFisico (después): ${restantes}`);
  console.log(DRY_RUN ? "✅ Dry-run completado (sin escribir)." : "✅ Backfill completado.");
}

main()
  .catch((e) => {
    console.error("❌ Backfill falló:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

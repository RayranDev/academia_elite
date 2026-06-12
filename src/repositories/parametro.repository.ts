import { db } from "@/lib/db";

// Repositorio de parámetros de fórmula (Capa 4). Editables por SUPER_ADMIN.
export function listarParametrosGlobal() {
  return db.parametroFormula.findMany({ orderBy: { clave: "asc" } });
}

export function obtenerParametroGlobal(clave: string) {
  return db.parametroFormula.findUnique({ where: { clave } });
}

/** Parámetros cuyo nombre empieza por un prefijo (p. ej. "RANGO_"). */
export function listarParametrosPorPrefijo(prefijo: string) {
  return db.parametroFormula.findMany({
    where: { clave: { startsWith: prefijo } },
    select: { clave: true, valor: true },
  });
}

/**
 * Crea o actualiza un parámetro global. El upsert permite editar claves nuevas
 * (p. ej. UMBRAL_*) en BDs que aún no se re-sembraron, sin fallar.
 */
export function actualizarParametroGlobal(
  clave: string,
  valor: number,
  descripcion?: string,
) {
  return db.parametroFormula.upsert({
    where: { clave },
    update: { valor },
    create: { clave, valor, descripcion: descripcion ?? null },
  });
}

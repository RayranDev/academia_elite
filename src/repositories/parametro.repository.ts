import { db } from "@/lib/db";

// Repositorio de parámetros de fórmula (Capa 4). Editables por SUPER_ADMIN.
export function listarParametrosGlobal() {
  return db.parametroFormula.findMany({ orderBy: { clave: "asc" } });
}

export function obtenerParametroGlobal(clave: string) {
  return db.parametroFormula.findUnique({ where: { clave } });
}

export function actualizarParametroGlobal(clave: string, valor: number) {
  return db.parametroFormula.update({ where: { clave }, data: { valor } });
}

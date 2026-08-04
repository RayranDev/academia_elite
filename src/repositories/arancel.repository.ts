import { db } from "@/lib/db";

// Repositorio de aranceles / lista de precios (Capa 4). Firma con escuelaId
// (multi-tenant): toda query queda acotada al tenant.

export function listarAranceles(escuelaId: string) {
  return db.arancel.findMany({
    where: { escuelaId },
    orderBy: [{ concepto: "asc" }, { vigenteDesde: "desc" }],
    include: { categoria: { select: { id: true, nombre: true } } },
  });
}

/**
 * Aranceles activos de un concepto, en un solo query. La generación masiva de
 * cuotas resuelve el precio de todas las categorías en memoria con
 * `resolverArancel`: así no hace una consulta por categoría.
 */
export function listarArancelesActivos(escuelaId: string, concepto: string) {
  return db.arancel.findMany({
    where: { escuelaId, concepto, activo: true },
    orderBy: { vigenteDesde: "desc" },
  });
}

export function obtenerArancel(escuelaId: string, id: string) {
  return db.arancel.findFirst({ where: { id, escuelaId } });
}

export function crearArancel(
  escuelaId: string,
  data: {
    categoriaId: string | null;
    concepto: string;
    monto: number;
    descripcion: string | null;
    vigenteDesde: Date;
  },
) {
  return db.arancel.create({ data: { escuelaId, ...data } });
}

/** Baja lógica: el precio viejo se conserva como historial, no se borra. */
export function desactivarArancel(escuelaId: string, id: string) {
  return db.arancel.updateMany({
    where: { id, escuelaId },
    data: { activo: false },
  });
}

/** Edita un precio existente. Acotado por tenant, como toda escritura acá. */
export function actualizarArancel(
  escuelaId: string,
  id: string,
  data: {
    categoriaId: string | null;
    concepto: string;
    monto: number;
    descripcion: string | null;
    vigenteDesde: Date;
  },
) {
  return db.arancel.updateMany({
    where: { id, escuelaId },
    data,
  });
}

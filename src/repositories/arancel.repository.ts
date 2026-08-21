import { db } from "@/lib/db";

// Repositorio de aranceles / lista de precios (Capa 4). Firma con escuelaId
// (multi-tenant): toda query queda acotada al tenant.

export function listarAranceles(escuelaId: string) {
  return db.arancel.findMany({
    where: { escuelaId },
    // Por nombre del concepto y no por `conceptoId`: el id es un cuid, ordenar
    // por él da un orden arbitrario para quien mira la lista de precios.
    orderBy: [{ conceptoCobro: { nombre: "asc" } }, { vigenteDesde: "desc" }],
    include: {
      categoria: { select: { id: true, nombre: true } },
      conceptoCobro: { select: { id: true, nombre: true } },
    },
  });
}

/**
 * Aranceles activos de un concepto, en un solo query. La generación masiva de
 * cuotas resuelve el precio de todas las categorías en memoria con
 * `resolverArancel`: así no hace una consulta por categoría.
 */
export function listarArancelesActivos(escuelaId: string, conceptoId: string) {
  return db.arancel.findMany({
    where: { escuelaId, conceptoId, activo: true },
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
    conceptoId: string;
    monto: number;
    descripcion: string | null;
    vigenteDesde: Date;
  },
) {
  return db.arancel.create({ data: { escuelaId, ...data } });
}

/**
 * "Este precio quedó viejo": lo da de baja y crea el nuevo en UNA transacción.
 *
 * Vive en el repositorio y no en el servicio porque es acceso a datos: armar el
 * `$transaction` desde la capa de servicios significaba importar `db` ahí y
 * dejar el filtro por tenant de esa escritura fuera del repositorio (AGENTS.md
 * §4). Las dos mitades se auditan por separado; eso sí es del servicio.
 */
export function reemplazarArancel(
  escuelaId: string,
  previoId: string,
  data: {
    categoriaId: string | null;
    conceptoId: string;
    monto: number;
    descripcion: string | null;
    vigenteDesde: Date;
  },
) {
  return db.$transaction(async (tx) => {
    await tx.arancel.updateMany({
      where: { id: previoId, escuelaId },
      data: { activo: false },
    });
    return tx.arancel.create({ data: { escuelaId, ...data } });
  });
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
    conceptoId: string;
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

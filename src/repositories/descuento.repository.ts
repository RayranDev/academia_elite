import { db } from "@/lib/db";

// Repositorio de reglas de descuento (Capa 4). Firma con escuelaId
// (multi-tenant): toda query queda acotada al tenant. Mirror de
// src/repositories/arancel.repository.ts.

export function listarDescuentoReglas(escuelaId: string) {
  return db.descuentoRegla.findMany({
    where: { escuelaId },
    orderBy: [{ activo: "desc" }, { createdAt: "desc" }],
    include: { categoria: { select: { id: true, nombre: true } } },
  });
}

export function obtenerDescuentoRegla(escuelaId: string, id: string) {
  return db.descuentoRegla.findFirst({ where: { id, escuelaId } });
}

/**
 * Reglas activas de la escuela, con lo justo para resolver el descuento en
 * memoria durante la generación masiva de cuotas. Un solo query (igual que
 * `listarArancelesActivos`), sin una consulta por categoría.
 */
export function listarDescuentoReglasActivas(escuelaId: string) {
  return db.descuentoRegla.findMany({
    where: { escuelaId, activo: true },
    select: { id: true, categoriaId: true, tipo: true, valor: true },
  });
}

export function crearDescuentoRegla(
  escuelaId: string,
  data: {
    categoriaId: string;
    nombre: string;
    tipo: string;
    valor: number;
  },
) {
  return db.descuentoRegla.create({ data: { escuelaId, ...data } });
}

export function actualizarDescuentoRegla(
  escuelaId: string,
  id: string,
  data: {
    categoriaId: string;
    nombre: string;
    tipo: string;
    valor: number;
  },
) {
  return db.descuentoRegla.updateMany({ where: { id, escuelaId }, data });
}

/** Baja lógica: la regla vieja se conserva como historial, no se borra. */
export function desactivarDescuentoRegla(escuelaId: string, id: string) {
  return db.descuentoRegla.updateMany({
    where: { id, escuelaId },
    data: { activo: false },
  });
}

/** Ids de jugadores ya asignados a una regla (para precargar el checklist). */
export async function jugadoresAsignados(
  escuelaId: string,
  reglaId: string,
): Promise<string[]> {
  const rows = await db.jugadorDescuento.findMany({
    where: { reglaId, regla: { escuelaId } },
    select: { jugadorId: true },
  });
  return rows.map((r) => r.jugadorId);
}

/**
 * Reemplazo completo del set de jugadores asignados a una regla, en una sola
 * transacción: se borran todas las asignaciones previas y se crean las nuevas.
 * Simple y suficiente para un checklist (no hay historial de asignación que
 * preservar, `asignadaEn` solo documenta la asignación vigente).
 *
 * `escuelaId` no participa de la query (JugadorDescuento no tiene esa
 * columna): el servicio ya valida antes de llamar acá que `reglaId` pertenece
 * al tenant y que cada `jugadorId` es de la misma categoría de la regla — este
 * repositorio confía en esa validación, como el resto de la capa.
 */
export function asignarJugadoresARegla(
  escuelaId: string,
  reglaId: string,
  jugadorIds: string[],
) {
  return db.$transaction(async (tx) => {
    await tx.jugadorDescuento.deleteMany({ where: { reglaId } });
    if (jugadorIds.length > 0) {
      await tx.jugadorDescuento.createMany({
        data: jugadorIds.map((jugadorId) => ({ jugadorId, reglaId })),
      });
    }
  });
}

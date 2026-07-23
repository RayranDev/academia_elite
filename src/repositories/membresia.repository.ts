import { db } from "@/lib/db";

// Repositorio de membresías / cuotas (Capa 4). Firma con escuelaId (multi-tenant).
// El modelo Membresia no tiene relación Prisma a Jugador: los nombres se
// resuelven aparte con obtenerJugadoresMinimos.

export function listarMembresias(escuelaId: string, periodo?: string) {
  return db.membresia.findMany({
    where: { escuelaId, ...(periodo ? { periodo } : {}) },
    orderBy: [{ periodo: "desc" }],
  });
}

export function obtenerMembresia(escuelaId: string, id: string) {
  return db.membresia.findFirst({ where: { id, escuelaId } });
}

/**
 * Crea o actualiza la cuota de un jugador para un período. Upsert atómico sobre
 * el unique (escuelaId, jugadorId, periodo) — sin condición de carrera.
 */
export function upsertMembresia(
  escuelaId: string,
  jugadorId: string,
  periodo: string,
  data: { monto: number | null; estado: string },
) {
  return db.membresia.upsert({
    where: { escuelaId_jugadorId_periodo: { escuelaId, jugadorId, periodo } },
    update: data,
    create: { escuelaId, jugadorId, periodo, ...data },
  });
}

/** Cambia el estado anclando escuelaId en el where (multi-tenant). */
/** Cantidad de cuotas por estado en la escuela (un solo query, para el dashboard). */
export function contarMembresiasPorEstado(escuelaId: string) {
  return db.membresia.groupBy({
    by: ["estado"],
    where: { escuelaId },
    _count: { _all: true },
  });
}

/** Familias (rol JUGADOR) con el acceso bloqueado en la escuela. */
export function contarFamiliasBloqueadas(escuelaId: string) {
  return db.user.count({
    where: { escuelaId, rol: "JUGADOR", bloqueado: true },
  });
}

export function cambiarEstadoMembresia(escuelaId: string, id: string, estado: string) {
  return db.membresia.updateMany({ where: { id, escuelaId }, data: { estado } });
}

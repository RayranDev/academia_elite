import { db } from "@/lib/db";

// Repositorio de sedes y canchas (Capa 4). Firma con escuelaId (multi-tenant).
export function listarSedes(escuelaId: string) {
  return db.sede.findMany({
    where: { escuelaId },
    orderBy: { nombre: "asc" },
    include: { canchas: { orderBy: { nombre: "asc" } } },
  });
}

export function crearSede(
  escuelaId: string,
  data: { nombre: string; direccion?: string | null },
) {
  return db.sede.create({
    data: { escuelaId, nombre: data.nombre, direccion: data.direccion ?? null },
  });
}

export function obtenerSede(escuelaId: string, sedeId: string) {
  return db.sede.findFirst({ where: { id: sedeId, escuelaId } });
}

/**
 * Cancha por id, solo si su sede es de la escuela. `Cancha` no lleva `escuelaId`:
 * el tenant se hereda de la sede, así que se acota por esa relación.
 */
export function obtenerCancha(escuelaId: string, canchaId: string) {
  return db.cancha.findFirst({
    where: { id: canchaId, sede: { escuelaId } },
    select: { id: true },
  });
}

export function crearCancha(sedeId: string, nombre: string) {
  return db.cancha.create({ data: { sedeId, nombre } });
}

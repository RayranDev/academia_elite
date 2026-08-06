import { db } from "@/lib/db";

// Repositorio de staff administrativo (Capa 4). Firma con escuelaId
// (multi-tenant): toda query queda acotada al tenant. Mirror de
// src/repositories/categoria.repository.ts.

export function listarStaff(escuelaId: string) {
  return db.staff.findMany({
    where: { escuelaId },
    orderBy: [{ cargo: "asc" }, { nombre: "asc" }],
  });
}

export function obtenerStaff(escuelaId: string, id: string) {
  return db.staff.findFirst({ where: { id, escuelaId } });
}

export function crearStaff(
  escuelaId: string,
  data: {
    cargo: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
  },
) {
  return db.staff.create({ data: { escuelaId, ...data } });
}

export function actualizarStaff(
  escuelaId: string,
  id: string,
  data: {
    cargo: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
  },
) {
  return db.staff.updateMany({ where: { id, escuelaId }, data });
}

/** Sin relaciones entrantes desde otra tabla: borrado físico, sin baja lógica. */
export function eliminarStaff(escuelaId: string, id: string) {
  return db.staff.deleteMany({ where: { id, escuelaId } });
}

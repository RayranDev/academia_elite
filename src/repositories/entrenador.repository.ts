import { db } from "@/lib/db";

// Repositorio de entrenadores/DT (Capa 4). Firma con escuelaId (multi-tenant).
export function listarEntrenadores(escuelaId: string) {
  return db.entrenador.findMany({
    where: { escuelaId },
    include: {
      user: { select: { id: true, nombre: true, email: true, activo: true } },
      categorias: { include: { categoria: { select: { id: true, nombre: true } } } },
    },
    orderBy: { user: { nombre: "asc" } },
  });
}

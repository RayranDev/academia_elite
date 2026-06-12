import { db } from "@/lib/db";

// Repositorio de overrides de parámetros por escuela (Capa 4, M9).

export function listarOverrides(escuelaId: string) {
  return db.parametroEscuela.findMany({
    where: { escuelaId },
    select: { clave: true, valor: true },
  });
}

export function upsertOverride(escuelaId: string, clave: string, valor: number) {
  return db.parametroEscuela.upsert({
    where: { escuelaId_clave: { escuelaId, clave } },
    update: { valor },
    create: { escuelaId, clave, valor },
  });
}

export function eliminarOverride(escuelaId: string, clave: string) {
  return db.parametroEscuela.deleteMany({ where: { escuelaId, clave } });
}

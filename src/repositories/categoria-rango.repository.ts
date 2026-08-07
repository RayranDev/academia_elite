import { db } from "@/lib/db";
import type { FilaRangoFisico } from "@/lib/stats-engine";

// Repositorio de rangos físicos por categoría (Capa 4). Firma con escuelaId
// (multi-tenant). La creación NO vive acá: se hace dentro de la transacción
// que crea la categoría (`categoria.service.ts::crearCategoriaEscuela`).

export function obtenerRangoDeCategoria(escuelaId: string, categoriaId: string) {
  return db.categoriaRangoFisico.findFirst({ where: { escuelaId, categoriaId } });
}

export function listarRangosDeEscuela(escuelaId: string) {
  return db.categoriaRangoFisico.findMany({
    where: { escuelaId },
    include: { categoria: { select: { nombre: true } } },
    orderBy: { categoria: { nombre: "asc" } },
  });
}

export function actualizarRangoDeCategoria(
  escuelaId: string,
  categoriaId: string,
  fila: FilaRangoFisico,
) {
  return db.categoriaRangoFisico.updateMany({
    where: { escuelaId, categoriaId },
    data: fila,
  });
}

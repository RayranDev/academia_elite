import { db } from "@/lib/db";

export function crearAnuncio(
  escuelaId: string,
  data: {
    categoriaId?: string | null;
    autorRol: string;
    titulo: string;
    cuerpo: string;
    visibleJugador?: boolean;
    fijado?: boolean;
  },
) {
  return db.anuncio.create({
    data: {
      escuelaId,
      categoriaId: data.categoriaId ?? null,
      autorRol: data.autorRol,
      titulo: data.titulo,
      cuerpo: data.cuerpo,
      visibleJugador: data.visibleJugador ?? false,
      fijado: data.fijado ?? false,
    },
  });
}

/** Anuncios visibles para unas categorías (incluye los globales, categoriaId null). */
export function listarAnunciosParaCategorias(
  escuelaId: string,
  categoriaIds: string[],
) {
  return db.anuncio.findMany({
    where: {
      escuelaId,
      OR: [{ categoriaId: null }, { categoriaId: { in: categoriaIds } }],
    },
    orderBy: [{ fijado: "desc" }, { createdAt: "desc" }],
  });
}

/** Anuncios de toda la escuela (panel ESCUELA_ADMIN). */
export function listarAnunciosEscuela(escuelaId: string) {
  return db.anuncio.findMany({
    where: { escuelaId },
    orderBy: [{ fijado: "desc" }, { createdAt: "desc" }],
  });
}

/** Noticias del club visibles para un jugador (de su categoría o globales). */
export function noticiasDeJugador(escuelaId: string, categoriaId: string) {
  return db.anuncio.findMany({
    where: {
      escuelaId,
      visibleJugador: true,
      OR: [{ categoriaId: null }, { categoriaId }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

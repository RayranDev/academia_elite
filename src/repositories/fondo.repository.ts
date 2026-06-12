import { db } from "@/lib/db";

// Repositorio de fondos de carta (Capa 4).

export function listarFondos() {
  return db.fondoCarta.findMany({ orderBy: { orden: "asc" } });
}

export function fondosDesbloqueadosDe(jugadorId: string) {
  return db.fondoDesbloqueado.findMany({
    where: { jugadorId },
    select: { fondoId: true },
  });
}

/** Inserta desbloqueos nuevos (el llamador pasa solo los que aún no existen). */
export function registrarDesbloqueos(jugadorId: string, fondoIds: string[]) {
  if (fondoIds.length === 0) return Promise.resolve({ count: 0 });
  return db.fondoDesbloqueado.createMany({
    data: fondoIds.map((fondoId) => ({ jugadorId, fondoId })),
  });
}

export function obtenerFondo(fondoId: string) {
  return db.fondoCarta.findUnique({ where: { id: fondoId } });
}

export function equiparFondoJugador(jugadorId: string, fondoEquipadoId: string | null) {
  return db.jugador.update({
    where: { id: jugadorId },
    data: { fondoEquipadoId },
  });
}

export function logrosCodigosDeJugador(jugadorId: string) {
  return db.logroJugador.findMany({
    where: { jugadorId },
    select: { logro: { select: { codigo: true } } },
  });
}

/** Nombres de logros por código (para describir el requisito de un fondo). */
export function logrosPorCodigos(codigos: string[]) {
  if (codigos.length === 0) return Promise.resolve([] as { codigo: string; nombre: string }[]);
  return db.logro.findMany({
    where: { codigo: { in: codigos } },
    select: { codigo: true, nombre: true },
  });
}

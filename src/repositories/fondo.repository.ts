import { db } from "@/lib/db";

// Repositorio de fondos de carta (Capa 4).

export function listarFondos() {
  return db.fondoCarta.findMany({ orderBy: { orden: "asc" } });
}

// --- CRUD del catálogo (laboratorio del Súper Admin) ---

interface DatosFondo {
  codigo: string;
  nombre: string;
  descripcion: string;
  estilo: string;
  colorTexto: string | null;
  requisitoTipo: string;
  requisitoValor: string | null;
  orden: number;
}

export function codigoFondoExiste(codigo: string) {
  return db.fondoCarta.findUnique({ where: { codigo }, select: { id: true } });
}

export function crearFondo(data: DatosFondo) {
  return db.fondoCarta.create({ data, select: { id: true } });
}

export function actualizarFondo(id: string, data: Omit<DatosFondo, "codigo">) {
  return db.fondoCarta.update({ where: { id }, data, select: { id: true } });
}

export function eliminarFondo(id: string) {
  return db.fondoCarta.delete({ where: { id }, select: { id: true } });
}

/** ¿Algún jugador lo tiene equipado o desbloqueado? Bloquea el borrado. */
export async function fondoEnUso(fondoId: string): Promise<boolean> {
  const [desbloqueos, equipados] = await Promise.all([
    db.fondoDesbloqueado.count({ where: { fondoId } }),
    // tenant-global: catálogo global de fondos; cuenta uso cross-tenant antes de borrar (Súper Admin)
    db.jugador.count({ where: { fondoEquipadoId: fondoId } }),
  ]);
  return desbloqueos > 0 || equipados > 0;
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

export async function equiparFondoJugador(
  escuelaId: string | null,
  jugadorId: string,
  fondoEquipadoId: string | null,
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({
    where: { id: jugadorId, ...scope },
    data: { fondoEquipadoId },
  });
}

export function logrosCodigosDeJugador(jugadorId: string) {
  // tenant-global: filtrado por jugadorId; propiedad y tenant verificados en cargarHijo
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

import { db } from "@/lib/db";

// Repositorio de lectura para el dashboard del ESCUELA_ADMIN (Capa 4).
// Solo operaciones de lectura; sin lógica de negocio.

/** Conteo de jugadores por estado en la escuela. */
export async function contarJugadoresPorEstado(
  escuelaId: string,
): Promise<{ activos: number; pendientes: number; inactivos: number }> {
  const [activos, pendientes, inactivos] = await Promise.all([
    db.jugador.count({ where: { escuelaId, estado: "ACTIVO" } }),
    db.jugador.count({ where: { escuelaId, estado: "PENDIENTE" } }),
    db.jugador.count({ where: { escuelaId, estado: "INACTIVO" } }),
  ]);
  return { activos, pendientes, inactivos };
}

/**
 * Jugadores activos de la escuela con su última evaluación (stats).
 * Equivalente a listarPlantilla pero sin filtro de categorías del DT:
 * el ESCUELA_ADMIN ve toda la escuela.
 */
export function listarPlantillaEscuela(escuelaId: string) {
  return db.jugador.findMany({
    where: { escuelaId, estado: "ACTIVO" },
    include: {
      categoria: { select: { id: true, nombre: true } },
      stats: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
      },
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
}

/**
 * Porcentaje de asistencia del último mes en la escuela.
 * Filtra por evento.inicio en los últimos 30 días para no depender
 * de createdAt (el modelo Asistencia no tiene createdAt).
 * Devuelve 0 si no hay registros en el período.
 */
export async function calcularAsistenciaMes(escuelaId: string): Promise<number> {
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [total, presentes] = await Promise.all([
    db.asistencia.count({
      where: {
        escuelaId,
        evento: { inicio: { gte: hace30Dias } },
      },
    }),
    db.asistencia.count({
      where: {
        escuelaId,
        presente: true,
        evento: { inicio: { gte: hace30Dias } },
      },
    }),
  ]);

  if (total === 0) return 0;
  return Math.round((presentes / total) * 100);
}

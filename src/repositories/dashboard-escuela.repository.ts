import { db } from "@/lib/db";
import { statsVigentes } from "@/repositories/jugador.repository";

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
      // Misma definición de "carta vigente" que usa la plantilla del DT: por
      // fecha de evaluación y sin anuladas. Antes tenía su propia copia con el
      // criterio viejo, así que el promedio de OVR, la distribución de niveles
      // y el conteo de vencidas del dashboard incluían evaluaciones anuladas.
      stats: statsVigentes,
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
}

/**
 * Asistencias del último mes en la escuela: presentes sobre el total.
 * Filtra por evento.inicio en los últimos 30 días para no depender
 * de createdAt (el modelo Asistencia no tiene createdAt).
 *
 * Devuelve los CONTEOS crudos, no el porcentaje: derivarlo es lógica y esta
 * capa solo lee (ver encabezado del archivo). Lo calcula el servicio.
 */
export async function contarAsistenciaMes(
  escuelaId: string,
): Promise<{ presentes: number; total: number }> {
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

  return { presentes, total };
}

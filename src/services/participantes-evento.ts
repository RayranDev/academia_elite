import { NotFoundError } from "@/lib/errors";
import { idsActivosDeCategoria } from "@/repositories/jugador.repository";

/**
 * Validación de jugadores que llegan del cliente para escribir sobre un evento
 * (Modo Sesión). Un id suelto del cliente nunca se confía: sin esto, un request
 * armado a mano podía crear Asistencia/EstadisticaPartido para un jugador de
 * OTRA escuela o categoría, y el cron de la curva (que lee esas filas por
 * `jugadorId`) terminaba moviendo el rating de un jugador ajeno. Mismo criterio
 * que `pasarListaDt` y `cargarEstadisticasDt`.
 *
 * Es participante legítimo del evento quien:
 *  - está convocado a él, o
 *  - es jugador ACTIVO de la categoría del evento, en la escuela del evento
 *    (plantel completo: cubre un evento sin convocatoria, donde se pasa lista a
 *    toda la categoría).
 *
 * Un id ajeno o inexistente falla como NotFound, sin distinguir uno del otro:
 * no confirmamos la existencia de jugadores de otra escuela.
 */
export async function exigirParticipantesDelEvento(
  escuelaId: string,
  evento: { categoriaId: string; convocados: { jugadorId: string }[] },
  jugadorIds: (string | null | undefined)[],
): Promise<void> {
  const pedidos = [...new Set(jugadorIds.filter((id): id is string => !!id))];
  if (pedidos.length === 0) return;

  // Los convocados ya se validaron al convocarlos: no hace falta otra consulta.
  const convocados = new Set(evento.convocados.map((c) => c.jugadorId));
  const aVerificar = pedidos.filter((id) => !convocados.has(id));
  if (aVerificar.length === 0) return;

  const delPlantel = await idsActivosDeCategoria(
    escuelaId,
    evento.categoriaId,
    aVerificar,
  );
  if (delPlantel.length !== aVerificar.length) {
    throw new NotFoundError("Jugador no encontrado.");
  }
}

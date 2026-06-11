import type { AuthContext } from "@/lib/auth/context";
import { NotFoundError } from "@/lib/errors";
import { categoriasDelDt } from "@/services/dt-scope";
import { obtenerJugador } from "@/repositories/jugador.repository";
import { crearObjetivo } from "@/repositories/objetivo.repository";
import type { ObjetivoInput } from "@/lib/validators/objetivo";

/** El DT fija una meta de desarrollo para un jugador de su categoría. */
export async function crearObjetivoDt(
  ctx: AuthContext,
  input: ObjetivoInput,
): Promise<void> {
  const { escuelaId, entrenadorId, categoriaIds } = await categoriasDelDt(ctx);
  const jugador = await obtenerJugador(escuelaId, input.jugadorId);
  if (!jugador || !categoriaIds.includes(jugador.categoriaId)) {
    throw new NotFoundError("Jugador no encontrado.");
  }
  await crearObjetivo(escuelaId, {
    jugadorId: input.jugadorId,
    creadoPorEntrenadorId: entrenadorId,
    stat: input.stat,
    valorMeta: input.valorMeta,
    fechaLimite: input.fechaLimite,
  });
}

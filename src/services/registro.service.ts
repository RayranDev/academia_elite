import { ValidationError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth/password";
import { obtenerCodigoPorValor } from "@/repositories/codigo.repository";
import {
  emailExisteGlobal,
  buscarEscuelaPorSlugOCodigoRef,
} from "@/repositories/escuela.repository";
import { obtenerJugadorPorCodigo } from "@/repositories/jugador.repository";
import {
  crearPadreYJugadorConCodigo,
  vincularPadreAJugador,
} from "@/repositories/registro.repository";
import type { RegistroInput, VincularHijoInput } from "@/lib/validators/registro";

/**
 * Auto-registro del padre con código de invitación (público, sin ctx).
 * Crea la cuenta del padre (rol JUGADOR, gestionada por él) y el jugador en
 * estado PENDIENTE hasta que el DT lo apruebe. La escritura atómica (con la
 * re-lectura anti-carrera) vive en el repositorio.
 */
export async function registrarConCodigo(input: RegistroInput): Promise<void> {
  const codigo = await obtenerCodigoPorValor(input.codigo);
  const ahora = Date.now();
  const valido =
    codigo &&
    codigo.activo &&
    codigo.usos < codigo.usosMaximos &&
    codigo.expiraEn.getTime() > ahora;
  if (!valido) {
    throw new ValidationError("Código inválido, agotado o caducado.");
  }
  if (await emailExisteGlobal(input.padreEmail)) {
    throw new ValidationError("Ya existe una cuenta con ese email.");
  }

  const resultado = await crearPadreYJugadorConCodigo({
    codigoId: codigo.id,
    escuelaId: codigo.escuelaId,
    categoriaId: codigo.categoriaId,
    padreEmail: input.padreEmail,
    padrePasswordHash: await hashPassword(input.password),
    padreNombre: input.padreNombre,
    jugadorNombre: input.jugadorNombre,
    jugadorApellido: input.jugadorApellido,
    fechaNacimiento: input.fechaNacimiento,
    posicion: input.posicion,
  });
  if (!resultado.ok) {
    throw new ValidationError("El código acaba de agotarse.");
  }
}

/**
 * Registro del padre vinculándose a un hijo YA existente, con el código de la
 * escuela (slug o codigoRef) y el código del jugador (público, sin ctx). Crea la
 * cuenta del padre y la vincula al perfil del hijo en una transacción: si la
 * validación falla NO queda ninguna cuenta a medias.
 */
export async function registrarPadreYVincular(input: VincularHijoInput): Promise<void> {
  const escuela = await buscarEscuelaPorSlugOCodigoRef(input.codigoEscuela);
  if (!escuela) {
    throw new ValidationError("No encontramos esa escuela. Revisa el código de escuela.");
  }
  const jugador = await obtenerJugadorPorCodigo(escuela.id, input.codigoJugador);
  if (!jugador) {
    throw new ValidationError(
      "No encontramos un jugador con ese código en esa escuela. Verifica los datos con la escuela.",
    );
  }
  if (jugador.padreUserId) {
    // Duplicidad: ya tiene un padre vinculado. No se crea ninguna cuenta.
    throw new ValidationError(
      "Ese jugador ya tiene un padre/tutor vinculado. Si crees que es un error, contacta a la escuela.",
    );
  }
  if (await emailExisteGlobal(input.padreEmail)) {
    throw new ValidationError("Ya existe una cuenta con ese email.");
  }

  const resultado = await vincularPadreAJugador({
    jugadorId: jugador.id,
    escuelaId: escuela.id,
    padreEmail: input.padreEmail,
    padrePasswordHash: await hashPassword(input.password),
    padreNombre: input.padreNombre,
  });
  if (!resultado.ok) {
    throw new ValidationError("Ese jugador ya tiene un padre/tutor vinculado.");
  }
}

import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth/password";
import { generarCodigoInvitacion } from "@/lib/codes";
import { obtenerCodigoPorValor } from "@/repositories/codigo.repository";
import { emailExisteGlobal, slugExisteGlobal } from "@/repositories/escuela.repository";
import { obtenerJugadorPorCodigo } from "@/repositories/jugador.repository";
import type { RegistroInput, VincularHijoInput } from "@/lib/validators/registro";

/**
 * Auto-registro del padre con código de invitación (público, sin ctx).
 * Crea la cuenta del padre (rol JUGADOR, gestionada por él) y el jugador en
 * estado PENDIENTE hasta que el DT lo apruebe. Atómico; incrementa usos del código.
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

  const passwordHash = await hashPassword(input.password);

  await db.$transaction(async (tx) => {
    // Relectura del código dentro de la transacción para evitar exceder usos.
    const fresco = await tx.codigoInvitacion.findUnique({
      where: { id: codigo.id },
    });
    if (!fresco || fresco.usos >= fresco.usosMaximos || !fresco.activo) {
      throw new ValidationError("El código acaba de agotarse.");
    }

    const padre = await tx.user.create({
      data: {
        email: input.padreEmail,
        passwordHash,
        nombre: input.padreNombre,
        rol: "JUGADOR",
        escuelaId: codigo.escuelaId,
      },
    });
    await tx.jugador.create({
      data: {
        escuelaId: codigo.escuelaId,
        categoriaId: codigo.categoriaId,
        codigoJugador: generarCodigoInvitacion(),
        padreUserId: padre.id,
        cuentaUserId: padre.id,
        nombre: input.jugadorNombre,
        apellido: input.jugadorApellido,
        fechaNacimiento: input.fechaNacimiento,
        posicion: input.posicion,
        estado: "PENDIENTE",
      },
    });
    await tx.codigoInvitacion.update({
      where: { id: codigo.id },
      data: { usos: { increment: 1 } },
    });
  });
}

/**
 * Registro del padre vinculándose a un hijo YA existente, con el código de la
 * escuela (slug) y el código del jugador (público, sin ctx). Crea la cuenta del
 * padre y la vincula al perfil del hijo en una transacción: si la validación
 * falla NO queda ninguna cuenta a medias (no hay borrado lógico que limpiar).
 */
export async function registrarPadreYVincular(input: VincularHijoInput): Promise<void> {
  const escuela = await slugExisteGlobal(input.codigoEscuela);
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

  const passwordHash = await hashPassword(input.password);

  await db.$transaction(async (tx) => {
    // Re-verificación dentro de la transacción para evitar carreras.
    const fresco = await tx.jugador.findFirst({
      where: { id: jugador.id, escuelaId: escuela.id },
      select: { padreUserId: true },
    });
    if (!fresco || fresco.padreUserId) {
      throw new ValidationError("Ese jugador ya tiene un padre/tutor vinculado.");
    }
    const padre = await tx.user.create({
      data: {
        email: input.padreEmail,
        passwordHash,
        nombre: input.padreNombre,
        rol: "JUGADOR",
        escuelaId: escuela.id,
      },
    });
    await tx.jugador.update({
      where: { id: jugador.id },
      data: { padreUserId: padre.id },
    });
  });
}

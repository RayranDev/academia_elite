import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth/password";
import { obtenerCodigoPorValor } from "@/repositories/codigo.repository";
import { emailExisteGlobal } from "@/repositories/escuela.repository";
import type { RegistroInput } from "@/lib/validators/registro";

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

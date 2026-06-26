import { db } from "@/lib/db";
import { generarCodigoInvitacion } from "@/lib/codes";

/**
 * Repositorio de registro de familias (Capa 4). La atomicidad multi-tabla y las
 * re-lecturas anti-carrera (TOCTOU) viven acá, no en el servicio: la guarda final
 * debe ocurrir dentro de la misma transacción que la escritura. El servicio hace
 * la validación de negocio previa y mapea el resultado a un error de dominio.
 */

export type ResultadoRegistro = { ok: true } | { ok: false; motivo: "CODIGO_AGOTADO" };

export type ResultadoVinculacion =
  | { ok: true }
  | { ok: false; motivo: "YA_VINCULADO" };

/**
 * Crea (atómico) la cuenta del padre + el jugador PENDIENTE e incrementa los usos
 * del código. Re-lee el código dentro de la transacción para no exceder usos en
 * una carrera; si ya se agotó, no escribe nada y devuelve el motivo.
 */
export function crearPadreYJugadorConCodigo(input: {
  codigoId: string;
  escuelaId: string;
  categoriaId: string;
  padreEmail: string;
  padrePasswordHash: string;
  padreNombre: string;
  jugadorNombre: string;
  jugadorApellido: string;
  fechaNacimiento: Date;
  posicion: string;
}): Promise<ResultadoRegistro> {
  return db.$transaction(async (tx) => {
    // tenant-global: re-lectura del MISMO código (por id) ya validado por el
    // servicio; guarda anti-carrera dentro de la transacción.
    const fresco = await tx.codigoInvitacion.findUnique({
      where: { id: input.codigoId },
    });
    if (!fresco || fresco.usos >= fresco.usosMaximos || !fresco.activo) {
      return { ok: false, motivo: "CODIGO_AGOTADO" };
    }

    const padre = await tx.user.create({
      data: {
        email: input.padreEmail,
        passwordHash: input.padrePasswordHash,
        nombre: input.padreNombre,
        rol: "JUGADOR",
        escuelaId: input.escuelaId,
      },
    });
    await tx.jugador.create({
      data: {
        escuelaId: input.escuelaId,
        categoriaId: input.categoriaId,
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
    // tenant-global: incrementa los usos del mismo código ya validado en esta tx.
    await tx.codigoInvitacion.update({
      where: { id: input.codigoId },
      data: { usos: { increment: 1 } },
    });
    return { ok: true };
  });
}

/**
 * Crea (atómico) la cuenta del padre y la vincula a un jugador YA existente.
 * Re-lee el jugador dentro de la transacción: si ya tiene padre, no escribe nada
 * y devuelve el motivo (evita doble vinculación en una carrera).
 */
export function vincularPadreAJugador(input: {
  jugadorId: string;
  escuelaId: string;
  padreEmail: string;
  padrePasswordHash: string;
  padreNombre: string;
}): Promise<ResultadoVinculacion> {
  return db.$transaction(async (tx) => {
    const fresco = await tx.jugador.findFirst({
      where: { id: input.jugadorId, escuelaId: input.escuelaId },
      select: { padreUserId: true },
    });
    if (!fresco || fresco.padreUserId) {
      return { ok: false, motivo: "YA_VINCULADO" };
    }

    const padre = await tx.user.create({
      data: {
        email: input.padreEmail,
        passwordHash: input.padrePasswordHash,
        nombre: input.padreNombre,
        rol: "JUGADOR",
        escuelaId: input.escuelaId,
      },
    });
    // tenant-global: el jugador ya fue verificado por id + escuelaId en el
    // findFirst previo de esta misma transacción.
    await tx.jugador.update({
      where: { id: input.jugadorId },
      data: { padreUserId: padre.id },
    });
    return { ok: true };
  });
}

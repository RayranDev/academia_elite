import type { AuthContext } from "@/lib/auth/context";
import {
  requireRole,
  requireEscuela,
  assertTenant,
  assertMotivoSoporte,
  assertSoportePuedeEscribir,
} from "@/lib/auth/guards";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { hashPassword, generarPasswordTemporal } from "@/lib/auth/password";
import type { AltaJugadorInput } from "@/lib/validators/alta-jugador";
import {
  alcanceDeRol,
  datosDeJugador,
  datosDeFamilia,
  fichaParaGuardar,
  fichaTieneDatos,
  detalleAuditoriaAlta,
} from "@/lib/jugadores/alta";
import { categoriasDelDt } from "@/services/dt-scope";
import { registrarAuditoria } from "@/services/audit.service";
import { contarCategoriasDeEscuela } from "@/repositories/categoria.repository";
import { emailExisteGlobal } from "@/repositories/escuela.repository";
import { buscarFamiliaDeEscuela } from "@/repositories/user.repository";
import {
  crearJugadorConFamilia,
  type FamiliaParaAlta,
  type ResultadoAltaJugador as ResultadoRepoAlta,
} from "@/repositories/jugador.repository";

/** Qué pasó con la familia del jugador recién creado. */
export type FamiliaAlta =
  | { tipo: "CREADA"; email: string; passwordTemporal: string }
  | { tipo: "VINCULADA"; email: string; nombre: string }
  | null;

export interface ResultadoAltaJugador {
  jugadorId: string;
  nombreCompleto: string;
  codigoJugador: string | null;
  /** Se guardó algún dato de la ficha administrativa o médica. */
  fichaCargada: boolean;
  /** Se guardaron datos de salud (hubo autorización específica). */
  saludGuardada: boolean;
  familia: FamiliaAlta;
}

/**
 * Resuelve sobre qué escuela se escribe y valida que la categoría sea válida
 * PARA QUIEN da de alta: el DT solo en sus categorías, la escuela en las suyas y
 * el Súper Admin únicamente dentro de una sesión de soporte habilitada.
 */
async function resolverDestino(
  ctx: AuthContext,
  categoriaId: string,
): Promise<{ escuelaId: string; motivoSoporte?: string }> {
  requireRole(ctx, ["DT", "ESCUELA_ADMIN", "SUPER_ADMIN"]);

  if (ctx.rol === "DT") {
    const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
    if (!categoriaIds.includes(categoriaId)) {
      throw new ValidationError("Esa categoría no está entre las tuyas.");
    }
    return { escuelaId };
  }

  let escuelaId: string;
  let motivoSoporte: string | undefined;
  if (ctx.rol === "SUPER_ADMIN") {
    // Sin sesión de soporte no hay tenant al que escribir (M2): mismo patrón que
    // `assertTenant`, que además rechaza una escuela distinta a la de la sesión.
    if (!ctx.soporte) throw new ForbiddenError("Abre una sesión de soporte.");
    escuelaId = ctx.soporte.escuelaId;
    assertTenant(ctx, escuelaId);
    assertSoportePuedeEscribir(ctx);
    motivoSoporte = ctx.soporte.motivo;
    assertMotivoSoporte(ctx, motivoSoporte);
  } else {
    escuelaId = requireEscuela(ctx);
  }

  if ((await contarCategoriasDeEscuela(escuelaId, [categoriaId])) !== 1) {
    throw new ValidationError("Esa categoría no pertenece a la escuela.");
  }
  return { escuelaId, motivoSoporte };
}

/**
 * Decide qué hacer con el acudiente: nada, crear su cuenta o vincular al
 * jugador con una cuenta de familia que YA existe en esta escuela (hermanos).
 * Un correo que pertenece a otra escuela o a otro rol se rechaza SIN decir de
 * quién es: no se confirma la existencia de cuentas ajenas.
 */
async function resolverFamilia(
  escuelaId: string,
  input: AltaJugadorInput,
): Promise<{ familia: FamiliaParaAlta | null; passwordTemporal?: string; nombreExistente?: string }> {
  const datos = datosDeFamilia(input);
  if (!datos) return { familia: null };

  const existente = await buscarFamiliaDeEscuela(escuelaId, datos.email);
  if (existente) {
    return {
      familia: { tipo: "VINCULAR", userId: existente.id },
      nombreExistente: existente.nombre,
    };
  }
  if (await emailExisteGlobal(datos.email)) {
    throw new ValidationError("Ya existe una cuenta con ese correo.");
  }

  const passwordTemporal = generarPasswordTemporal();
  return {
    familia: {
      tipo: "CREAR",
      ...datos,
      passwordHash: await hashPassword(passwordTemporal),
    },
    passwordTemporal,
  };
}

function esViolacionDeUnico(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "P2002"
  );
}

/**
 * Alta completa de un jugador: identidad, ficha administrativa y médica y
 * acudiente, todo en UNA transacción. Lo usan el DT y la escuela (y el Súper
 * Admin en soporte); cambia el alcance sobre la ficha, no el flujo.
 *
 * Seguridad y habeas data (HABEAS-DATA.md §6-7):
 *  - el alcance se decide por ROL en el servidor: el DT no guarda documento ni
 *    EPS/RH/condiciones aunque el request los traiga;
 *  - sin `autorizaDatosSalud` no se guarda ningún dato de salud;
 *  - la contraseña del acudiente es temporal y cripto-segura, se devuelve UNA
 *    vez y no se almacena ni se audita en claro;
 *  - el AuditLog dice QUÉ se cargó, no los valores sensibles.
 */
export async function crearJugadorCompleto(
  ctx: AuthContext,
  input: AltaJugadorInput,
): Promise<ResultadoAltaJugador> {
  const alcance = alcanceDeRol(ctx.rol);
  const { escuelaId, motivoSoporte } = await resolverDestino(ctx, input.categoriaId);
  const { familia, passwordTemporal, nombreExistente } = await resolverFamilia(escuelaId, input);

  const ficha = fichaParaGuardar(input, alcance);
  const datos = { ...datosDeJugador(input), ...ficha };

  let res: ResultadoRepoAlta;
  try {
    res = await crearJugadorConFamilia(escuelaId, datos, familia);
  } catch (e) {
    // Carrera: dos altas con el mismo correo a la vez. La restricción única de
    // la base es la guarda final; la transacción ya revirtió todo.
    if (esViolacionDeUnico(e)) throw new ValidationError("Ya existe una cuenta con ese correo.");
    throw e;
  }
  if (!res.ok) throw new ValidationError("No encontramos la cuenta de la familia. Vuelve a intentarlo.");

  const tipoFamilia = familia?.tipo === "CREAR" ? "CREADA" : familia ? "VINCULADA" : "NINGUNA";
  await registrarAuditoria(ctx, {
    accion: "CREAR_JUGADOR",
    entidad: "Jugador",
    entidadId: res.jugadorId,
    escuelaId,
    motivo: detalleAuditoriaAlta({ ficha, familia: tipoFamilia, motivoSoporte }),
  });
  if (res.familiaCreadaId) {
    await registrarAuditoria(ctx, {
      accion: "CREAR_CUENTA_FAMILIA",
      entidad: "User",
      entidadId: res.familiaCreadaId,
      escuelaId,
      motivo: motivoSoporte,
    });
  }

  return {
    jugadorId: res.jugadorId,
    nombreCompleto: `${input.nombre} ${input.apellido}`,
    codigoJugador: res.codigoJugador,
    fichaCargada: fichaTieneDatos(ficha),
    saludGuardada: ficha.autorizaDatosSalud,
    familia:
      familia?.tipo === "CREAR" && passwordTemporal
        ? { tipo: "CREADA", email: familia.email, passwordTemporal }
        : familia?.tipo === "VINCULAR"
          ? {
              tipo: "VINCULADA",
              email: datosDeFamilia(input)?.email ?? "",
              nombre: nombreExistente ?? "",
            }
          : null,
  };
}

import type { Rol } from "@/types";
import { ForbiddenError } from "@/lib/errors";
import { hayAcudiente, type AltaJugadorInput } from "@/lib/validators/alta-jugador";

/**
 * Reglas PURAS del alta completa de un jugador: qué se guarda según quién da de
 * alta, cómo se aplica el consentimiento de salud y qué se arma para el
 * acudiente. Sin Prisma ni React: el servicio orquesta y estas reglas se prueban
 * solas (HABEAS-DATA.md §6-7, DECISIONES #67-68).
 */

/**
 * Alcance sobre la ficha. Es el mismo reparto que ya rige la LECTURA
 * (DECISIONES #68): la escuela ve y carga la ficha completa; el DT solo lo que
 * necesita en cancha —contacto de emergencia, autorización de traslado,
 * alergias y apto médico—, nunca documento ni EPS. Escribir lo que no se puede
 * leer tampoco corresponde: sería recolectar un dato sensible sin necesidad.
 */
export type AlcanceAlta = "DT" | "ESCUELA";

export function alcanceDeRol(rol: Rol): AlcanceAlta {
  switch (rol) {
    case "DT":
      return "DT";
    case "ESCUELA_ADMIN":
    case "SUPER_ADMIN":
      return "ESCUELA";
    default:
      throw new ForbiddenError();
  }
}

/** Datos propios del jugador (identidad), listos para la tabla. */
export function datosDeJugador(input: AltaJugadorInput) {
  return {
    categoriaId: input.categoriaId,
    nombre: input.nombre,
    apellido: input.apellido,
    fechaNacimiento: input.fechaNacimiento,
    posicion: input.posicion,
    dorsal: input.dorsal ?? null,
    genero: input.genero ?? null,
    // Parentesco del acudiente con el jugador: vive en `Jugador`, no en `User`.
    parentescoAcudiente: hayAcudiente(input) ? input.acudienteParentesco : null,
  };
}

/**
 * Contacto de emergencia final. Con "usar los datos del acudiente" se rellenan
 * SOLO los campos que el usuario dejó vacíos: lo que escribió a mano gana.
 */
export function resolverContactoEmergencia(input: AltaJugadorInput) {
  const copiar = input.contactoEsAcudiente && hayAcudiente(input);
  return {
    contactoEmergenciaNombre:
      input.contactoEmergenciaNombre ?? (copiar ? input.acudienteNombre : null),
    contactoEmergenciaTelefono:
      input.contactoEmergenciaTelefono ?? (copiar ? (input.acudienteTelefono ?? null) : null),
    contactoEmergenciaParentesco:
      input.contactoEmergenciaParentesco ?? (copiar ? input.acudienteParentesco : null),
  };
}

/**
 * Ficha administrativa y médica a guardar.
 *
 * - Sin `autorizaDatosSalud` se DESCARTA todo dato de salud (art. 9 Ley 1581:
 *   la autorización es previa a la recolección, no solo a la exhibición; mismo
 *   criterio que `actualizarFichaMedica`).
 * - El DT no guarda documento, EPS, RH ni condiciones médicas aunque el request
 *   los traiga: la restricción es del servidor, no de la UI.
 * - Contacto de emergencia y traslado no son datos de salud: no dependen del
 *   consentimiento específico.
 */
export function fichaParaGuardar(
  input: AltaJugadorInput,
  alcance: AlcanceAlta,
  ahora: Date = new Date(),
) {
  const escuela = alcance === "ESCUELA";
  const salud = input.autorizaDatosSalud;
  return {
    tipoDocumento: escuela ? input.tipoDocumento : null,
    numeroDocumento: escuela ? input.numeroDocumento : null,
    eps: escuela && salud ? input.eps : null,
    rh: escuela && salud ? input.rh : null,
    condicionesMedicas: escuela && salud ? input.condicionesMedicas : null,
    alergias: salud ? input.alergias : null,
    aptoMedicoVence: salud ? input.aptoMedicoVence : null,
    ...resolverContactoEmergencia(input),
    autorizaTraslado: input.autorizaTraslado,
    autorizaDatosSalud: salud,
    autorizacionDatosSaludEn: salud ? ahora : null,
  };
}

type FichaGuardada = ReturnType<typeof fichaParaGuardar>;

/** ¿Quedó algo cargado en la ficha? (para informarlo y auditarlo) */
export function fichaTieneDatos(f: FichaGuardada): boolean {
  return (
    [
      f.tipoDocumento,
      f.numeroDocumento,
      f.eps,
      f.rh,
      f.condicionesMedicas,
      f.alergias,
      f.aptoMedicoVence,
      f.contactoEmergenciaNombre,
      f.contactoEmergenciaTelefono,
      f.contactoEmergenciaParentesco,
    ].some((v) => v != null) ||
    f.autorizaTraslado ||
    f.autorizaDatosSalud
  );
}

/** Datos de la cuenta del acudiente, o null si no se cargó ninguno. */
export function datosDeFamilia(input: AltaJugadorInput) {
  if (!hayAcudiente(input) || !input.acudienteNombre || !input.acudienteEmail) return null;
  return {
    nombre: input.acudienteNombre,
    email: input.acudienteEmail,
    telefono: input.acudienteTelefono ?? null,
    tipoDocumento: input.acudienteTipoDocumento,
    numeroDocumento: input.acudienteNumeroDocumento ?? null,
    direccion: input.acudienteDireccion,
  };
}

/**
 * Detalle que va al `motivo` del AuditLog. Dice QUÉ se cargó (no los valores:
 * el log no debe duplicar datos sensibles) y cómo quedó la familia.
 */
export function detalleAuditoriaAlta(args: {
  ficha: FichaGuardada;
  familia: "CREADA" | "VINCULADA" | "NINGUNA";
  motivoSoporte?: string;
}): string {
  return [
    args.motivoSoporte?.trim(),
    `ficha=${fichaTieneDatos(args.ficha) ? "si" : "no"}`,
    `salud=${args.ficha.autorizaDatosSalud ? "autorizada" : "no"}`,
    `familia=${args.familia.toLowerCase()}`,
    args.familia === "CREADA" ? "autorizacionAcudiente=declarada por quien da de alta" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

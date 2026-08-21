import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  listarConceptosCobro,
  obtenerConceptoCobro,
  obtenerConceptoPorCodigo,
  crearConceptoCobro,
  actualizarConceptoCobro,
  borrarConceptoCobro,
  usoDeConcepto,
  usoDeTodosLosConceptos,
  sembrarConceptosDeSistema,
} from "@/repositories/concepto-cobro.repository";
import { registrarAuditoria } from "@/services/audit.service";
import {
  codigoDisponible,
  CODIGO_MENSUALIDAD,
  type CrearConceptoCobroInput,
  type EditarConceptoCobroInput,
} from "@/lib/validators/concepto-cobro";

export interface ConceptoCobroDTO {
  id: string;
  codigo: string;
  nombre: string;
  esSistema: boolean;
  activo: boolean;
}

export interface ConceptoCobroConUsoDTO extends ConceptoCobroDTO {
  /** Cuántas cuotas lo usan. Si es > 0 el concepto ya no se puede borrar. */
  cuotas: number;
  aranceles: number;
}

function aDTO(c: {
  id: string;
  codigo: string;
  nombre: string;
  esSistema: boolean;
  activo: boolean;
}): ConceptoCobroDTO {
  return {
    id: c.id,
    codigo: c.codigo,
    nombre: c.nombre,
    esSistema: c.esSistema,
    activo: c.activo,
  };
}

/**
 * Catálogo de la escuela. `soloActivos` lo usan los formularios que emiten
 * cobranza (no tiene sentido cobrar con un concepto archivado); el listado de
 * administración los trae todos para poder reactivarlos.
 */
export async function listarConceptosEscuela(
  ctx: AuthContext,
  soloActivos = false,
): Promise<ConceptoCobroDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const rows = await listarConceptosCobro(escuelaId, soloActivos);
  return rows.map(aDTO);
}

/** Igual que el anterior pero con el uso de cada concepto, para la pantalla de gestión. */
export async function listarConceptosConUso(
  ctx: AuthContext,
): Promise<ConceptoCobroConUsoDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const [rows, uso] = await Promise.all([
    listarConceptosCobro(escuelaId),
    usoDeTodosLosConceptos(escuelaId),
  ]);
  return rows.map((c) => ({
    ...aDTO(c),
    ...(uso.get(c.id) ?? { cuotas: 0, aranceles: 0 }),
  }));
}

/**
 * Resuelve un `conceptoId` del tenant, o falla. Toda acción que reciba un
 * concepto por formulario tiene que pasar por acá: el id llega del cliente y no
 * se confía en él (AGENTS.md §5). El cruce de tenant devuelve NotFound, no
 * Forbidden — no confirmamos que el concepto exista en otra escuela.
 *
 * Recibe el `ctx` y NO un `escuelaId` suelto a propósito: es superficie pública
 * del módulo, así que aplica sus propios guards en vez de confiar en que el que
 * llama ya los corrió. Una firma con `escuelaId: string` deja que la próxima
 * action lo invoque directo y resuelva un concepto sin sesión ni rol.
 */
export async function resolverConceptoDelTenant(
  ctx: AuthContext,
  conceptoId: string,
): Promise<{ id: string; nombre: string; activo: boolean }> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const concepto = await obtenerConceptoCobro(escuelaId, conceptoId);
  if (!concepto) throw new NotFoundError("Concepto de cobro no encontrado.");
  return concepto;
}

/**
 * Igual que `resolverConceptoDelTenant`, pero además exige que el concepto esté
 * ACTIVO. Es el que usan las escrituras.
 *
 * Sin esto, archivar no significaba nada: los formularios solo ofrecen conceptos
 * activos, pero una Server Action es un endpoint HTTP y el `<select>` no es una
 * barrera. Un POST con el id de un concepto archivado emitía cobranza igual — y
 * archivar es la ÚNICA baja disponible para los conceptos de sistema.
 *
 * Las LECTURAS siguen resolviendo archivados a propósito: la tabla de precios
 * tiene que poder mostrar el nombre de un concepto que la escuela archivó
 * después, y `ConceptoSelect` lo pinta como opción deshabilitada.
 */
export async function resolverConceptoActivo(
  ctx: AuthContext,
  conceptoId: string,
): Promise<{ id: string; nombre: string; activo: boolean }> {
  const concepto = await resolverConceptoDelTenant(ctx, conceptoId);
  if (!concepto.activo) {
    throw new ValidationError(
      `El concepto "${concepto.nombre}" está archivado. Reactívalo antes de cobrar con él.`,
    );
  }
  return concepto;
}

/**
 * El concepto MENSUALIDAD de la escuela. Es el default de la cobranza masiva, y
 * se siembra solo si el tenant quedó sin catálogo (escuelas creadas antes de la
 * migración por algún camino que no pasó por el alta normal).
 *
 * Mismo criterio de firma que `resolverConceptoDelTenant`: con `ctx`, no con un
 * `escuelaId` suelto — acá además hay una ESCRITURA (la siembra) detrás.
 */
export async function conceptoMensualidad(ctx: AuthContext): Promise<string> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const existente = await obtenerConceptoPorCodigo(escuelaId, CODIGO_MENSUALIDAD);
  if (existente) return existente.id;

  await sembrarConceptosDeSistema(escuelaId);
  const sembrado = await obtenerConceptoPorCodigo(escuelaId, CODIGO_MENSUALIDAD);
  if (!sembrado) {
    throw new ValidationError("La escuela no tiene conceptos de cobro cargados.");
  }
  return sembrado.id;
}

/** Alta de un concepto propio de la escuela ("Torneo Bogotá 2026"). Auditada. */
export async function crearConceptoEscuela(
  ctx: AuthContext,
  input: CrearConceptoCobroInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  // El NOMBRE también se deduplica, no solo el código. Dos conceptos "Torneo"
  // quedan como TORNEO y TORNEO_2, pero la UI muestra el nombre y nunca el
  // código: el usuario ve dos opciones idénticas en el `<select>` y no tiene
  // forma de distinguirlas, con la cobranza repartida entre las dos.
  // Compara sin distinguir mayúsculas ni espacios de más: "Torneo" y "torneo "
  // son el mismo concepto para quien lo elige de una lista.
  const existentes = await listarConceptosCobro(escuelaId);
  const normalizar = (v: string) => v.trim().toLowerCase();
  if (existentes.some((c) => normalizar(c.nombre) === normalizar(input.nombre))) {
    throw new ValidationError("Ya tienes un concepto con ese nombre.");
  }

  const ocupados = new Set(existentes.map((c) => c.codigo));
  const creado = await crearConceptoCobro(escuelaId, {
    codigo: codigoDisponible(input.nombre, ocupados),
    nombre: input.nombre,
  });

  await registrarAuditoria(ctx, {
    accion: "CONCEPTO_COBRO_CREAR",
    entidad: "ConceptoCobro",
    entidadId: creado.id,
    escuelaId,
    motivo: input.nombre,
  });
}

/**
 * Renombra o archiva un concepto. Los de sistema TAMBIÉN se renombran (una
 * escuela que le dice "pensión" a la mensualidad tiene razón), pero NO se
 * archivan: sin mensualidad no hay cobranza masiva posible.
 */
export async function editarConceptoEscuela(
  ctx: AuthContext,
  input: EditarConceptoCobroInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const concepto = await obtenerConceptoCobro(escuelaId, input.id);
  if (!concepto) throw new NotFoundError("Concepto de cobro no encontrado.");
  if (concepto.esSistema && !input.activo) {
    throw new ValidationError(
      "Los conceptos de la plataforma se pueden renombrar, pero no archivar.",
    );
  }
  // Mismo criterio que en el alta: renombrar tampoco puede dejar dos conceptos
  // con el mismo nombre, que en el `<select>` son dos opciones indistinguibles.
  const normalizar = (v: string) => v.trim().toLowerCase();
  const otros = await listarConceptosCobro(escuelaId);
  if (
    otros.some(
      (c) => c.id !== input.id && normalizar(c.nombre) === normalizar(input.nombre),
    )
  ) {
    throw new ValidationError("Ya tienes un concepto con ese nombre.");
  }

  await actualizarConceptoCobro(escuelaId, input.id, {
    nombre: input.nombre,
    activo: input.activo,
  });
  await registrarAuditoria(ctx, {
    accion: "CONCEPTO_COBRO_EDITAR",
    entidad: "ConceptoCobro",
    entidadId: input.id,
    escuelaId,
    motivo: `${concepto.nombre} → ${input.nombre}${input.activo ? "" : " (archivado)"}`,
  });
}

/**
 * Borra un concepto propio SIN uso. Con cuotas o precios encima no se borra: se
 * archiva (`activo: false`). Borrarlo dejaría huérfano el historial de cobranza,
 * que es justo lo que un balance no puede permitirse.
 */
export async function borrarConceptoEscuela(
  ctx: AuthContext,
  conceptoId: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const concepto = await obtenerConceptoCobro(escuelaId, conceptoId);
  if (!concepto) throw new NotFoundError("Concepto de cobro no encontrado.");
  if (concepto.esSistema) {
    throw new ValidationError("Los conceptos de la plataforma no se borran.");
  }

  const uso = await usoDeConcepto(escuelaId, conceptoId);
  if (uso.cuotas > 0 || uso.aranceles > 0) {
    throw new ValidationError(
      "Ese concepto ya tiene cuotas o precios cargados: archívalo en vez de borrarlo.",
    );
  }

  await borrarConceptoCobro(escuelaId, conceptoId);
  await registrarAuditoria(ctx, {
    accion: "CONCEPTO_COBRO_BORRAR",
    entidad: "ConceptoCobro",
    entidadId: conceptoId,
    escuelaId,
    motivo: concepto.nombre,
  });
}

// `sembrarConceptosDeSistema` NO se reexporta: sería una escritura del
// repositorio pasando por la capa de servicios sin ganar un solo guard. El alta
// de escuela la importa del repositorio, que es donde vive.

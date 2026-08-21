import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  listarAranceles,
  obtenerArancel,
  crearArancel,
  reemplazarArancel,
  desactivarArancel,
  actualizarArancel,
} from "@/repositories/arancel.repository";
import { listarCategorias } from "@/repositories/categoria.repository";
import {
  resolverConceptoDelTenant,
  resolverConceptoActivo,
} from "@/services/concepto-cobro.service";
import { registrarAuditoria } from "@/services/audit.service";
import type { ArancelInput, EditarArancelInput } from "@/lib/validators/arancel";

export interface ArancelDTO {
  id: string;
  categoriaId: string | null;
  categoriaNombre: string;
  conceptoId: string;
  /** Nombre actual del concepto. La UI muestra esto, nunca el `codigo`. */
  conceptoNombre: string;
  monto: number;
  descripcion: string | null;
  vigenteDesde: string;
  activo: boolean;
}

/** `Decimal` de Prisma nunca sale hacia la UI (AGENTS.md §4: DTOs planos). */
function aNumero(valor: { toString(): string }): number {
  return Number(valor.toString());
}

export async function listarArancelesEscuela(
  ctx: AuthContext,
): Promise<ArancelDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const rows = await listarAranceles(escuelaId);
  return rows.map((a) => ({
    id: a.id,
    categoriaId: a.categoriaId,
    categoriaNombre: a.categoria?.nombre ?? "Todas las categorías",
    conceptoId: a.conceptoId,
    conceptoNombre: a.conceptoCobro.nombre,
    monto: aNumero(a.monto),
    descripcion: a.descripcion,
    vigenteDesde: a.vigenteDesde.toISOString(),
    activo: a.activo,
  }));
}

/**
 * Alta de un precio. Auditada: define cuánto se le cobra a una familia.
 *
 * Si `reemplazarId` viene, no es un alta suelta: es "este precio activo quedó
 * viejo, dalo de baja y creá el nuevo" en una sola transacción (lo dispara el
 * aviso de duplicado de la UI, ver ArancelesPanel). Ambas acciones se auditan
 * por separado: la baja y el alta son eventos distintos para quien revise el
 * historial después.
 */
export async function crearArancelEscuela(
  ctx: AuthContext,
  input: ArancelInput,
  reemplazarId?: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  // La categoría tiene que ser del tenant. No se confía en el id del formulario:
  // se comprueba contra las categorías de esta escuela (AGENTS.md §5).
  if (input.categoriaId) {
    const categorias = await listarCategorias(escuelaId);
    if (!categorias.some((c) => c.id === input.categoriaId)) {
      throw new NotFoundError("Categoría no encontrada.");
    }
  }
  // Mismo criterio con el concepto: llega como id desde el formulario.
  const concepto = await resolverConceptoActivo(ctx, input.conceptoId);

  if (reemplazarId) {
    const previo = await obtenerArancel(escuelaId, reemplazarId);
    if (!previo) throw new NotFoundError("Precio a reemplazar no encontrado.");
    if (!previo.activo) throw new ValidationError("Ese precio ya está inactivo.");

    const creado = await reemplazarArancel(escuelaId, reemplazarId, {
      categoriaId: input.categoriaId,
      conceptoId: input.conceptoId,
      monto: input.monto,
      descripcion: input.descripcion,
      vigenteDesde: input.vigenteDesde,
    });

    await registrarAuditoria(ctx, {
      accion: "ARANCEL_DESACTIVAR",
      entidad: "Arancel",
      entidadId: reemplazarId,
      escuelaId,
      motivo: "Reemplazado por precio nuevo",
    });
    await registrarAuditoria(ctx, {
      accion: "ARANCEL_CREAR",
      entidad: "Arancel",
      entidadId: creado.id,
      escuelaId,
      motivo: `${concepto.nombre} ${input.monto}`,
    });
    return;
  }

  const creado = await crearArancel(escuelaId, {
    categoriaId: input.categoriaId,
    conceptoId: input.conceptoId,
    monto: input.monto,
    descripcion: input.descripcion,
    vigenteDesde: input.vigenteDesde,
  });
  await registrarAuditoria(ctx, {
    accion: "ARANCEL_CREAR",
    entidad: "Arancel",
    entidadId: creado.id,
    escuelaId,
    motivo: `${concepto.nombre} ${input.monto}`,
  });
}

/** Baja lógica: el precio viejo queda como historial, nunca se borra. */
export async function desactivarArancelEscuela(
  ctx: AuthContext,
  arancelId: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const a = await obtenerArancel(escuelaId, arancelId);
  if (!a) throw new NotFoundError("Arancel no encontrado.");
  if (!a.activo) throw new ValidationError("Ese precio ya está inactivo.");

  const concepto = await resolverConceptoDelTenant(ctx, a.conceptoId);
  await desactivarArancel(escuelaId, arancelId);
  await registrarAuditoria(ctx, {
    accion: "ARANCEL_DESACTIVAR",
    entidad: "Arancel",
    entidadId: arancelId,
    escuelaId,
    motivo: concepto.nombre,
  });
}

/** Edita un precio existente (categoría, concepto, monto, descripción, vigencia). */
export async function editarArancelEscuela(
  ctx: AuthContext,
  input: EditarArancelInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  if (input.categoriaId) {
    const categorias = await listarCategorias(escuelaId);
    if (!categorias.some((c) => c.id === input.categoriaId)) {
      throw new NotFoundError("Categoría no encontrada.");
    }
  }

  const previo = await obtenerArancel(escuelaId, input.id);
  if (!previo) throw new NotFoundError("Arancel no encontrado.");

  // Exige concepto ACTIVO solo si lo está CAMBIANDO. Si el precio ya colgaba de
  // un concepto que la escuela archivó después, corregirle el monto tiene que
  // seguir siendo posible: `ConceptoSelect` justamente lo muestra deshabilitado
  // para que se pueda guardar el resto sin reasignarlo. Bloquear acá dejaba ese
  // precio imposible de editar — pero sí de dar de baja, que usa el resolver
  // sin filtro.
  const concepto =
    input.conceptoId === previo.conceptoId
      ? await resolverConceptoDelTenant(ctx, input.conceptoId)
      : await resolverConceptoActivo(ctx, input.conceptoId);

  const { count } = await actualizarArancel(escuelaId, input.id, {
    categoriaId: input.categoriaId,
    conceptoId: input.conceptoId,
    monto: input.monto,
    descripcion: input.descripcion,
    vigenteDesde: input.vigenteDesde,
  });
  if (count === 0) throw new NotFoundError("Arancel no encontrado.");

  await registrarAuditoria(ctx, {
    accion: "ARANCEL_EDITAR",
    entidad: "Arancel",
    entidadId: input.id,
    escuelaId,
    motivo: `${concepto.nombre} ${input.monto}`,
  });
}

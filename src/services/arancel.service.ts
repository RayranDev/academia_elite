import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  listarAranceles,
  obtenerArancel,
  crearArancel,
  desactivarArancel,
} from "@/repositories/arancel.repository";
import { listarCategorias } from "@/repositories/categoria.repository";
import { registrarAuditoria } from "@/services/audit.service";
import type { ArancelInput } from "@/lib/validators/arancel";

export interface ArancelDTO {
  id: string;
  categoriaId: string | null;
  categoriaNombre: string;
  concepto: string;
  monto: number;
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
    concepto: a.concepto,
    monto: aNumero(a.monto),
    vigenteDesde: a.vigenteDesde.toISOString(),
    activo: a.activo,
  }));
}

/** Alta de un precio. Auditada: define cuánto se le cobra a una familia. */
export async function crearArancelEscuela(
  ctx: AuthContext,
  input: ArancelInput,
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

  const creado = await crearArancel(escuelaId, {
    categoriaId: input.categoriaId,
    concepto: input.concepto,
    monto: input.monto,
    vigenteDesde: input.vigenteDesde,
  });
  await registrarAuditoria(ctx, {
    accion: "ARANCEL_CREAR",
    entidad: "Arancel",
    entidadId: creado.id,
    escuelaId,
    motivo: `${input.concepto} ${input.monto}`,
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

  await desactivarArancel(escuelaId, arancelId);
  await registrarAuditoria(ctx, {
    accion: "ARANCEL_DESACTIVAR",
    entidad: "Arancel",
    entidadId: arancelId,
    escuelaId,
    motivo: a.concepto,
  });
}

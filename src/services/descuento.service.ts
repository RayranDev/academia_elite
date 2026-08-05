import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  listarDescuentoReglas,
  obtenerDescuentoRegla,
  crearDescuentoRegla,
  actualizarDescuentoRegla,
  desactivarDescuentoRegla,
  jugadoresAsignados,
  asignarJugadoresARegla,
} from "@/repositories/descuento.repository";
import { listarCategorias } from "@/repositories/categoria.repository";
import { listarJugadoresGestion } from "@/repositories/jugador.repository";
import { registrarAuditoria } from "@/services/audit.service";
import type {
  DescuentoReglaInput,
  EditarDescuentoReglaInput,
} from "@/lib/validators/descuento";

export interface DescuentoReglaDTO {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  nombre: string;
  tipo: string;
  valor: number;
  activo: boolean;
}

/** `Decimal` de Prisma nunca sale hacia la UI (AGENTS.md §4: DTOs planos). */
function aNumero(valor: { toString(): string }): number {
  return Number(valor.toString());
}

export async function listarDescuentoReglasEscuela(
  ctx: AuthContext,
): Promise<DescuentoReglaDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const rows = await listarDescuentoReglas(escuelaId);
  return rows.map((r) => ({
    id: r.id,
    categoriaId: r.categoriaId,
    categoriaNombre: r.categoria.nombre,
    nombre: r.nombre,
    tipo: r.tipo,
    valor: aNumero(r.valor),
    activo: r.activo,
  }));
}

/** La categoría de `input` tiene que ser del tenant (nunca se confía en el id del formulario). */
async function validarCategoriaDelTenant(
  escuelaId: string,
  categoriaId: string,
): Promise<void> {
  const categorias = await listarCategorias(escuelaId);
  if (!categorias.some((c) => c.id === categoriaId)) {
    throw new NotFoundError("Categoría no encontrada.");
  }
}

/** Un 10% y un fijo de $5000 son unidades distintas: el % no puede pasar de 100. */
function validarValorSegunTipo(tipo: string, valor: number): void {
  if (tipo === "PORCENTAJE" && valor > 100) {
    throw new ValidationError("Un descuento porcentual no puede superar el 100%.");
  }
}

/**
 * Alta de una regla de descuento. Auditada: define cuánto se le descuenta a
 * una familia. Sin baja lógica tipo "reemplazar" de Arancel: un duplicado
 * (misma categoría+nombre, ambas activas) se rechaza con un error claro — no
 * hay flujo de reemplazo con historial para esta entidad.
 */
export async function crearDescuentoReglaEscuela(
  ctx: AuthContext,
  input: DescuentoReglaInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  await validarCategoriaDelTenant(escuelaId, input.categoriaId);
  validarValorSegunTipo(input.tipo, input.valor);

  const existentes = await listarDescuentoReglas(escuelaId);
  const duplicado = existentes.some(
    (r) =>
      r.activo &&
      r.categoriaId === input.categoriaId &&
      r.nombre.trim().toLowerCase() === input.nombre.trim().toLowerCase(),
  );
  if (duplicado) {
    throw new ValidationError(
      "Ya existe una regla activa con ese nombre para esta categoría.",
    );
  }

  const creada = await crearDescuentoRegla(escuelaId, {
    categoriaId: input.categoriaId,
    nombre: input.nombre,
    tipo: input.tipo,
    valor: input.valor,
  });
  await registrarAuditoria(ctx, {
    accion: "DESCUENTO_CREAR",
    entidad: "DescuentoRegla",
    entidadId: creada.id,
    escuelaId,
    motivo: `${input.nombre} (${input.tipo} ${input.valor})`,
  });
}

/** Edita una regla existente (categoría, nombre, tipo, valor). */
export async function editarDescuentoReglaEscuela(
  ctx: AuthContext,
  input: EditarDescuentoReglaInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  await validarCategoriaDelTenant(escuelaId, input.categoriaId);
  validarValorSegunTipo(input.tipo, input.valor);

  const existentes = await listarDescuentoReglas(escuelaId);
  const duplicado = existentes.some(
    (r) =>
      r.id !== input.id &&
      r.activo &&
      r.categoriaId === input.categoriaId &&
      r.nombre.trim().toLowerCase() === input.nombre.trim().toLowerCase(),
  );
  if (duplicado) {
    throw new ValidationError(
      "Ya existe una regla activa con ese nombre para esta categoría.",
    );
  }

  const { count } = await actualizarDescuentoRegla(escuelaId, input.id, {
    categoriaId: input.categoriaId,
    nombre: input.nombre,
    tipo: input.tipo,
    valor: input.valor,
  });
  if (count === 0) throw new NotFoundError("Regla de descuento no encontrada.");

  await registrarAuditoria(ctx, {
    accion: "DESCUENTO_EDITAR",
    entidad: "DescuentoRegla",
    entidadId: input.id,
    escuelaId,
    motivo: `${input.nombre} (${input.tipo} ${input.valor})`,
  });
}

/** Baja lógica: la regla vieja queda como historial, nunca se borra. */
export async function desactivarDescuentoReglaEscuela(
  ctx: AuthContext,
  reglaId: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const regla = await obtenerDescuentoRegla(escuelaId, reglaId);
  if (!regla) throw new NotFoundError("Regla de descuento no encontrada.");
  if (!regla.activo) throw new ValidationError("Esa regla ya está inactiva.");

  await desactivarDescuentoRegla(escuelaId, reglaId);
  await registrarAuditoria(ctx, {
    accion: "DESCUENTO_DESACTIVAR",
    entidad: "DescuentoRegla",
    entidadId: reglaId,
    escuelaId,
    motivo: regla.nombre,
  });
}

/** Ids de jugadores ya asignados a una regla (precarga del checklist). */
export async function listarJugadoresAsignadosRegla(
  ctx: AuthContext,
  reglaId: string,
): Promise<string[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const regla = await obtenerDescuentoRegla(escuelaId, reglaId);
  if (!regla) throw new NotFoundError("Regla de descuento no encontrada.");
  return jugadoresAsignados(escuelaId, reglaId);
}

/**
 * Reemplaza el set completo de jugadores asignados a una regla. La regla
 * tiene que ser del tenant Y cada jugador tiene que pertenecer a la MISMA
 * categoría de la regla — no se confía en los ids que manda el formulario, se
 * verifican contra la plantilla real de la escuela (AGENTS.md §5).
 */
export async function asignarJugadoresAReglaEscuela(
  ctx: AuthContext,
  reglaId: string,
  jugadorIds: string[],
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const regla = await obtenerDescuentoRegla(escuelaId, reglaId);
  if (!regla) throw new NotFoundError("Regla de descuento no encontrada.");

  if (jugadorIds.length > 0) {
    const jugadoresDeCategoria = await listarJugadoresGestion(escuelaId, {
      categoriaId: regla.categoriaId,
    });
    const idsValidos = new Set(jugadoresDeCategoria.map((j) => j.id));
    const invalido = jugadorIds.some((id) => !idsValidos.has(id));
    if (invalido) {
      throw new ValidationError(
        "Alguno de los jugadores no pertenece a la categoría de esta regla.",
      );
    }
  }

  await asignarJugadoresARegla(escuelaId, reglaId, jugadorIds);
  await registrarAuditoria(ctx, {
    accion: "DESCUENTO_ASIGNAR_JUGADORES",
    entidad: "DescuentoRegla",
    entidadId: reglaId,
    escuelaId,
    motivo: `${regla.nombre}: ${jugadorIds.length} jugador(es) asignado(s)`,
  });
}

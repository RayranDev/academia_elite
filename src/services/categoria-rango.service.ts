import type { AuthContext } from "@/lib/auth/context";
import {
  requireRole,
  requireEscuela,
  requirePermiso,
  assertTenant,
  assertMotivoSoporte,
  assertSoportePuedeEscribir,
} from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { listarCategorias } from "@/repositories/categoria.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import {
  obtenerRangoDeCategoria,
  listarRangosDeEscuela,
  actualizarRangoDeCategoria,
} from "@/repositories/categoria-rango.repository";
import { registrarAuditoria } from "@/services/audit.service";
import {
  PRUEBAS_FISICAS,
  ETIQUETA_PRUEBA,
  rangosDesdeFila,
  type FilaRangoFisico,
  type PruebaFisica,
  type RangosFisicos,
} from "@/lib/stats-engine";
import type { EditarRangosCategoriaInput } from "@/lib/validators/categoria-rango";

export interface RangosCategoriaDTO {
  categoriaId: string;
  categoriaNombre: string;
  pruebas: {
    prueba: PruebaFisica;
    etiqueta: string;
    inverso: boolean;
    min: number;
    max: number;
  }[];
}

function aRangosCategoriaDTO(
  categoriaId: string,
  categoriaNombre: string,
  fila: FilaRangoFisico,
): RangosCategoriaDTO {
  const rangos = rangosDesdeFila(fila);
  return {
    categoriaId,
    categoriaNombre,
    pruebas: PRUEBAS_FISICAS.map((prueba) => ({
      prueba,
      etiqueta: ETIQUETA_PRUEBA[prueba],
      inverso: rangos[prueba].inverso,
      min: rangos[prueba].min,
      max: rangos[prueba].max,
    })),
  };
}

/** min < max para las 4 pruebas. Mismo criterio que `validarCoherencia` en parametro-escuela.service.ts. */
function validarRangosCoherentes(fila: FilaRangoFisico): void {
  if (!(fila.sprintMin < fila.sprintMax)) {
    throw new ValidationError("Sprint: el mínimo debe ser menor que el máximo.");
  }
  if (!(fila.saltoMin < fila.saltoMax)) {
    throw new ValidationError("Salto vertical: el mínimo debe ser menor que el máximo.");
  }
  if (!(fila.agilidadMin < fila.agilidadMax)) {
    throw new ValidationError("Agilidad: el mínimo debe ser menor que el máximo.");
  }
  if (!(fila.yoyoMin < fila.yoyoMax)) {
    throw new ValidationError("Resistencia Yo-Yo: el mínimo debe ser menor que el máximo.");
  }
}

function filaDeInput(input: EditarRangosCategoriaInput): FilaRangoFisico {
  return {
    sprintMin: input.sprintMin,
    sprintMax: input.sprintMax,
    saltoMin: input.saltoMin,
    saltoMax: input.saltoMax,
    agilidadMin: input.agilidadMin,
    agilidadMax: input.agilidadMax,
    yoyoMin: input.yoyoMin,
    yoyoMax: input.yoyoMax,
  };
}

// --- Self-service ESCUELA_ADMIN --------------------------------------------

export async function listarRangosCategoriasEscuela(
  ctx: AuthContext,
): Promise<RangosCategoriaDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const rows = await listarRangosDeEscuela(escuelaId);
  return rows.map((r) => aRangosCategoriaDTO(r.categoriaId, r.categoria.nombre, r));
}

export async function editarRangosCategoriaEscuela(
  ctx: AuthContext,
  input: EditarRangosCategoriaInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  // La categoría tiene que ser del tenant (no se confía en el id del
  // formulario), mismo patrón que `crearArancelEscuela`.
  const categorias = await listarCategorias(escuelaId);
  const categoria = categorias.find((c) => c.id === input.categoriaId);
  if (!categoria) throw new NotFoundError("Categoría no encontrada.");

  const fila = filaDeInput(input);
  validarRangosCoherentes(fila);

  const { count } = await actualizarRangoDeCategoria(escuelaId, input.categoriaId, fila);
  if (count === 0) {
    throw new NotFoundError("Rangos físicos no encontrados para esa categoría.");
  }

  await registrarAuditoria(ctx, {
    accion: "CATEGORIA_RANGO_EDITAR",
    entidad: "CategoriaRangoFisico",
    entidadId: input.categoriaId,
    escuelaId,
    motivo: categoria.nombre,
  });
}

// --- SUPER_ADMIN en sesión de soporte --------------------------------------

export async function listarRangosCategoriasAdmin(
  ctx: AuthContext,
  escuelaId: string,
): Promise<RangosCategoriaDTO[]> {
  requirePermiso(ctx, "EDITAR_PARAMETROS_GLOBALES");
  assertTenant(ctx, escuelaId);
  if (!(await obtenerEscuela(escuelaId))) {
    throw new NotFoundError("Escuela no encontrada.");
  }
  const rows = await listarRangosDeEscuela(escuelaId);
  return rows.map((r) => aRangosCategoriaDTO(r.categoriaId, r.categoria.nombre, r));
}

export async function fijarRangosCategoriaAdmin(
  ctx: AuthContext,
  escuelaId: string,
  input: EditarRangosCategoriaInput,
  motivo?: string,
): Promise<void> {
  requirePermiso(ctx, "EDITAR_PARAMETROS_GLOBALES");
  assertTenant(ctx, escuelaId);
  if (!(await obtenerEscuela(escuelaId))) {
    throw new NotFoundError("Escuela no encontrada.");
  }

  const categorias = await listarCategorias(escuelaId);
  const categoria = categorias.find((c) => c.id === input.categoriaId);
  if (!categoria) throw new NotFoundError("Categoría no encontrada.");

  const fila = filaDeInput(input);
  validarRangosCoherentes(fila);
  assertMotivoSoporte(ctx, motivo);
  assertSoportePuedeEscribir(ctx);

  const { count } = await actualizarRangoDeCategoria(escuelaId, input.categoriaId, fila);
  if (count === 0) {
    throw new NotFoundError("Rangos físicos no encontrados para esa categoría.");
  }

  await registrarAuditoria(ctx, {
    accion: "CATEGORIA_RANGO_EDITAR",
    entidad: "CategoriaRangoFisico",
    entidadId: input.categoriaId,
    escuelaId,
    motivo: motivo ? `${categoria.nombre} (${motivo})` : categoria.nombre,
  });
}

// --- Consumido por el motor de evaluación (sin ctx: llamador ya autorizado) -

/** Rangos físicos efectivos de una categoría, para `computeStats`. */
export async function obtenerRangosFisicosDeCategoria(
  escuelaId: string,
  categoriaId: string,
): Promise<RangosFisicos> {
  const fila = await obtenerRangoDeCategoria(escuelaId, categoriaId);
  if (!fila) {
    throw new ValidationError("Esta categoría no tiene rangos físicos configurados.");
  }
  return rangosDesdeFila(fila);
}

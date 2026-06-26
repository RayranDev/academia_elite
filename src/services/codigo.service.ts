import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { ValidationError } from "@/lib/errors";
import {
  listarCodigos,
  crearCodigo,
  desactivarCodigo,
  obtenerCodigoParaEnvio,
} from "@/repositories/codigo.repository";
import {
  listarCategorias,
  contarCategoriasDeEscuela,
} from "@/repositories/categoria.repository";
import { generarCodigoInvitacion } from "@/lib/codes";
import { enviarCodigoInvitacion } from "@/services/email.service";

export interface CodigoDTO {
  id: string;
  codigo: string;
  categoriaNombre: string;
  usos: number;
  usosMaximos: number;
  expiraEn: string;
  activo: boolean;
  vigente: boolean;
}

export async function listarCodigosEscuela(
  ctx: AuthContext,
): Promise<CodigoDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const [codigos, categorias] = await Promise.all([
    listarCodigos(escuelaId),
    listarCategorias(escuelaId),
  ]);
  const nombrePorId = new Map(categorias.map((c) => [c.id, c.nombre]));
  const ahora = Date.now();
  return codigos.map((c) => ({
    id: c.id,
    codigo: c.codigo,
    categoriaNombre: nombrePorId.get(c.categoriaId) ?? "—",
    usos: c.usos,
    usosMaximos: c.usosMaximos,
    expiraEn: c.expiraEn.toISOString(),
    activo: c.activo,
    vigente:
      c.activo && c.usos < c.usosMaximos && c.expiraEn.getTime() > ahora,
  }));
}

export async function crearCodigoEscuela(
  ctx: AuthContext,
  data: { categoriaId: string; usosMaximos: number; diasValidez: number },
): Promise<{ codigo: string }> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const cuenta = await contarCategoriasDeEscuela(escuelaId, [data.categoriaId]);
  if (cuenta !== 1) {
    throw new ValidationError("La categoría no pertenece a tu escuela.");
  }

  const expiraEn = new Date(Date.now() + data.diasValidez * 24 * 60 * 60 * 1000);
  const codigo = generarCodigoInvitacion();
  await crearCodigo(escuelaId, {
    categoriaId: data.categoriaId,
    codigo,
    usosMaximos: data.usosMaximos,
    expiraEn,
  });
  return { codigo };
}

export async function desactivarCodigoEscuela(
  ctx: AuthContext,
  id: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  await desactivarCodigo(escuelaId, id);
}

/** Envía un código de invitación de la escuela al correo de una familia. */
export async function enviarCodigoPorCorreo(
  ctx: AuthContext,
  codigoId: string,
  emailDestino: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const codigo = await obtenerCodigoParaEnvio(escuelaId, codigoId);
  if (!codigo) throw new ValidationError("Código no encontrado.");
  const categorias = await listarCategorias(escuelaId);
  const categoriaNombre =
    categorias.find((c) => c.id === codigo.categoriaId)?.nombre ?? "tu categoría";
  await enviarCodigoInvitacion(
    emailDestino,
    codigo.codigo,
    codigo.escuela.nombre,
    categoriaNombre,
  );
}

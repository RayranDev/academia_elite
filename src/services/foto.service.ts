import { randomUUID } from "node:crypto";
import type { AuthContext } from "@/lib/auth/context";
import { requireRole, assertTenant } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  obtenerJugadorParaFoto,
  actualizarFotoJugador,
  actualizarConsentimientoJugador,
  actualizarAvatarJugador,
} from "@/repositories/jugador.repository";
import type { AvatarConfigInput } from "@/lib/validators/avatar";
import { registrarAuditoria } from "@/services/audit.service";
import { detectarTipoImagen, procesarFoto } from "@/lib/foto/process";
import { guardarFoto, borrarFoto } from "@/lib/foto/storage";
import { esResponsable } from "@/lib/foto/permisos";

// Re-exportado para compatibilidad con quien lo importaba desde acá. La lógica
// vive en `@/lib/foto/permisos` (pura, sin sharp) para que la ruta que sirve la
// foto no arrastre el pipeline de procesamiento.
export { esResponsable };

type JugadorFoto = NonNullable<
  Awaited<ReturnType<typeof obtenerJugadorParaFoto>>
>;

async function cargarYAutorizarGestion(
  ctx: AuthContext,
  jugadorId: string,
): Promise<JugadorFoto> {
  requireRole(ctx, ["JUGADOR"]);
  const jugador = await obtenerJugadorParaFoto(ctx.escuelaId, jugadorId);
  if (!jugador) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, jugador.escuelaId);
  if (!esResponsable(ctx, jugador)) {
    throw new NotFoundError("Jugador no encontrado.");
  }
  return jugador;
}

/** Sube y procesa la foto del jugador (solo el responsable). */
export async function subirFoto(
  ctx: AuthContext,
  jugadorId: string,
  original: Buffer,
): Promise<void> {
  const jugador = await cargarYAutorizarGestion(ctx, jugadorId);

  const tipo = detectarTipoImagen(original);
  if (!tipo) {
    throw new ValidationError("Formato no válido. Usa JPEG, PNG o WebP.");
  }
  const procesada = await procesarFoto(original); // strip EXIF + resize + webp
  const nombre = `${randomUUID()}.webp`;
  await guardarFoto(nombre, procesada);
  const res = await actualizarFotoJugador(ctx.escuelaId, jugadorId, nombre);
  if (res.count === 0) throw new NotFoundError("Jugador no encontrado.");
  // La foto anterior queda huérfana en el bucket: se borra best-effort.
  if (jugador.fotoUrl && jugador.fotoUrl !== nombre) {
    await borrarFoto(jugador.fotoUrl);
  }
}

/** Actualiza el avatar SVG del jugador (solo el responsable). */
export async function actualizarAvatar(
  ctx: AuthContext,
  jugadorId: string,
  config: AvatarConfigInput,
): Promise<void> {
  await cargarYAutorizarGestion(ctx, jugadorId);
  const res = await actualizarAvatarJugador(
    ctx.escuelaId,
    jugadorId,
    JSON.stringify(config),
  );
  if (res.count === 0) throw new NotFoundError("Jugador no encontrado.");
}

/** Otorga o revoca el consentimiento de foto (solo el responsable). Auditado. */
export async function actualizarConsentimiento(
  ctx: AuthContext,
  jugadorId: string,
  consiente: boolean,
): Promise<void> {
  const jugador = await cargarYAutorizarGestion(ctx, jugadorId);
  const res = await actualizarConsentimientoJugador(
    ctx.escuelaId,
    jugadorId,
    consiente,
  );
  if (res.count === 0) throw new NotFoundError("Jugador no encontrado.");
  await registrarAuditoria(ctx, {
    accion: consiente ? "OTORGAR_CONSENTIMIENTO" : "REVOCAR_CONSENTIMIENTO",
    entidad: "Jugador",
    entidadId: jugadorId,
    escuelaId: jugador.escuelaId,
  });
}

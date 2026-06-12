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
import { guardarFoto } from "@/lib/foto/storage";

type JugadorFoto = NonNullable<
  Awaited<ReturnType<typeof obtenerJugadorParaFoto>>
>;

/** ¿El usuario es el responsable (padre/tutor) del jugador? */
export function esResponsable(ctx: AuthContext, jugador: JugadorFoto): boolean {
  return (
    ctx.userId === jugador.padreUserId || ctx.userId === jugador.cuentaUserId
  );
}

async function cargarYAutorizarGestion(
  ctx: AuthContext,
  jugadorId: string,
): Promise<JugadorFoto> {
  requireRole(ctx, ["JUGADOR"]);
  const jugador = await obtenerJugadorParaFoto(jugadorId);
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
  await cargarYAutorizarGestion(ctx, jugadorId);

  const tipo = detectarTipoImagen(original);
  if (!tipo) {
    throw new ValidationError("Formato no válido. Usa JPEG, PNG o WebP.");
  }
  const procesada = await procesarFoto(original); // strip EXIF + resize + webp
  const nombre = `${randomUUID()}.webp`;
  await guardarFoto(nombre, procesada);
  await actualizarFotoJugador(jugadorId, nombre);
}

/** Actualiza el avatar SVG del jugador (solo el responsable). */
export async function actualizarAvatar(
  ctx: AuthContext,
  jugadorId: string,
  config: AvatarConfigInput,
): Promise<void> {
  await cargarYAutorizarGestion(ctx, jugadorId);
  await actualizarAvatarJugador(jugadorId, JSON.stringify(config));
}

/** Otorga o revoca el consentimiento de foto (solo el responsable). Auditado. */
export async function actualizarConsentimiento(
  ctx: AuthContext,
  jugadorId: string,
  consiente: boolean,
): Promise<void> {
  const jugador = await cargarYAutorizarGestion(ctx, jugadorId);
  await actualizarConsentimientoJugador(jugadorId, consiente);
  await registrarAuditoria(ctx, {
    accion: consiente ? "OTORGAR_CONSENTIMIENTO" : "REVOCAR_CONSENTIMIENTO",
    entidad: "Jugador",
    entidadId: jugadorId,
    escuelaId: jugador.escuelaId,
  });
}

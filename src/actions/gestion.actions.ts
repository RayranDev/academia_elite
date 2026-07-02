"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import {
  jugadorEditarSchema,
  estadoJugadorSchema,
  eliminarJugadorSchema,
  bloqueoSchema,
  dtEditarSchema,
  usuarioEditarSchema,
  escuelaEditarSchema,
  cambiarPasswordSchema,
} from "@/lib/validators/gestion";
import {
  editarJugador,
  cambiarEstadoJugadorGestion,
  eliminarJugadorLogico,
  restaurarJugador,
  resetPasswordFamilia,
  resetPasswordFamiliaDt,
} from "@/services/gestion-jugadores.service";
import {
  bloquearAccesoJugador,
  desbloquearAccesoJugador,
} from "@/services/bloqueo.service";
import { actualizarDt, resetPasswordDt } from "@/services/entrenador.service";
import {
  editarUsuarioAdmin,
  resetPasswordUsuarioAdmin,
  editarEscuelaSuperAdmin,
} from "@/services/admin-usuarios.service";
import { cambiarMiPassword } from "@/services/cuenta.service";
import {
  importarJugadores,
  type ResultadoImportacion,
} from "@/services/importacion.service";

// Server Actions del Sprint G (gestión). Frontera: sesión + Zod + rate limit
// en acciones sensibles; la autorización real vive en los servicios.

type Credenciales = { email: string; passwordTemporal: string };

const RUTAS_GESTION = ["/escuela/jugadores", "/admin/escuelas", "/escuela/dts"];

function revalidarGestion() {
  for (const ruta of RUTAS_GESTION) revalidatePath(ruta, "layout");
}

export async function editarJugadorAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = jugadorEditarSchema.safeParse({
      jugadorId: formData.get("jugadorId"),
      nombre: formData.get("nombre"),
      apellido: formData.get("apellido"),
      fechaNacimiento: formData.get("fechaNacimiento"),
      posicion: formData.get("posicion"),
      dorsal: formData.get("dorsal") ?? "",
      categoriaId: formData.get("categoriaId"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    // En modo soporte el motivo de la sesión justifica y audita la escritura.
    await editarJugador(ctx, parsed.data, ctx.soporte?.motivo);
    revalidarGestion();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function cambiarEstadoJugadorAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = estadoJugadorSchema.safeParse({
      jugadorId: formData.get("jugadorId"),
      estado: formData.get("estado"),
      motivo: formData.get("motivo"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await cambiarEstadoJugadorGestion(
      ctx,
      parsed.data.jugadorId,
      parsed.data.estado,
      parsed.data.motivo,
    );
    revalidarGestion();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function eliminarJugadorAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = eliminarJugadorSchema.safeParse({
      jugadorId: formData.get("jugadorId"),
      confirmacion: formData.get("confirmacion"),
      motivo: formData.get("motivo"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await eliminarJugadorLogico(
      ctx,
      parsed.data.jugadorId,
      parsed.data.confirmacion,
      parsed.data.motivo,
    );
    revalidarGestion();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function restaurarJugadorAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const jugadorId = formData.get("jugadorId");
    if (typeof jugadorId !== "string" || !jugadorId) {
      throw new ValidationError("Jugador inválido.");
    }
    await restaurarJugador(ctx, jugadorId, ctx.soporte?.motivo);
    revalidarGestion();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function bloquearAccesoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = bloqueoSchema.safeParse({
      jugadorId: formData.get("jugadorId"),
      tipo: formData.get("tipo"),
      mensaje: formData.get("mensaje")?.toString() || undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await bloquearAccesoJugador(
      ctx,
      parsed.data.jugadorId,
      parsed.data.tipo,
      parsed.data.mensaje,
    );
    revalidarGestion();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function desbloquearAccesoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const jugadorId = formData.get("jugadorId");
    if (typeof jugadorId !== "string" || !jugadorId) {
      throw new ValidationError("Jugador inválido.");
    }
    await desbloquearAccesoJugador(ctx, jugadorId, ctx.soporte?.motivo);
    revalidarGestion();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function resetPasswordFamiliaAction(
  _prev: ActionResult<Credenciales> | undefined,
  formData: FormData,
): Promise<ActionResult<Credenciales>> {
  try {
    const ctx = await requireAuthContext();
    const limite = await rateLimit(`resetpw:${ctx.userId}`, 10, 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiados resets. Espera un momento.");
    const jugadorId = formData.get("jugadorId");
    if (typeof jugadorId !== "string" || !jugadorId) {
      throw new ValidationError("Jugador inválido.");
    }
    const data = await resetPasswordFamilia(ctx, jugadorId, ctx.soporte?.motivo);
    return { ok: true, data };
  } catch (e) {
    return mapError(e);
  }
}

export async function resetPasswordFamiliaDtAction(
  _prev: ActionResult<Credenciales> | undefined,
  formData: FormData,
): Promise<ActionResult<Credenciales>> {
  try {
    const ctx = await requireAuthContext();
    const limite = await rateLimit(`resetpw:${ctx.userId}`, 10, 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiados resets. Espera un momento.");
    const jugadorId = formData.get("jugadorId");
    if (typeof jugadorId !== "string" || !jugadorId) {
      throw new ValidationError("Jugador inválido.");
    }
    const data = await resetPasswordFamiliaDt(ctx, jugadorId);
    return { ok: true, data };
  } catch (e) {
    return mapError(e);
  }
}

export async function actualizarDtAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = dtEditarSchema.safeParse({
      entrenadorId: formData.get("entrenadorId"),
      nombre: formData.get("nombre"),
      activo: formData.get("activo") === "on",
      categoriaIds: formData.getAll("categoriaIds").map(String),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await actualizarDt(ctx, parsed.data);
    revalidatePath("/escuela/dts");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function resetPasswordDtAction(
  _prev: ActionResult<Credenciales> | undefined,
  formData: FormData,
): Promise<ActionResult<Credenciales>> {
  try {
    const ctx = await requireAuthContext();
    const limite = await rateLimit(`resetpw:${ctx.userId}`, 10, 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiados resets. Espera un momento.");
    const entrenadorId = formData.get("entrenadorId");
    if (typeof entrenadorId !== "string" || !entrenadorId) {
      throw new ValidationError("DT inválido.");
    }
    const data = await resetPasswordDt(ctx, entrenadorId);
    return { ok: true, data };
  } catch (e) {
    return mapError(e);
  }
}

export async function editarUsuarioAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = usuarioEditarSchema.safeParse({
      userId: formData.get("userId"),
      nombre: formData.get("nombre"),
      email: formData.get("email"),
      activo: formData.get("activo") === "on",
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await editarUsuarioAdmin(ctx, parsed.data);
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function resetPasswordUsuarioAction(
  _prev: ActionResult<Credenciales> | undefined,
  formData: FormData,
): Promise<ActionResult<Credenciales>> {
  try {
    const ctx = await requireAuthContext();
    const limite = await rateLimit(`resetpw:${ctx.userId}`, 10, 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiados resets. Espera un momento.");
    const userId = formData.get("userId");
    if (typeof userId !== "string" || !userId) {
      throw new ValidationError("Usuario inválido.");
    }
    const data = await resetPasswordUsuarioAdmin(ctx, userId);
    return { ok: true, data };
  } catch (e) {
    return mapError(e);
  }
}

export async function editarEscuelaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = escuelaEditarSchema.safeParse({
      escuelaId: formData.get("escuelaId"),
      nombre: formData.get("nombre"),
      slug: formData.get("slug"),
      colorPrimario: formData.get("colorPrimario"),
      activa: formData.get("activa") === "on",
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await editarEscuelaSuperAdmin(ctx, parsed.data);
    revalidatePath("/admin/escuelas");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function cambiarMiPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const limite = await rateLimit(`cambiopw:${ctx.userId}`, 5, 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiados intentos. Espera un momento.");
    const parsed = cambiarPasswordSchema.safeParse({
      actual: formData.get("actual"),
      nueva: formData.get("nueva"),
      confirmacion: formData.get("confirmacion"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await cambiarMiPassword(ctx, parsed.data.actual, parsed.data.nueva);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

const MAX_XLSX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function importarJugadoresAction(
  _prev: ActionResult<ResultadoImportacion> | undefined,
  formData: FormData,
): Promise<ActionResult<ResultadoImportacion>> {
  try {
    const ctx = await requireAuthContext();
    const limite = await rateLimit(`importar:${ctx.userId}`, 5, 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiadas importaciones. Espera un momento.");

    const archivo = formData.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      throw new ValidationError("Adjunta un archivo Excel (.xlsx).");
    }
    if (archivo.size > MAX_XLSX_BYTES) {
      throw new ValidationError("El archivo supera 5 MB.");
    }
    const escuelaIdRaw = formData.get("escuelaId");
    const escuelaId = typeof escuelaIdRaw === "string" && escuelaIdRaw ? escuelaIdRaw : undefined;

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const data = await importarJugadores(ctx, buffer, escuelaId);
    revalidarGestion();
    return { ok: true, data };
  } catch (e) {
    return mapError(e);
  }
}

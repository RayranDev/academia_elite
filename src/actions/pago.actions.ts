"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_COMPROBANTE_BYTES } from "@/lib/foto/process";
import {
  reportarPagoSchema,
  motivoPagoSchema,
  aprobarPagoSchema,
  aprobarPagosLoteSchema,
  reportarPagoDesdeFormData,
  motivoPagoDesdeFormData,
  aprobarPagoDesdeFormData,
  aprobarPagosLoteDesdeFormData,
} from "@/lib/validators/pago";
import {
  reportarPago,
  registrarPagoEscuela,
  aprobarPagoEscuela,
  aprobarPagosEscuela,
  rechazarPagoEscuela,
  anularPagoEscuela,
  cuotasReportablesJugador,
  type CuotaReportableDTO,
  type AprobacionLoteDTO,
} from "@/services/pago.service";

/**
 * Todo lo que cambia al tocar un pago: el propio historial/bandeja, el estado
 * de cuenta de la familia (una cuota reportada deja de ofrecerse de nuevo), y
 * el dashboard/membresías cuando un pago se aprueba o se anula (cambian estado
 * y `pagadaEn` de las cuotas).
 */
function revalidarPagos(): void {
  revalidatePath("/jugador/pagos");
  revalidatePath("/escuela/pagos");
  revalidatePath("/escuela/membresias");
  revalidatePath("/escuela");
}

/**
 * Extrae los comprobantes del `FormData` en el mismo orden que `medios` del
 * input ya validado, usando `indicesDeMedios` para saltar las filas vacías que
 * el mapeo descartó. Un archivo vacío o ausente es `null` — el comprobante es
 * opcional por medio.
 */
function comprobantesDesdeFormData(
  fd: FormData,
  indicesDeMedios: number[],
): Promise<(Buffer | null)[]> {
  return Promise.all(
    indicesDeMedios.map(async (i) => {
      const file = fd.get(`comprobante-${i}`);
      if (!(file instanceof File) || file.size === 0) return null;
      if (file.size > MAX_COMPROBANTE_BYTES) {
        throw new ValidationError("El comprobante supera los 4 MB.");
      }
      return Buffer.from(await file.arrayBuffer());
    }),
  );
}

export async function reportarPagoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const limite = await rateLimit(`pago:${ctx.userId}`, 20, 24 * 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiados reportes hoy.");

    const { input, indicesDeMedios } = reportarPagoDesdeFormData(formData);
    const parsed = reportarPagoSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const comprobantes = await comprobantesDesdeFormData(formData, indicesDeMedios);
    await reportarPago(ctx, parsed.data, comprobantes);
    revalidarPagos();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

/**
 * No es un `useActionState`: el `RegistrarPagoEscuelaForm` la llama directo
 * cuando el admin elige un jugador en el combobox, para traer sus cuotas
 * reportables sin recargar la página.
 */
export async function cuotasReportablesEscuelaAction(
  jugadorId: string,
): Promise<ActionResult<CuotaReportableDTO[]>> {
  try {
    const ctx = await requireAuthContext();
    const data = await cuotasReportablesJugador(ctx, jugadorId);
    return { ok: true, data };
  } catch (e) {
    return mapError(e);
  }
}

export async function registrarPagoEscuelaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const { input, indicesDeMedios } = reportarPagoDesdeFormData(formData);
    const parsed = reportarPagoSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const comprobantes = await comprobantesDesdeFormData(formData, indicesDeMedios);
    await registrarPagoEscuela(ctx, parsed.data, comprobantes);
    revalidarPagos();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function aprobarPagoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = aprobarPagoSchema.safeParse(aprobarPagoDesdeFormData(formData));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await aprobarPagoEscuela(ctx, parsed.data.pagoId);
    revalidarPagos();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function aprobarPagosLoteAction(
  _prev: ActionResult<AprobacionLoteDTO> | undefined,
  formData: FormData,
): Promise<ActionResult<AprobacionLoteDTO>> {
  try {
    const ctx = await requireAuthContext();
    const parsed = aprobarPagosLoteSchema.safeParse(aprobarPagosLoteDesdeFormData(formData));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const data = await aprobarPagosEscuela(ctx, parsed.data.pagoIds);
    revalidarPagos();
    return { ok: true, data };
  } catch (e) {
    return mapError(e);
  }
}

export async function rechazarPagoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = motivoPagoSchema.safeParse(motivoPagoDesdeFormData(formData));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await rechazarPagoEscuela(ctx, parsed.data.pagoId, parsed.data.motivo);
    revalidarPagos();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function anularPagoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = motivoPagoSchema.safeParse(motivoPagoDesdeFormData(formData));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await anularPagoEscuela(ctx, parsed.data.pagoId, parsed.data.motivo);
    revalidarPagos();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

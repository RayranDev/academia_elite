import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";
import { MEDIOS_PAGO } from "@/lib/validators/membresia";
import { hoyISO } from "@/lib/fecha-calendario";

export const ORIGENES_PAGO = ["FAMILIA", "ESCUELA"] as const;
export const ESTADOS_PAGO = ["REPORTADO", "APROBADO", "RECHAZADO", "ANULADO"] as const;

export const ETIQUETA_ESTADO_PAGO: Record<(typeof ESTADOS_PAGO)[number], string> = {
  REPORTADO: "En revisión",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  ANULADO: "Anulado",
};

const MAX_MEDIOS = 4;
const MAX_APLICACIONES = 24;

/**
 * Monto de plata desde un `<input type="number">`. Igual criterio que
 * `arancelSchema.monto`: el monto es obligatorio y se exige ANTES de
 * coercionar, porque `z.coerce.number()` a secas convierte `""`/`null` en 0, y
 * un pago de $0 "vacío" quedaría indistinguible de uno deliberado.
 */
const montoPago = z
  .union([z.string().min(1, { error: "Escribe un monto." }), z.number()])
  .transform((v) => Number(v))
  .refine((n) => Number.isFinite(n), { error: "El monto debe ser un número." })
  .refine((n) => n > 0, { error: "El monto debe ser mayor a 0." })
  .refine((n) => n <= 99999999, { error: "El monto es demasiado alto." });

/**
 * Fecha en que la familia pagó (día de almanaque, no instante — AGENTS.md §6).
 * No puede ser futura: nadie puede reportar hoy un pago que todavía no hizo.
 */
const fechaPagoSchema = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), { error: "Fecha inválida." })
  .refine((v) => v <= hoyISO(), { error: "La fecha de pago no puede ser futura." })
  .transform((v) => new Date(`${v}T00:00:00.000Z`));

/** Un medio de pago dentro del formulario de reporte. */
const medioPagoSchema = z.object({
  medio: z.enum(MEDIOS_PAGO),
  monto: montoPago,
  referencia: z
    .union([z.literal(""), textoSeguro({ max: 60 })])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export type MedioPagoInput = z.infer<typeof medioPagoSchema>;

/**
 * Reporte de un pago (autogestión de la familia, o alta directa de la escuela).
 * Ambos casos comparten forma; lo que cambia es el `origen` y quién lo firma
 * (lo decide el servicio a partir de `ctx.rol`, no un campo del formulario).
 */
export const reportarPagoSchema = z.object({
  membresiaIds: z
    .array(z.string().min(1))
    .min(1, { error: "Elige al menos una cuota." })
    .max(MAX_APLICACIONES, { error: "Elige menos cuotas por reporte." })
    // Sin duplicados: un checkbox repetido en el FormData no debería crear dos
    // aplicaciones sobre la misma cuota.
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "Hay una cuota repetida en la selección.",
    }),
  fechaPago: fechaPagoSchema,
  nota: z
    .union([z.literal(""), textoSeguro({ max: 200 })])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  medios: z
    .array(medioPagoSchema)
    .min(1, { error: "Agrega al menos un medio de pago." })
    .max(MAX_MEDIOS, { error: "Demasiados medios en un solo reporte." }),
});

export type ReportarPagoInput = z.infer<typeof reportarPagoSchema>;

/**
 * Arma el input de `reportarPagoSchema` desde un `FormData`, y de paso dice de
 * qué índice original salió cada medio que sobrevivió al filtro — la action lo
 * necesita para ir a buscar `comprobante-{índice}` de ESE medio después de
 * validar, sin tener que adivinar el corrimiento que dejaron las filas vacías.
 *
 * Vive pegado al schema por el motivo ya documentado en
 * `arancelDesdeFormData`: separado en la action, un rename de campo pasa los
 * tres gates de §7 con el reporte de pagos roto en runtime.
 *
 * Los medios llegan indexados (`medio-0`, `monto-0`, `referencia-0`, …) porque
 * el formulario permite agregar filas dinámicamente; `medios-count` dice
 * cuántas filas mandó el cliente. Una fila que el usuario vació antes de
 * enviar se descarta acá, no en el schema: `medioPagoSchema` la rechazaría con
 * un error de "elige un medio" que no señala nada útil sobre una fila que ni
 * siquiera se completó.
 */
export function reportarPagoDesdeFormData(fd: FormData): {
  input: unknown;
  indicesDeMedios: number[];
} {
  const cantidadMedios = Number(fd.get("medios-count") ?? 0);
  const medios: { medio: FormDataEntryValue; monto: FormDataEntryValue; referencia: FormDataEntryValue }[] = [];
  const indicesDeMedios: number[] = [];
  for (let i = 0; i < cantidadMedios; i++) {
    const medio = fd.get(`medio-${i}`);
    if (medio == null || medio === "") continue; // fila vacía: se ignora
    medios.push({
      medio,
      monto: fd.get(`monto-${i}`) ?? "",
      referencia: fd.get(`referencia-${i}`) ?? "",
    });
    indicesDeMedios.push(i);
  }
  return {
    input: {
      membresiaIds: fd.getAll("membresiaId"),
      fechaPago: fd.get("fechaPago") ?? "",
      nota: fd.get("nota") ?? "",
      medios,
    },
    indicesDeMedios,
  };
}

/** Motivo de rechazo o anulación: texto libre obligatorio (AGENTS.md §5). */
export const motivoPagoSchema = z.object({
  pagoId: z.string().min(1),
  motivo: textoSeguro({
    min: 3,
    max: 300,
    error: "Escribe un motivo (mínimo 3 caracteres).",
  }),
});

export type MotivoPagoInput = z.infer<typeof motivoPagoSchema>;

export function motivoPagoDesdeFormData(fd: FormData) {
  return {
    pagoId: fd.get("pagoId") ?? "",
    motivo: fd.get("motivo") ?? "",
  };
}

export const aprobarPagoSchema = z.object({
  pagoId: z.string().min(1),
});

export function aprobarPagoDesdeFormData(fd: FormData) {
  return { pagoId: fd.get("pagoId") ?? "" };
}

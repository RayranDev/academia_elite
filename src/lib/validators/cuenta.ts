import { z } from "zod";
import { GENEROS } from "@/types";
import { formatearNombre } from "@/lib/texto/formatear-nombre";
import { textoSeguro } from "@/lib/validators/sanitizar";

// Validadores del autoservicio de "Mi cuenta" (JUGADOR / DT): editar el nombre
// y cambiar el email con confirmación por código enviado al correo nuevo.

// Teléfono opcional de contacto de la familia (nómina / emergencias). Vacío se
// normaliza a null. Acepta dígitos, espacios y los signos habituales (+ - ( )).
// Exportado: lo reusa también el contacto de emergencia de la ficha médica
// (misma forma de dato, otro dueño del campo).
export const telefonoOpcional = z
  .string()
  .trim()
  .max(30, { error: "Teléfono demasiado largo." })
  .regex(/^[\d+()\-\s]*$/, { error: "Teléfono inválido." })
  .transform((v) => (v.length > 0 ? v : null))
  .nullish();

/**
 * Tipos de documento del ADQUIRIENTE (el acudiente adulto que paga), no del
 * menor — por eso NO incluye RC ni TI (esos son de `Jugador.tipoDocumento`,
 * ver `src/repositories/jugador.repository.ts`). Colombia factura al que paga,
 * no al jugador.
 */
export const TIPOS_DOCUMENTO_FISCAL = ["CC", "CE", "NIT", "PAS"] as const;

const tipoDocumentoFiscalOpcional = z
  .union([z.literal(""), z.enum(TIPOS_DOCUMENTO_FISCAL)])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

// Número de documento del acudiente: solo dígitos y guion (el NIT colombiano
// lleva el dígito de verificación separado por guion, ej. "900123456-7").
// Vacío -> null, mismo criterio que `telefonoOpcional`.
const numeroDocumentoFiscalOpcional = z
  .string()
  .trim()
  .max(20, { error: "Número de documento demasiado largo." })
  .regex(/^[\d-]*$/, { error: "Solo se permiten dígitos y guion." })
  .transform((v) => (v.length > 0 ? v : null))
  .nullish();

// Dirección del acudiente: texto libre, así que pasa por `textoSeguro`
// (AGENTS.md §5) y no por un `z.string()` pelado. Vacío -> null.
const direccionFiscalOpcional = z
  .union([z.literal(""), textoSeguro({ max: 200 })])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

/**
 * `tipoDocumento`/`numeroDocumento`/`direccion` son la identificación fiscal
 * del ADQUIRIENTE para una futura factura electrónica (Colombia factura a
 * quien paga, no al menor). Hoy no se factura nada — estos campos solo evitan
 * tener que perseguir después a cientos de familias pidiéndoles la cédula el
 * día que una escuela se formalice ante la DIAN. Los tres son OPCIONALES: la
 * escuela informal no los necesita y no se le debe exigir nada.
 */
export const actualizarDatosSchema = z.object({
  nombre: textoSeguro({ min: 2, max: 120, error: "Nombre requerido." }).transform(
    formatearNombre,
  ),
  telefono: telefonoOpcional,
  tipoDocumento: tipoDocumentoFiscalOpcional,
  numeroDocumento: numeroDocumentoFiscalOpcional,
  direccion: direccionFiscalOpcional,
});

/**
 * Mapea el `FormData` de `DatosCuentaForm` al schema. Vive ACÁ, al lado del
 * schema, y no en la action — mismo motivo que `arancelDesdeFormData`
 * (`src/lib/validators/arancel.ts`): con el mapeo pegado al schema, renombrar
 * un campo obliga a tocar las dos mitades en el mismo archivo, y el test de
 * abajo lo cubre. Separado, `safeParse` recibe `unknown`: la clave vieja se
 * descarta en silencio, la nueva llega `undefined`, y typecheck + lint +
 * tests pasan igual mientras el guardado queda roto en producción.
 *
 * `tipoDocumento`/`direccion` necesitan `?? ""` porque el schema los valida
 * con `z.literal("")` (no `nullish()`): un campo ausente en el FormData llega
 * `null`, y eso no matchea `z.literal("")`. `telefono`/`numeroDocumento` no lo
 * necesitan: su schema termina en `.nullish()`, que sí acepta `null` directo.
 */
export function actualizarDatosDesdeFormData(fd: FormData) {
  return {
    nombre: fd.get("nombre"),
    telefono: fd.get("telefono"),
    tipoDocumento: fd.get("tipoDocumento") ?? "",
    numeroDocumento: fd.get("numeroDocumento"),
    direccion: fd.get("direccion") ?? "",
  };
}

/** Parentesco del acudiente con el jugador (valores acotados, opcional). */
export const PARENTESCOS = [
  "Madre",
  "Padre",
  "Abuelo/a",
  "Tío/a",
  "Hermano/a",
  "Tutor/a",
  "Otro",
] as const;

const parentescoOpcional = z
  .string()
  .trim()
  .transform((v) => (v.length > 0 ? v : null))
  .nullish()
  .refine(
    (v) => v == null || (PARENTESCOS as readonly string[]).includes(v),
    { error: "Parentesco inválido." },
  );

export const solicitarCambioEmailSchema = z.object({
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
});

export const confirmarCambioEmailSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: "El código son 6 dígitos." }),
});

/**
 * Corrección de identidad (nombre/apellido/parentesco/género) de un jugador
 * propio. El género es dato de IDENTIDAD, no deportivo: por eso lo puede
 * rectificar la familia y no queda solo en manos del DT (HABEAS-DATA.md §8).
 */
export const datosJugadorSchema = z.object({
  jugadorId: z.string().min(1),
  nombre: textoSeguro({ min: 2, max: 60, error: "Nombre requerido." }).transform(
    formatearNombre,
  ),
  apellido: textoSeguro({ min: 2, max: 60, error: "Apellido requerido." }).transform(
    formatearNombre,
  ),
  parentesco: parentescoOpcional,
  // Se puede volver a "sin declarar": rectificar incluye retirar el dato.
  genero: z
    .union([z.literal(""), z.enum(GENEROS)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

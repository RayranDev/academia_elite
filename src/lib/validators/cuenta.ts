import { z } from "zod";
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

export const actualizarDatosSchema = z.object({
  nombre: textoSeguro({ min: 2, max: 120, error: "Nombre requerido." }).transform(
    formatearNombre,
  ),
  telefono: telefonoOpcional,
});

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

/** Corrección de identidad (nombre/apellido/parentesco) de un jugador propio. */
export const datosJugadorSchema = z.object({
  jugadorId: z.string().min(1),
  nombre: textoSeguro({ min: 2, max: 60, error: "Nombre requerido." }).transform(
    formatearNombre,
  ),
  apellido: textoSeguro({ min: 2, max: 60, error: "Apellido requerido." }).transform(
    formatearNombre,
  ),
  parentesco: parentescoOpcional,
});

import { z } from "zod";
import { POSICIONES, TIPOS_BLOQUEO } from "@/types";
import { formatearNombre } from "@/lib/texto/formatear-nombre";
import { textoSeguro } from "@/lib/validators/sanitizar";
import { telefonoOpcional, PARENTESCOS } from "@/lib/validators/cuenta";

// Validadores de la gestión administrativa (Sprint G).

export const jugadorEditarSchema = z.object({
  jugadorId: z.string().min(1),
  nombre: textoSeguro({ min: 2, max: 60, error: "Nombre requerido." }).transform(
    formatearNombre,
  ),
  apellido: textoSeguro({ min: 2, max: 60, error: "Apellido requerido." }).transform(
    formatearNombre,
  ),
  fechaNacimiento: z.coerce.date(),
  posicion: z.enum(POSICIONES),
  dorsal: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(100)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  categoriaId: z.string().min(1, { error: "Elige una categoría." }),
});

export const estadoJugadorSchema = z.object({
  jugadorId: z.string().min(1),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
  motivo: textoSeguro({ min: 3, max: 200, error: "Indica el motivo." }),
});

export const eliminarJugadorSchema = z.object({
  jugadorId: z.string().min(1),
  confirmacion: textoSeguro({ min: 1, max: 120, error: "Escribe el nombre del jugador." }),
  motivo: textoSeguro({ min: 3, max: 200, error: "Indica el motivo." }),
});

export const bloqueoSchema = z.object({
  jugadorId: z.string().min(1),
  tipo: z.enum(TIPOS_BLOQUEO),
  mensaje: textoSeguro({ max: 300 }).optional(),
});

export const dtEditarSchema = z.object({
  entrenadorId: z.string().min(1),
  nombre: textoSeguro({ min: 2, max: 120, error: "Nombre requerido." }).transform(
    formatearNombre,
  ),
  activo: z.boolean(),
  categoriaIds: z
    .array(z.string().min(1))
    .min(1, { error: "Asigna al menos una categoría." }),
});

export const usuarioEditarSchema = z.object({
  userId: z.string().min(1),
  nombre: textoSeguro({ min: 2, max: 120, error: "Nombre requerido." }).transform(
    formatearNombre,
  ),
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  activo: z.boolean(),
});

export const escuelaEditarSchema = z.object({
  escuelaId: z.string().min(1),
  nombre: textoSeguro({ min: 2, max: 120, error: "Nombre requerido." }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, { error: "Slug inválido (a-z, 0-9 y guiones)." }),
  colorPrimario: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, {
    error: "Color inválido (usa formato #RRGGBB).",
  }),
  activa: z.boolean(),
});

export const cambiarPasswordSchema = z
  .object({
    actual: z.string().min(1, { error: "Escribe tu contraseña actual." }),
    nueva: z
      .string()
      .min(8, { error: "Mínimo 8 caracteres." })
      .max(72, { error: "Máximo 72 caracteres." }),
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, {
    error: "La confirmación no coincide.",
    path: ["confirmacion"],
  });

// --- Ficha administrativa y médica (HABEAS-DATA.md, datos sensibles) -------

export const TIPOS_DOCUMENTO = ["RC", "TI", "CC", "CE"] as const;

/** Tipos sanguíneos como catálogo cerrado: es un dato que importa en una
 *  urgencia, así que no se deja como texto libre. */
export const TIPOS_RH = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const;

const textoOpcional = (max: number) =>
  z
    .union([z.literal(""), textoSeguro({ max })])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v));

const fechaOpcional = z
  .union([z.literal(""), z.coerce.date()])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

export const fichaMedicaSchema = z.object({
  jugadorId: z.string().min(1),
  tipoDocumento: z
    .union([z.literal(""), z.enum(TIPOS_DOCUMENTO)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  numeroDocumento: textoOpcional(30),
  // Datos de salud propiamente dichos (art. 5 Ley 1581): el servicio los
  // descarta si `autorizaDatosSalud` viene en false, sin importar lo que
  // llegue acá — el consentimiento es una regla de negocio, no de formato.
  eps: textoOpcional(80),
  rh: z
    .union([z.literal(""), z.enum(TIPOS_RH)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  alergias: textoOpcional(300),
  condicionesMedicas: textoOpcional(300),
  aptoMedicoVence: fechaOpcional,
  // Contacto de emergencia: no es dato de salud, cubierto por la autorización
  // general de la Política (no exige el consentimiento específico).
  contactoEmergenciaNombre: z
    .union([z.literal(""), textoSeguro({ max: 60 })])
    .optional()
    .transform((v) => (v === "" || v == null ? null : formatearNombre(v))),
  contactoEmergenciaTelefono: telefonoOpcional,
  contactoEmergenciaParentesco: z
    .union([z.literal(""), z.enum(PARENTESCOS)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  autorizaTraslado: z.boolean(),
  autorizaDatosSalud: z.boolean(),
});

export type FichaMedicaInput = z.infer<typeof fichaMedicaSchema>;

export type JugadorEditarInput = z.infer<typeof jugadorEditarSchema>;
export type DtEditarInput = z.infer<typeof dtEditarSchema>;
export type UsuarioEditarInput = z.infer<typeof usuarioEditarSchema>;
export type EscuelaEditarInput = z.infer<typeof escuelaEditarSchema>;

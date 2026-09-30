import { z } from "zod";
import { POSICIONES } from "@/types";
import { formatearNombre } from "@/lib/texto/formatear-nombre";
import { textoSeguro } from "@/lib/validators/sanitizar";
import { jugadorSchema } from "@/lib/validators/jugador";
import { fichaMedicaSchema } from "@/lib/validators/gestion";
import {
  PARENTESCOS,
  telefonoOpcional,
  tipoDocumentoFiscalOpcional,
  numeroDocumentoFiscalOpcional,
  direccionFiscalOpcional,
} from "@/lib/validators/cuenta";

/**
 * Alta completa de un jugador: datos del jugador, ficha médica y administrativa
 * y acudiente, en un solo envío (y, en el servidor, una sola transacción).
 *
 * Reúne validadores que ya existen en vez de redefinirlos: `jugadorSchema`
 * (identidad), `fichaMedicaSchema` (ficha) y los campos fiscales de
 * `cuenta.ts` (acudiente). Así una regla —el máximo de un campo, el formato de
 * un teléfono— cambia en UN solo lugar y vale para el alta, la edición y el
 * autoservicio.
 *
 * TODO lo que no es identidad básica es OPCIONAL. La ficha de salud es un dato
 * sensible (Ley 1581, HABEAS-DATA.md §6): ningún campo médico se exige, y el
 * servicio los descarta si no viene la autorización específica.
 */

const acudienteCampos = {
  acudienteNombre: z
    .union([z.literal(""), textoSeguro({ min: 2, max: 120, error: "Nombre del acudiente inválido." })])
    .optional()
    .transform((v) => (v === "" || v == null ? null : formatearNombre(v))),
  acudienteEmail: z
    .union([
      z.literal(""),
      z.email({ error: "El correo del acudiente no es válido." }).trim().toLowerCase(),
    ])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  acudienteTelefono: telefonoOpcional,
  acudienteParentesco: z
    .union([z.literal(""), z.enum(PARENTESCOS)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  acudienteTipoDocumento: tipoDocumentoFiscalOpcional,
  acudienteNumeroDocumento: numeroDocumentoFiscalOpcional,
  acudienteDireccion: direccionFiscalOpcional,
  /** La escuela declara que el acudiente autorizó el tratamiento de sus datos. */
  acudienteAutoriza: z.boolean(),
  /** Usar nombre, teléfono y parentesco del acudiente como contacto de emergencia. */
  contactoEsAcudiente: z.boolean(),
};

/** Forma mínima que necesita `hayAcudiente` (se declara aparte: usarla desde el
 *  propio schema con `AltaJugadorInput` sería una referencia circular). */
interface CamposAcudiente {
  acudienteNombre?: string | null;
  acudienteEmail?: string | null;
  acudienteTelefono?: string | null;
  acudienteParentesco?: string | null;
  acudienteTipoDocumento?: string | null;
  acudienteNumeroDocumento?: string | null;
  acudienteDireccion?: string | null;
}

export const altaJugadorSchema = jugadorSchema
  // Mensajes propios donde el de Zod por defecto saldría en inglés y técnico: acá
  // el error se le muestra tal cual a quien carga el formulario.
  .extend({
    posicion: z.enum(POSICIONES, { error: "Elige una posición." }),
    dorsal: z.coerce
      .number({ error: "El dorsal debe ser un número." })
      .int({ error: "El dorsal debe ser un número entero." })
      .min(1, { error: "El dorsal va de 1 a 100." })
      .max(100, { error: "El dorsal va de 1 a 100." })
      .optional(),
  })
  .extend(fichaMedicaSchema.omit({ jugadorId: true }).shape)
  .extend(acudienteCampos)
  .refine((d) => d.fechaNacimiento.getTime() <= Date.now(), {
    error: "La fecha de nacimiento no puede ser futura.",
    path: ["fechaNacimiento"],
  })
  .refine((d) => !hayAcudiente(d) || d.acudienteNombre !== null, {
    error: "Indica el nombre del acudiente.",
    path: ["acudienteNombre"],
  })
  .refine((d) => !hayAcudiente(d) || d.acudienteEmail !== null, {
    // El correo es el usuario con el que la familia entra a la plataforma.
    error: "Indica el correo del acudiente: es el usuario con el que va a ingresar.",
    path: ["acudienteEmail"],
  })
  .refine((d) => !hayAcudiente(d) || d.acudienteAutoriza, {
    error: "Confirma que el acudiente autoriza el tratamiento de sus datos.",
    path: ["acudienteAutoriza"],
  })
  .refine((d) => !d.contactoEsAcudiente || hayAcudiente(d), {
    error: "Carga primero los datos del acudiente para usarlos como contacto de emergencia.",
    path: ["contactoEsAcudiente"],
  });

export type AltaJugadorInput = z.infer<typeof altaJugadorSchema>;

/** ¿Se cargó algún dato del acudiente? Decide si hay que exigirle nombre y correo. */
export function hayAcudiente(d: CamposAcudiente): boolean {
  return [
    d.acudienteNombre,
    d.acudienteEmail,
    d.acudienteTelefono,
    d.acudienteParentesco,
    d.acudienteTipoDocumento,
    d.acudienteNumeroDocumento,
    d.acudienteDireccion,
  ].some((v) => v != null && v !== "");
}

/**
 * Mapea el `FormData` del formulario al schema. Vive ACÁ, al lado del schema, y
 * no en la action: con `safeParse` recibiendo `unknown`, renombrar un campo en
 * una sola de las dos mitades pasa typecheck, lint y tests y rompe en runtime
 * (el dato llega `undefined` y se guarda vacío). El test de este archivo cubre
 * que cada nombre de campo del formulario llegue hasta el resultado.
 *
 * `?? ""` porque los campos opcionales se validan con `z.literal("")` y un
 * campo ausente del FormData llega `null`.
 */
export function altaJugadorDesdeFormData(fd: FormData) {
  // Se recorta ANTES de validar: `z.email()` valida el texto tal cual llega, así que
  // un correo pegado con un espacio al final se rechazaría aunque `.trim()` exista.
  const texto = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    nombre: texto("nombre"),
    apellido: texto("apellido"),
    // `?? ""`: un campo ausente llega null y `coerce.date(null)` da 1970, válido.
    fechaNacimiento: texto("fechaNacimiento"),
    posicion: texto("posicion"),
    categoriaId: texto("categoriaId"),
    // El `""` del campo vacío se pasaría a `coerce.number` como 0 y fallaría el mínimo.
    dorsal: fd.get("dorsal") || undefined,
    genero: texto("genero"),
    tipoDocumento: texto("tipoDocumento"),
    numeroDocumento: texto("numeroDocumento"),
    eps: texto("eps"),
    rh: texto("rh"),
    alergias: texto("alergias"),
    condicionesMedicas: texto("condicionesMedicas"),
    aptoMedicoVence: texto("aptoMedicoVence"),
    contactoEmergenciaNombre: texto("contactoEmergenciaNombre"),
    contactoEmergenciaTelefono: fd.get("contactoEmergenciaTelefono"),
    contactoEmergenciaParentesco: texto("contactoEmergenciaParentesco"),
    autorizaTraslado: fd.get("autorizaTraslado") === "on",
    autorizaDatosSalud: fd.get("autorizaDatosSalud") === "on",
    acudienteNombre: texto("acudienteNombre"),
    acudienteEmail: texto("acudienteEmail"),
    acudienteTelefono: fd.get("acudienteTelefono"),
    acudienteParentesco: texto("acudienteParentesco"),
    acudienteTipoDocumento: texto("acudienteTipoDocumento"),
    acudienteNumeroDocumento: fd.get("acudienteNumeroDocumento"),
    acudienteDireccion: texto("acudienteDireccion"),
    acudienteAutoriza: fd.get("acudienteAutoriza") === "on",
    contactoEsAcudiente: fd.get("contactoEsAcudiente") === "on",
  };
}

/** Pasos del formulario y los campos que valida cada uno (validación por paso). */
export const PASOS_ALTA = [
  {
    id: "jugador",
    titulo: "Datos del jugador",
    campos: [
      "nombre",
      "apellido",
      "fechaNacimiento",
      "posicion",
      "categoriaId",
      "dorsal",
      "genero",
      "tipoDocumento",
      "numeroDocumento",
    ],
  },
  {
    id: "ficha",
    titulo: "Ficha médica",
    campos: [
      "eps",
      "rh",
      "alergias",
      "condicionesMedicas",
      "aptoMedicoVence",
      "contactoEmergenciaNombre",
      "contactoEmergenciaTelefono",
      "contactoEmergenciaParentesco",
      "autorizaTraslado",
      "autorizaDatosSalud",
    ],
  },
  {
    id: "acudiente",
    titulo: "Acudiente",
    campos: [
      "acudienteNombre",
      "acudienteEmail",
      "acudienteTelefono",
      "acudienteParentesco",
      "acudienteTipoDocumento",
      "acudienteNumeroDocumento",
      "acudienteDireccion",
      "acudienteAutoriza",
      "contactoEsAcudiente",
    ],
  },
] as const;

export type ErroresAlta = Record<string, string>;

/** Primer mensaje por campo, a partir de los `issues` de Zod. */
export function erroresPorCampo(issues: { path: PropertyKey[]; message: string }[]): ErroresAlta {
  const out: ErroresAlta = {};
  for (const i of issues) {
    const campo = String(i.path[0] ?? "");
    if (campo && !(campo in out)) out[campo] = i.message;
  }
  return out;
}

/** Índice (0-based) del paso al que pertenece un campo, o -1 si no es de ningún paso. */
export function pasoDeCampo(campo: string): number {
  return PASOS_ALTA.findIndex((p) => (p.campos as readonly string[]).includes(campo));
}

/** Errores que caen en un paso dado. */
export function erroresDelPaso(errores: ErroresAlta, paso: number): ErroresAlta {
  const campos = (PASOS_ALTA[paso]?.campos ?? []) as readonly string[];
  return Object.fromEntries(Object.entries(errores).filter(([k]) => campos.includes(k)));
}

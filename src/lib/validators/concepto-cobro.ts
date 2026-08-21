import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";
import { ValidationError } from "@/lib/errors";

/**
 * Los conceptos que la plataforma trae de fábrica. Se siembran en cada escuela
 * al crearla y quedan marcados `esSistema`: no se borran (hay cuotas colgando)
 * pero SÍ se renombran — media Colombia le dice "pensión" a la mensualidad.
 *
 * `codigo` es lo estable: es lo que compara el código de la app y lo que usó la
 * migración para convertir el texto viejo de `Membresia.concepto` en una FK.
 * `nombre` es solo lo que ve la gente.
 */
export const CONCEPTOS_SISTEMA = [
  { codigo: "MENSUALIDAD", nombre: "Mensualidad", orden: 1 },
  { codigo: "MATRICULA", nombre: "Matrícula", orden: 2 },
  { codigo: "INDUMENTARIA", nombre: "Indumentaria", orden: 3 },
  { codigo: "TORNEO", nombre: "Torneo", orden: 4 },
  { codigo: "TRANSPORTE", nombre: "Transporte", orden: 5 },
  { codigo: "OTRO", nombre: "Otro", orden: 6 },
] as const;

/** El concepto por defecto de la cobranza masiva. */
export const CODIGO_MENSUALIDAD = "MENSUALIDAD";

/** Tope de `codigo` generado, para no chocar con nombres largos. */
const MAX_CODIGO = 40;

/**
 * Deriva el `codigo` de un concepto nuevo a partir de su nombre: sin tildes, en
 * mayúsculas y con guiones bajos ("Torneo Bogotá 2026" → "TORNEO_BOGOTA_2026").
 *
 * Se calcula UNA sola vez, al crear: el nombre después se puede editar libremente
 * y el código no lo sigue. Si lo siguiera, renombrar un concepto rompería el
 * historial y los reportes que ya se emitieron con el código anterior.
 *
 * Puede quedar vacío si el nombre es solo símbolos; quien llama resuelve eso y
 * el choque contra el unique (escuelaId, codigo) con `codigoDisponible`.
 */
export function codigoDesdeNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_CODIGO);
}

/**
 * Primer código libre para `nombre` dentro de `ocupados`. Dos conceptos pueden
 * llamarse distinto y colapsar al mismo código ("Torneo #1" y "Torneo 1"), así
 * que se desempata con sufijo numérico en vez de rechazar el alta: el nombre que
 * la escuela eligió es válido, el choque es un detalle interno nuestro.
 */
export function codigoDisponible(nombre: string, ocupados: Set<string>): string {
  const base = codigoDesdeNombre(nombre) || "CONCEPTO";
  if (!ocupados.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidato = `${base.slice(0, MAX_CODIGO - 4)}_${n}`;
    if (!ocupados.has(candidato)) return candidato;
  }
  // Error de dominio y no `Error` pelado: `mapError` esconde lo inesperado tras
  // un mensaje genérico, y acá sí se puede decir qué pasó y qué hacer.
  throw new ValidationError(
    "Ya hay demasiados conceptos con ese nombre. Elige uno más específico.",
  );
}

const nombreConcepto = textoSeguro({
  min: 1,
  max: 40,
  error: "Escribe un nombre para el concepto.",
});

export const crearConceptoCobroSchema = z.object({
  nombre: nombreConcepto,
});

export type CrearConceptoCobroInput = z.infer<typeof crearConceptoCobroSchema>;

/**
 * Edición. El `codigo` no está: es inmutable por diseño (ver `codigoDesdeNombre`).
 * `activo` es la baja lógica — un concepto con cuotas emitidas no se borra nunca.
 */
export const editarConceptoCobroSchema = z.object({
  id: z.string().min(1),
  nombre: nombreConcepto,
  // NO `z.coerce.boolean()`: los valores de un FormData son strings y
  // `Boolean("false") === true`, así que archivar reportaría éxito sin archivar
  // nada. Un checkbox además NO viaja cuando está desmarcado, de ahí que la
  // ausencia cuente como `false`.
  activo: z
    .union([z.literal("true"), z.literal("false"), z.literal("on"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true" || v === "on"),
});

export type EditarConceptoCobroInput = z.infer<typeof editarConceptoCobroSchema>;

/**
 * Mapeo del `FormData` al schema, pegado al schema a propósito: separado en la
 * action, un rename de campo pasa los tres gates de §7 sin que nada se ponga
 * rojo (ver `arancelDesdeFormData`).
 *
 * Los nombres tienen que coincidir con los `name=` de `ConceptosPanel`.
 */
export function crearConceptoDesdeFormData(fd: FormData) {
  return { nombre: fd.get("nombre") ?? "" };
}

export function editarConceptoDesdeFormData(fd: FormData) {
  return {
    id: fd.get("id") ?? "",
    nombre: fd.get("nombre") ?? "",
    // Un checkbox desmarcado NO viaja en el FormData: la ausencia es `false`.
    activo: fd.get("activo") ?? undefined,
  };
}

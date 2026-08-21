import { db } from "@/lib/db";
import { CONCEPTOS_SISTEMA } from "@/lib/validators/concepto-cobro";

// Repositorio del catálogo de conceptos de cobro (Capa 4). Firma con escuelaId
// (multi-tenant): el catálogo es POR ESCUELA, no global.

export function listarConceptosCobro(escuelaId: string, soloActivos = false) {
  return db.conceptoCobro.findMany({
    where: { escuelaId, ...(soloActivos ? { activo: true } : {}) },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
}

export function obtenerConceptoCobro(escuelaId: string, id: string) {
  return db.conceptoCobro.findFirst({ where: { id, escuelaId } });
}

export function obtenerConceptoPorCodigo(escuelaId: string, codigo: string) {
  return db.conceptoCobro.findUnique({
    where: { escuelaId_codigo: { escuelaId, codigo } },
  });
}

export function crearConceptoCobro(
  escuelaId: string,
  data: { codigo: string; nombre: string },
) {
  return db.conceptoCobro.create({
    data: { escuelaId, ...data, esSistema: false, orden: 100 },
  });
}

/** Solo `nombre` y `activo`: el `codigo` es inmutable (ver validador). */
export function actualizarConceptoCobro(
  escuelaId: string,
  id: string,
  data: { nombre: string; activo: boolean },
) {
  return db.conceptoCobro.updateMany({ where: { id, escuelaId }, data });
}

/**
 * ¿El concepto tiene cuotas o precios colgando? Decide si se puede borrar de
 * verdad o solo archivar. Cuenta ambas tablas porque un concepto sin cuotas pero
 * con arancel cargado tampoco se puede borrar sin romper la lista de precios.
 */
export async function usoDeConcepto(
  escuelaId: string,
  conceptoId: string,
): Promise<{ cuotas: number; aranceles: number }> {
  const [cuotas, aranceles] = await Promise.all([
    db.membresia.count({ where: { escuelaId, conceptoId } }),
    db.arancel.count({ where: { escuelaId, conceptoId } }),
  ]);
  return { cuotas, aranceles };
}

/**
 * Uso de TODOS los conceptos de la escuela, en dos queries.
 *
 * La versión ingenua (un `usoDeConcepto` por fila) son dos `count` por concepto:
 * un catálogo de doce ya dispara veinticuatro consultas para pintar una tabla.
 */
export async function usoDeTodosLosConceptos(
  escuelaId: string,
): Promise<Map<string, { cuotas: number; aranceles: number }>> {
  const [cuotas, aranceles] = await Promise.all([
    db.membresia.groupBy({
      by: ["conceptoId"],
      where: { escuelaId },
      _count: { _all: true },
    }),
    db.arancel.groupBy({
      by: ["conceptoId"],
      where: { escuelaId },
      _count: { _all: true },
    }),
  ]);

  const uso = new Map<string, { cuotas: number; aranceles: number }>();
  const entrada = (id: string) => {
    const actual = uso.get(id) ?? { cuotas: 0, aranceles: 0 };
    uso.set(id, actual);
    return actual;
  };
  for (const c of cuotas) entrada(c.conceptoId).cuotas = c._count._all;
  for (const a of aranceles) entrada(a.conceptoId).aranceles = a._count._all;
  return uso;
}

export function borrarConceptoCobro(escuelaId: string, id: string) {
  return db.conceptoCobro.deleteMany({ where: { id, escuelaId, esSistema: false } });
}

/**
 * Siembra los conceptos de sistema en una escuela. Idempotente por el unique
 * (escuelaId, codigo) + `skipDuplicates`: se puede llamar en cada alta de escuela
 * y también para reparar un tenant que quedó sin catálogo, sin duplicar nada ni
 * pisar el `nombre` que la escuela ya haya editado.
 */
export async function sembrarConceptosDeSistema(escuelaId: string): Promise<number> {
  const res = await db.conceptoCobro.createMany({
    data: CONCEPTOS_SISTEMA.map((c) => ({
      escuelaId,
      codigo: c.codigo,
      nombre: c.nombre,
      orden: c.orden,
      esSistema: true,
    })),
    skipDuplicates: true,
  });
  return res.count;
}

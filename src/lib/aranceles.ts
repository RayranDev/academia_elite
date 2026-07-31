/**
 * Resolución de precios (Track A · A.1). Puro: mismas entradas → mismas salidas,
 * sin Prisma ni React. Lo usan la pantalla de aranceles y la generación masiva de
 * cuotas, que necesita resolver el precio de N categorías sin hacer N queries.
 */

/** Arancel ya aplanado (el `Decimal` de Prisma se convierte antes de entrar acá). */
export interface ArancelVigente {
  id: string;
  /** null = precio general de la escuela. */
  categoriaId: string | null;
  concepto: string;
  monto: number;
  vigenteDesde: Date;
}

/**
 * Fecha con la que se resuelve el precio de la cuota de un período AAAA-MM.
 *
 * Es el MÁS TARDÍO entre hoy y el inicio del período, y cada mitad de esa regla
 * arregla un caso distinto:
 *  - Emitir septiembre durante agosto tiene que aplicar el precio de septiembre
 *    si ya está cargado — por eso se mira el inicio del período y no "hoy".
 *  - Pero una escuela que carga su primer precio hoy y genera el mes en curso
 *    quedaría sin ningún precio vigente al 1° del mes — por eso nunca se retrocede
 *    más allá de hoy.
 *
 * Emitir julio en julio con un precio fechado en agosto sigue usando el de julio:
 * el aumento entra recién con la cuota de agosto.
 */
export function referenciaDePrecio(periodo: string, ahora: Date = new Date()): Date {
  const [anio, mes] = periodo.split("-").map(Number);
  if (!anio || !mes) return ahora;
  const inicio = new Date(Date.UTC(anio, mes - 1, 1));
  return inicio.getTime() > ahora.getTime() ? inicio : ahora;
}

/**
 * Precio aplicable a una categoría para un concepto dado.
 *
 * Reglas, en orden:
 *  1. Solo se consideran los aranceles ya vigentes (`vigenteDesde <= hasta`). Un
 *     precio con fecha futura queda cargado pero no se aplica todavía: así la
 *     escuela puede dejar programado el aumento de marzo en enero.
 *  2. Gana el precio propio de la categoría; si no tiene, cae al general de la
 *     escuela (`categoriaId = null`).
 *  3. Dentro del mismo alcance gana el `vigenteDesde` más reciente — ese es el
 *     historial de precios.
 *
 * Devuelve `null` si no hay ningún precio aplicable: quien llama decide qué
 * hacer (la generación de cuotas las crea sin monto, no inventa un número).
 */
export function resolverArancel(
  aranceles: ArancelVigente[],
  categoriaId: string,
  concepto: string,
  hasta: Date = new Date(),
): ArancelVigente | null {
  const aplicables = aranceles.filter(
    (a) =>
      a.concepto === concepto &&
      a.vigenteDesde.getTime() <= hasta.getTime() &&
      (a.categoriaId === categoriaId || a.categoriaId === null),
  );
  if (aplicables.length === 0) return null;

  const propios = aplicables.filter((a) => a.categoriaId === categoriaId);
  const alcance = propios.length > 0 ? propios : aplicables;

  return alcance.reduce((mejor, a) =>
    a.vigenteDesde.getTime() > mejor.vigenteDesde.getTime() ? a : mejor,
  );
}

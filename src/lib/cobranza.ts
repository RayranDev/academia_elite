/**
 * Reglas de cobranza derivadas (Track A · A.3 y A.4). Puro: sin Prisma ni React,
 * mismas entradas → mismas salidas.
 *
 * La idea de fondo: el estado de una cuota y la deuda de un jugador **se
 * calculan**, no se tipean. Que alguien tenga que acordarse de marcar "VENCIDA"
 * mes a mes garantiza que la información esté mal justo cuando importa.
 */

/**
 * Desfase horario de la escuela respecto de UTC. Colombia es UTC-5 y no tiene
 * horario de verano, así que una constante alcanza y evita cargar una librería
 * de husos en el servidor.
 */
export const OFFSET_ESCUELA_HORAS = -5;

/**
 * Período AAAA-MM del mes en curso, en la hora de la ESCUELA.
 *
 * No usa `getFullYear()`/`getMonth()`: esos leen la zona del proceso, y en Vercel
 * el servidor corre en UTC. El 31 de enero a las 19:00 en Colombia ya es 1 de
 * febrero en UTC, así que la versión ingenua daba por vencidas todas las cuotas
 * de enero cinco horas antes de que el mes cerrara de verdad — marcando en mora a
 * familias que no lo estaban. Se corre el instante al huso de la escuela y se lee
 * en UTC, que sí es determinista.
 */
export function periodoDe(fecha: Date): string {
  const enZonaEscuela = new Date(fecha.getTime() + OFFSET_ESCUELA_HORAS * 3_600_000);
  const mes = String(enZonaEscuela.getUTCMonth() + 1).padStart(2, "0");
  return `${enZonaEscuela.getUTCFullYear()}-${mes}`;
}

/**
 * ¿El período ya cerró? Comparación lexicográfica: "AAAA-MM" con mes de dos
 * dígitos ordena igual como texto que como fecha, así que no hace falta parsear
 * ni exponerse a corrimientos de huso.
 */
export function periodoCerrado(periodo: string, hoy: Date): boolean {
  return periodo < periodoDe(hoy);
}

export type EstadoCuota = "PENDIENTE" | "PAGADA" | "VENCIDA";

/**
 * Estado real de una cuota. `PAGADA` manda siempre; una pendiente cuyo período ya
 * cerró está vencida por definición, sin que nadie la toque.
 *
 * El estado VENCIDA guardado en la base se respeta (viene de datos previos), pero
 * ya no hace falta escribirlo: sale solo.
 */
export function estadoEfectivo(
  estadoGuardado: string,
  periodo: string,
  hoy: Date,
): EstadoCuota {
  if (estadoGuardado === "PAGADA") return "PAGADA";
  if (estadoGuardado === "VENCIDA") return "VENCIDA";
  return periodoCerrado(periodo, hoy) ? "VENCIDA" : "PENDIENTE";
}

/** Cuota mínima que necesita el cálculo de deuda. */
export interface CuotaParaDeuda {
  periodo: string;
  concepto: string;
  estado: string;
  monto: number | null;
  descuento: number | null;
}

export interface EstadoCuenta {
  /** Cuotas vencidas e impagas. */
  cuotasVencidas: number;
  /** Suma de los netos vencidos e impagos. Solo cuenta lo que tiene monto. */
  montoVencido: number;
  /** Cuotas del período en curso todavía no vencidas. */
  cuotasPendientes: number;
  /** El período más viejo que sigue impago (para "debe desde…"). */
  desdePeriodo: string | null;
  /** true si hay al menos una cuota vencida impaga. */
  enMora: boolean;
}

/** Neto de una cuota: lo que la familia realmente debe. */
export function netoCuota(cuota: CuotaParaDeuda): number | null {
  if (cuota.monto == null) return null;
  return cuota.monto - (cuota.descuento ?? 0);
}

/**
 * Estado de cuenta de un jugador, derivado de sus cuotas. Reemplaza la idea de
 * guardar una `vigenciaHasta` a mano: no hay columna nueva ni segunda fuente de
 * verdad que después haya que reconciliar con la cobranza.
 *
 * La cuota del mes en curso cuenta como PENDIENTE, no como deuda: recién es mora
 * cuando el mes cerró.
 */
export function estadoCuenta(cuotas: CuotaParaDeuda[], hoy: Date): EstadoCuenta {
  let cuotasVencidas = 0;
  let montoVencido = 0;
  let cuotasPendientes = 0;
  let desdePeriodo: string | null = null;

  for (const c of cuotas) {
    const estado = estadoEfectivo(c.estado, c.periodo, hoy);
    if (estado === "PAGADA") continue;

    if (estado === "VENCIDA") {
      cuotasVencidas++;
      montoVencido += netoCuota(c) ?? 0;
      if (desdePeriodo === null || c.periodo < desdePeriodo) desdePeriodo = c.periodo;
    } else {
      cuotasPendientes++;
    }
  }

  return {
    cuotasVencidas,
    montoVencido,
    cuotasPendientes,
    desdePeriodo,
    enMora: cuotasVencidas > 0,
  };
}

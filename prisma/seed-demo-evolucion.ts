import type { PrismaClient } from "../src/generated/prisma/client";
import { evaluarJugadorPorId } from "@/services/evaluacion.service";
import { recalcularMenDiario } from "@/services/curva.service";
import { evaluacionSchema } from "@/lib/validators/evaluacion";
import { aHoraEscuela } from "./seed-utils";
import type { MedidasEvaluacion } from "@/lib/stats-engine";
import type { Posicion } from "@/types";

/**
 * Demo de EVOLUCIÓN de 3 meses en Academia Élite (slug `elite`): 4 jugadores
 * nuevos (uno por posición) con 4 evaluaciones reales (día 0/30/60/90,
 * cerrando cerca de HOY) + la actividad de por medio (asistencia semanal,
 * que alimenta la curva de MEN) que el producto ya usa para mostrar
 * progreso entre mediciones. Ver docs/ACADEMIA-ELITE-DEMO.md.
 *
 * Reutiliza el NÚCLEO real del motor de evaluación (`evaluarJugadorPorId` →
 * `evaluarJugadorCore`, el mismo que usa la jornada de medición masiva) y el
 * cron real de la curva de desarrollo (`recalcularMenDiario`) — no se
 * duplica matemática del motor acá. `evaluarJugadorCore` ganó un
 * `opciones.fecha` opcional (ver `src/services/evaluacion.service.ts`) para
 * poder backdatear estas evaluaciones sin tocar su comportamiento por
 * defecto.
 *
 * Idempotente para SUS PROPIAS filas: identifica sus 4 jugadores por id fijo
 * (`elite-evol-*`) y sus eventos dedicados por prefijo (`elite-evol-ev-`); al
 * re-correr, borra solo esas filas (y lo que cuelga de ellas: evaluaciones,
 * stats, asistencia, logros) y las vuelve a crear — nunca toca otro jugador
 * ni otro evento. Ojo: el último paso SÍ es tenant-global a propósito —
 * `recalcularMenDiario()` (el cron real de la curva) recalcula
 * `Jugador.menBonus` de TODOS los jugadores ACTIVO de TODAS las escuelas, no
 * solo estos 4 (ver `curva.service.ts`); es idempotente y barato, pero no es
 * "no toca nada más".
 *
 * Requiere que `crearAcademiaElite` ya haya corrido (usa sus ids fijos de
 * escuela/DT/categorías) — se llama DESPUÉS, igual que ella se llama después
 * del seed principal.
 *
 * Decisión consciente, no descuido: el `db` que recibe esta función (Prisma
 * directo, igual que `crearAcademiaElite`) y el singleton de
 * `src/lib/db.ts` que abren `evaluarJugadorPorId`/`recalcularMenDiario` son
 * DOS clientes (dos pools) distintos, sin transacción común entre ellos —
 * `seed-env.ts` los apunta a la MISMA conexión (elimina la ambigüedad de a
 * qué base se escribe), pero no los une en una sola unidad atómica. Para un
 * seed local, re-corrible e idempotente por id fijo, es un costo aceptable;
 * si esto necesitara ser atómico de verdad, habría que pasar el singleton
 * en vez de instanciar un cliente propio.
 */

const DIA = 24 * 60 * 60 * 1000;
const ESCUELA_ID = "elite-escuela";
const ENTRENADOR_ID = "elite-entrenador";
const PREFIJO_EVENTO = "elite-evol-ev-";
/** Evaluaciones por jugador (día 0/30/60/90) y semanas de asistencia sembradas. */
const EVALUACIONES_POR_JUGADOR = 4;
const SEMANAS_ASISTENCIA = 13;

interface NivelesEvaluacion {
  /** 0..1: calidad física (sprint/salto/agilidad/resistencia). */
  fisico: number;
  /** 0..1: calidad técnica (control/pase/tiro/regate — o su equivalente de arquero). */
  tecnico: number;
  /** 0..1: mentalidad (actitud/concentración/trabajo en equipo/resiliencia). */
  mental: number;
}

interface PerfilJugador {
  slug: string;
  jugadorId: string;
  codigoJugador: string;
  codigoRef: string;
  nombre: string;
  apellido: string;
  posicion: Posicion;
  categoriaId: string;
  anioNac: number;
  dorsal: number;
  /** Resumen del guion narrativo (para docs/logs, no se persiste). */
  historia: string;
  /** Una entrada por evaluación (día 0/30/60/90). */
  niveles: NivelesEvaluacion[];
  /** Nota privada corta por evaluación (misma longitud que `niveles`). */
  notas: string[];
  /** Presente/ausente por semana, 13 semanas (día −90 … −6, paso semanal). */
  asistenciaSemanal: boolean[];
  /** Índices de semana (dentro de `asistenciaSemanal`) con ausencia JUSTIFICADA. */
  ausenciasJustificadas?: number[];
  /**
   * Logros BONUS a otorgar (pendientes de consumir) antes de cada evaluación,
   * por índice de evaluación (0-based). Demuestra el tope de
   * `Escuela.topeBonusEntreEvals` (3 por defecto): si se otorgan más de los
   * que caben, el sobrante queda pendiente para la evaluación siguiente.
   */
  bonusAntesDeEval?: Record<number, string[]>;
}

const JUGADORES: PerfilJugador[] = [
  {
    slug: "por",
    jugadorId: "elite-evol-por",
    codigoJugador: "EVOLPOR",
    codigoRef: "JUG-EVOLPOR",
    nombre: "Agustín",
    apellido: "Molina",
    posicion: "POR",
    categoriaId: "elite-cat-sub14",
    anioNac: 2013,
    dorsal: 90,
    historia: "Progreso sostenido, asistencia casi perfecta.",
    niveles: [
      { fisico: 0.4, tecnico: 0.4, mental: 0.45 },
      { fisico: 0.48, tecnico: 0.48, mental: 0.52 },
      { fisico: 0.56, tecnico: 0.56, mental: 0.6 },
      { fisico: 0.64, tecnico: 0.64, mental: 0.68 },
    ],
    notas: [
      "Primera evaluación de seguimiento: base sólida bajo los tres palos.",
      "Progreso constante, mismo ritmo de entrenamiento.",
      "Sigue mejorando de forma pareja mes a mes.",
      "Cierre de trimestre con evolución sostenida.",
    ],
    // 13 semanas: una sola ausencia (justificada) en la semana 11.
    asistenciaSemanal: [true, true, true, true, true, true, true, true, true, true, true, false, true],
    ausenciasJustificadas: [11],
  },
  {
    slug: "def",
    jugadorId: "elite-evol-def",
    codigoJugador: "EVOLDEF",
    codigoRef: "JUG-EVOLDEF",
    nombre: "Franco",
    apellido: "Acosta",
    posicion: "DEF",
    categoriaId: "elite-cat-sub12",
    anioNac: 2015,
    dorsal: 91,
    historia: "Meseta: asistencia irregular, mejoras chicas o nulas.",
    niveles: [
      { fisico: 0.45, tecnico: 0.45, mental: 0.45 },
      { fisico: 0.46, tecnico: 0.44, mental: 0.43 },
      { fisico: 0.47, tecnico: 0.46, mental: 0.42 },
      { fisico: 0.46, tecnico: 0.47, mental: 0.44 },
    ],
    notas: [
      "Evaluación inicial de seguimiento.",
      "Sin grandes cambios respecto a la medición anterior.",
      "La asistencia irregular no deja ver una mejora clara.",
      "Se mantiene estable; falta continuidad en la asistencia.",
    ],
    // 13 semanas, ~46% de presencia, sin racha clara (irregular de verdad).
    asistenciaSemanal: [true, false, true, true, false, false, true, false, true, false, false, true, false],
  },
  {
    slug: "med",
    jugadorId: "elite-evol-med",
    codigoJugador: "EVOLMED",
    codigoRef: "JUG-EVOLMED",
    nombre: "Nicolás",
    apellido: "Peralta",
    posicion: "MED",
    categoriaId: "elite-cat-sub10",
    anioNac: 2017,
    dorsal: 92,
    historia: "Salto grande: arranca bajo y mejora fuerte (puede cambiar de nivel de carta).",
    niveles: [
      { fisico: 0.28, tecnico: 0.3, mental: 0.35 },
      { fisico: 0.42, tecnico: 0.46, mental: 0.48 },
      { fisico: 0.58, tecnico: 0.64, mental: 0.6 },
      { fisico: 0.7, tecnico: 0.78, mental: 0.7 },
    ],
    notas: [
      "Punto de partida: margen amplio de mejora.",
      "Salto notable tras un mes de entrenamiento intenso.",
      "Sigue creciendo fuerte, muy por encima del inicio.",
      "Consolidó el salto de nivel del trimestre.",
    ],
    // 13 semanas, ~85% de presencia: la dedicación sostiene el salto.
    asistenciaSemanal: [true, true, true, false, true, true, true, true, false, true, true, true, true],
    // Demuestra el tope de bonus por evaluación (3, default de la escuela):
    // se otorgan 4 logros BONUS pendientes antes de la eval. 2 → solo entran 3,
    // el sobrante se consume recién en la eval. 3 junto con 2 nuevos.
    bonusAntesDeEval: {
      1: [
        "ASISTENCIA_PERFECTA_SEMANA",
        "MEJOR_PROGRESO_MES",
        "ESPIRITU_DE_EQUIPO",
        "JUEGO_LIMPIO_MES",
      ],
      2: ["ASISTENCIA_PERFECTA_SEMANA", "MEJOR_PROGRESO_MES"],
    },
  },
  {
    slug: "del",
    jugadorId: "elite-evol-del",
    codigoJugador: "EVOLDEL",
    codigoRef: "JUG-EVOLDEL",
    nombre: "Mateo",
    apellido: "Villalba",
    posicion: "DEL",
    categoriaId: "elite-cat-sub8",
    anioNac: 2019,
    dorsal: 93,
    historia: "Bajón y recuperación: racha de ausencias en el mes 2, remonta en el mes 3.",
    niveles: [
      { fisico: 0.35, tecnico: 0.35, mental: 0.4 },
      { fisico: 0.42, tecnico: 0.4, mental: 0.46 },
      { fisico: 0.33, tecnico: 0.36, mental: 0.34 },
      { fisico: 0.46, tecnico: 0.44, mental: 0.5 },
    ],
    notas: [
      "Evaluación inicial.",
      "Buen progreso tras el primer mes de entrenamiento.",
      "Bajón: varias semanas sin entrenar durante el segundo mes.",
      "Recuperación plena: retomó el ritmo y superó el bajón anterior.",
    ],
    // Mes 1 (semanas 0-3) y mes 3 (semanas 9-12) presentes; mes 2
    // (semanas 4-8) racha de ausencias justificadas (lesión leve).
    asistenciaSemanal: [
      true, true, true, true,
      false, false, false, false, false,
      true, true, true, true,
    ],
    ausenciasJustificadas: [4, 5, 6, 7, 8],
  },
];

/** Mismas fórmulas que `medidasNivel()` en los otros seeds, con las tres
 * dimensiones (físico/técnico/mental) independientes para poder narrar
 * perfiles distintos (meseta, bajón, salto) en vez de un único "nivel". */
function medidasDe(niv: NivelesEvaluacion): MedidasEvaluacion {
  const t = (base: number, max: number, n: number) => base + (max - base) * n;
  return {
    sprint30mSeg: 6.5 - 2.0 * niv.fisico,
    saltoVerticalCm: t(16, 50, niv.fisico),
    agilidadIllinoisSeg: 21 - 5 * niv.fisico,
    resistenciaYoyoNivel: t(4, 16, niv.fisico),
    controlBalon: t(4, 9, niv.tecnico),
    pase: t(4, 9, niv.tecnico),
    tiro: t(3, 9, niv.tecnico),
    regate: t(4, 9, niv.tecnico),
    actitud: t(5, 9, niv.mental),
    concentracion: t(4, 9, niv.mental),
    trabajoEquipo: t(5, 10, niv.mental),
    resiliencia: t(4, 9, niv.mental),
  };
}

/** Un typo en `JUGADORES` (una nota de menos, una semana de más) fallaría en
 * silencio — `def.notas[k]` sería `undefined` y quedaría como observación
 * vacía en vez de reventar. Se valida el largo esperado antes de sembrar
 * nada. */
function validarPerfil(perfil: PerfilJugador): void {
  if (perfil.niveles.length !== EVALUACIONES_POR_JUGADOR) {
    throw new Error(
      `${perfil.slug}: se esperaban ${EVALUACIONES_POR_JUGADOR} niveles, hay ${perfil.niveles.length}.`,
    );
  }
  if (perfil.notas.length !== EVALUACIONES_POR_JUGADOR) {
    throw new Error(
      `${perfil.slug}: se esperaban ${EVALUACIONES_POR_JUGADOR} notas, hay ${perfil.notas.length}.`,
    );
  }
  if (perfil.asistenciaSemanal.length !== SEMANAS_ASISTENCIA) {
    throw new Error(
      `${perfil.slug}: se esperaban ${SEMANAS_ASISTENCIA} semanas de asistencia, hay ${perfil.asistenciaSemanal.length}.`,
    );
  }
}

async function limpiarPropio(db: PrismaClient, jugadorIds: string[]): Promise<void> {
  // Orden inverso de FK, igual criterio que `prisma/seed.ts` → `limpiar()`,
  // pero acotado SIEMPRE a `jugadorId IN (nuestros 4 ids)` o al prefijo de
  // nuestros propios eventos: nunca toca datos de otro jugador o evento.
  await db.statsCalculados.deleteMany({ where: { jugadorId: { in: jugadorIds } } });
  await db.evaluacion.deleteMany({ where: { jugadorId: { in: jugadorIds } } });
  await db.estadisticaPartido.deleteMany({ where: { jugadorId: { in: jugadorIds } } });
  await db.jugadorConvocado.deleteMany({ where: { jugadorId: { in: jugadorIds } } });
  await db.asistencia.deleteMany({ where: { jugadorId: { in: jugadorIds } } });
  await db.logroJugador.deleteMany({ where: { jugadorId: { in: jugadorIds } } });
  await db.objetivoJugador.deleteMany({ where: { jugadorId: { in: jugadorIds } } });
  await db.progresoSemanal.deleteMany({ where: { jugadorId: { in: jugadorIds } } });
  await db.observacionJugador.deleteMany({ where: { jugadorId: { in: jugadorIds } } });
  await db.jugador.deleteMany({ where: { id: { in: jugadorIds } } });
  // Los eventos dedicados solo tienen asistencia de estos 4 jugadores (ya
  // borrada arriba), así que borrarlos por prefijo es seguro.
  await db.evento.deleteMany({ where: { id: { startsWith: PREFIJO_EVENTO } } });
}

async function otorgarBonusPendientes(
  db: PrismaClient,
  jugadorId: string,
  codigos: string[],
  otorgadoEn: Date,
): Promise<void> {
  const logros = await db.logro.findMany({ where: { codigo: { in: codigos } } });
  if (logros.length !== codigos.length) {
    const faltantes = codigos.filter((c) => !logros.some((l) => l.codigo === c));
    throw new Error(
      `Faltan logros del catálogo (${faltantes.join(", ")}). Corré \`npm run db:seed\` primero.`,
    );
  }
  await db.logroJugador.createMany({
    data: logros.map((l) => ({
      escuelaId: ESCUELA_ID,
      jugadorId,
      logroId: l.id,
      otorgadoEn,
      bonusConsumido: false,
    })),
  });
}

export async function crearEvolucionDemo(db: PrismaClient): Promise<void> {
  const [escuela, entrenador, categorias] = await Promise.all([
    db.escuela.findUnique({ where: { id: ESCUELA_ID } }),
    db.entrenador.findUnique({ where: { id: ENTRENADOR_ID } }),
    db.categoria.findMany({
      where: { id: { in: [...new Set(JUGADORES.map((j) => j.categoriaId))] } },
    }),
  ]);
  if (!escuela || !entrenador || categorias.length < 4) {
    throw new Error(
      "No se encontró Academia Élite completa (escuela/DT/categorías). Corré `npm run db:seed` antes de `npm run db:seed:evolucion`.",
    );
  }

  JUGADORES.forEach(validarPerfil);

  const jugadorIds = JUGADORES.map((j) => j.jugadorId);
  await limpiarPropio(db, jugadorIds);

  const ahora = new Date();
  const diasEval = [-90, -60, -30, 0];

  for (const perfil of JUGADORES) {
    const jugador = await db.jugador.create({
      data: {
        id: perfil.jugadorId,
        escuelaId: ESCUELA_ID,
        categoriaId: perfil.categoriaId,
        codigoJugador: perfil.codigoJugador,
        codigoRef: perfil.codigoRef,
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        fechaNacimiento: new Date(Date.UTC(perfil.anioNac, 4, 15)),
        posicion: perfil.posicion,
        dorsal: perfil.dorsal,
        estado: "ACTIVO",
        consentimientoFoto: false,
      },
    });

    // Actividad de por medio: entrenamiento semanal + asistencia (13
    // semanas, día −90 a −6). Es lo que alimenta la curva de MEN
    // (`recalcularMenDiario`, ventana móvil de 30 días) entre evaluaciones.
    for (let w = 0; w < perfil.asistenciaSemanal.length; w++) {
      const diaOffset = -90 + 7 * w;
      const inicio = aHoraEscuela(new Date(ahora.getTime() + diaOffset * DIA), 18);
      const fin = new Date(inicio.getTime() + 90 * 60 * 1000);
      const eventoId = `${PREFIJO_EVENTO}${perfil.slug}-w${w}`;
      await db.evento.create({
        data: {
          id: eventoId,
          escuelaId: ESCUELA_ID,
          categoriaId: perfil.categoriaId,
          tipo: "ENTRENAMIENTO",
          titulo: "Entrenamiento semanal",
          inicio,
          fin,
          sesionIniciadaAt: inicio,
          sesionCerradaAt: fin,
        },
      });
      const presente = perfil.asistenciaSemanal[w];
      await db.asistencia.create({
        data: {
          escuelaId: ESCUELA_ID,
          eventoId,
          jugadorId: jugador.id,
          presente,
          justificado: !presente && (perfil.ausenciasJustificadas?.includes(w) ?? false),
          marcadoAt: fin,
        },
      });
    }

    // 4 evaluaciones reales (día 0/30/60/90), vía el servicio real (que a su
    // vez usa el NÚCLEO del motor).
    console.log(`\n${perfil.nombre} ${perfil.apellido} (${perfil.posicion}, ${perfil.slug}) — ${perfil.historia}`);
    for (let k = 0; k < diasEval.length; k++) {
      const bonusCodigos = perfil.bonusAntesDeEval?.[k];
      if (bonusCodigos && bonusCodigos.length > 0) {
        const otorgadoEn = aHoraEscuela(
          new Date(ahora.getTime() + (diasEval[k] - 5) * DIA),
          12,
        );
        await otorgarBonusPendientes(db, jugador.id, bonusCodigos, otorgadoEn);
      }

      // Offset 0 (última eval) usa `ahora` tal cual: fijarla a las 17:00
      // "hora escuela" la mandaría al futuro si el seed corre a la mañana
      // (Colombia es UTC−5), y ese mismo instante también acota la ventana
      // de disponibilidad de logros más abajo en `evaluarJugadorCore`.
      const fecha =
        diasEval[k] === 0
          ? ahora
          : aHoraEscuela(new Date(ahora.getTime() + diasEval[k] * DIA), 17);

      // Valida por el MISMO schema Zod que usa la acción real
      // (`evaluacionSchema`, con `textoSeguro` en `observacionesPrivadas`) en
      // vez de castear el objeto al tipo: acá los strings son literales del
      // propio archivo y no hay riesgo hoy, pero castear le miente al tipo
      // ("esto ya está validado") sin que nada lo haya validado.
      const medidas = medidasDe(perfil.niveles[k]);
      const input = evaluacionSchema.parse({
        jugadorId: jugador.id,
        ...medidas,
        observacionesPrivadas: perfil.notas[k],
      });
      // `evaluarJugadorPorId` resuelve el jugador puertas adentro del
      // servicio (Capa 3) — el seed no importa el repositorio directo.
      const resultado = await evaluarJugadorPorId(ESCUELA_ID, ENTRENADOR_ID, jugador.id, input, {
        fecha,
      });
      console.log(
        `  eval ${k + 1} (${fecha.toISOString().slice(0, 10)}): OVR ${resultado.ovr} (${resultado.nivel})` +
          ` — RIT ${resultado.rit} TIR ${resultado.tir} PAS ${resultado.pas} REG ${resultado.reg}` +
          ` DEF ${resultado.def} FIS ${resultado.fis} MEN ${resultado.men}` +
          (resultado.bonusAplicado > 0 ? ` [bonus +${resultado.bonusAplicado}]` : ""),
      );
    }
  }

  // Curva de desarrollo: recalcula el bonus de MEN "en vivo" con el MISMO
  // cron que corre en producción (`/api/cron/men-diario`), a partir de la
  // asistencia real que se acaba de sembrar (ventana móvil de 30 días).
  const { actualizados } = await recalcularMenDiario();
  console.log(`\nCurva de MEN recalculada (cron real): ${actualizados} jugadores activos actualizados.`);
}

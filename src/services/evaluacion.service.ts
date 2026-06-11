import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { categoriasDelDt } from "@/services/dt-scope";
import { registrarAuditoria } from "@/services/audit.service";
import { obtenerJugador } from "@/repositories/jugador.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { obtenerParametroGlobal } from "@/repositories/parametro.repository";
import {
  bonusPendientes,
  obtenerEvaluacion,
  marcarEvaluacionAnulada,
} from "@/repositories/evaluacion.repository";
import {
  computeStats,
  grupoEdadPorEdad,
  edadEnAnios,
  type BonusLogro,
  type MedidasEvaluacion,
  type ResultadoStats,
} from "@/lib/stats-engine";
import type { EvaluacionInput } from "@/lib/validators/evaluacion";
import type { Posicion } from "@/types";

/**
 * Crea una evaluación INMUTABLE y su snapshot de stats (la carta "nace").
 * Consume los logros BONUS pendientes hasta el tope de la escuela. Atómico.
 */
export async function crearEvaluacion(
  ctx: AuthContext,
  input: EvaluacionInput,
): Promise<ResultadoStats> {
  const { escuelaId, entrenadorId, categoriaIds } = await categoriasDelDt(ctx);

  const jugador = await obtenerJugador(escuelaId, input.jugadorId);
  if (!jugador || !categoriaIds.includes(jugador.categoriaId)) {
    throw new NotFoundError("Jugador no encontrado.");
  }
  if (jugador.estado !== "ACTIVO") {
    throw new ValidationError("Solo se evalúan jugadores activos.");
  }

  const [escuela, paramMen, pendientes] = await Promise.all([
    obtenerEscuela(escuelaId),
    obtenerParametroGlobal("PESO_MEN_EN_OVR"),
    bonusPendientes(jugador.id),
  ]);
  const tope = escuela?.topeBonusEntreEvals ?? 3;
  const pesoMen = paramMen?.valor ?? 0.1;

  // Capping de bonus en el servicio: decide qué logros se consumen (greedy
  // hasta el tope) y pasa solo esos al motor.
  let acumulado = 0;
  const bonus: BonusLogro[] = [];
  const consumidos: string[] = [];
  for (const lj of pendientes) {
    if (acumulado >= tope) break;
    const valor = lj.logro.valorBonus ?? 0;
    const stat = lj.logro.statBonus;
    if (!stat || valor <= 0) continue;
    const aplicar = Math.min(valor, tope - acumulado);
    bonus.push({ stat: stat as BonusLogro["stat"], valor: aplicar });
    consumidos.push(lj.id);
    acumulado += aplicar;
  }

  const grupoEdad = grupoEdadPorEdad(edadEnAnios(jugador.fechaNacimiento));
  const medidas: MedidasEvaluacion = {
    sprint30mSeg: input.sprint30mSeg,
    saltoVerticalCm: input.saltoVerticalCm,
    agilidadIllinoisSeg: input.agilidadIllinoisSeg,
    resistenciaYoyoNivel: input.resistenciaYoyoNivel,
    controlBalon: input.controlBalon,
    pase: input.pase,
    tiro: input.tiro,
    regate: input.regate,
    actitud: input.actitud,
    concentracion: input.concentracion,
    trabajoEquipo: input.trabajoEquipo,
    resiliencia: input.resiliencia,
  };

  const resultado = computeStats(medidas, {
    posicion: jugador.posicion as Posicion,
    grupoEdad,
    pesoMenEnOvr: pesoMen,
    topeBonus: tope,
    bonus,
  });

  await db.$transaction(async (tx) => {
    const evaluacion = await tx.evaluacion.create({
      data: {
        escuelaId,
        jugadorId: jugador.id,
        entrenadorId,
        sprint30mSeg: input.sprint30mSeg,
        saltoVerticalCm: input.saltoVerticalCm,
        agilidadIllinoisSeg: input.agilidadIllinoisSeg,
        resistenciaYoyoNivel: input.resistenciaYoyoNivel,
        controlBalon: input.controlBalon,
        pase: input.pase,
        tiro: input.tiro,
        regate: input.regate,
        actitud: input.actitud,
        concentracion: input.concentracion,
        trabajoEquipo: input.trabajoEquipo,
        resiliencia: input.resiliencia,
        observacionesPrivadas: input.observacionesPrivadas || null,
      },
    });
    await tx.statsCalculados.create({
      data: {
        escuelaId,
        jugadorId: jugador.id,
        evaluacionId: evaluacion.id,
        rit: resultado.rit,
        tir: resultado.tir,
        pas: resultado.pas,
        reg: resultado.reg,
        def: resultado.def,
        fis: resultado.fis,
        men: resultado.men,
        ovr: resultado.ovr,
        nivel: resultado.nivel,
        bonusAplicado: resultado.bonusAplicado,
        versionFormula: resultado.versionFormula,
      },
    });
    if (consumidos.length > 0) {
      await tx.logroJugador.updateMany({
        where: { id: { in: consumidos } },
        data: { bonusConsumido: true },
      });
    }
  });

  return resultado;
}

/**
 * Anula una evaluación (solo ESCUELA_ADMIN, con motivo → AuditLog).
 * Las evaluaciones no se editan: se anulan y se crea una nueva.
 */
export async function anularEvaluacion(
  ctx: AuthContext,
  evaluacionId: string,
  motivo: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const evaluacion = await obtenerEvaluacion(escuelaId, evaluacionId);
  if (!evaluacion) throw new NotFoundError("Evaluación no encontrada.");
  assertTenant(ctx, evaluacion.escuelaId);
  await marcarEvaluacionAnulada(escuelaId, evaluacionId);
  await registrarAuditoria(ctx, {
    accion: "ANULAR_EVALUACION",
    entidad: "Evaluacion",
    entidadId: evaluacionId,
    escuelaId,
    motivo,
  });
}
